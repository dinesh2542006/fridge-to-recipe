import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// JSON schema for Gemini structured output
const recipeSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING, description: "Name of the recipe" },
    description: { type: SchemaType.STRING, description: "Brief description of the dish" },
    servings: { type: SchemaType.INTEGER, description: "Base number of servings (e.g. 2 or 4)" },
    ingredients: {
      type: SchemaType.ARRAY,
      description: "List of required ingredients",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING, description: "Ingredient name" },
          amount: { type: SchemaType.NUMBER, description: "Numeric quantity for base servings" },
          unit: { type: SchemaType.STRING, description: "Unit of measurement (e.g. cup, tbsp, grams, piece, pinch)" }
        },
        required: ["name", "amount", "unit"]
      }
    },
    steps: {
      type: SchemaType.ARRAY,
      description: "Numbered cooking instructions in order",
      items: { type: SchemaType.STRING }
    },
    swaps: {
      type: SchemaType.ARRAY,
      description: "1 to 3 reasonable ingredient substitutions",
      items: {
        type: SchemaType.OBJECT,
        properties: {
          original: { type: SchemaType.STRING, description: "Original ingredient to substitute" },
          swap: { type: SchemaType.STRING, description: "Suggested alternative ingredient" }
        },
        required: ["original", "swap"]
      }
    }
  },
  required: ["title", "description", "servings", "ingredients", "steps", "swaps"]
};

// Simple server-side validator function
function validateRecipe(recipe) {
  if (!recipe || typeof recipe !== 'object') return false;
  if (typeof recipe.title !== 'string' || !recipe.title.trim()) return false;
  if (typeof recipe.description !== 'string') return false;
  if (typeof recipe.servings !== 'number' || recipe.servings <= 0) return false;

  if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) return false;
  for (const item of recipe.ingredients) {
    if (!item || typeof item.name !== 'string' || !item.name.trim()) return false;
    if (typeof item.amount !== 'number' || item.amount <= 0) return false;
    if (typeof item.unit !== 'string') return false;
  }

  if (!Array.isArray(recipe.steps) || recipe.steps.length === 0) return false;
  for (const step of recipe.steps) {
    if (typeof step !== 'string' || !step.trim()) return false;
  }

  if (!Array.isArray(recipe.swaps)) return false;
  for (const swap of recipe.swaps) {
    if (!swap || typeof swap.original !== 'string' || typeof swap.swap !== 'string') return false;
  }

  return true;
}

function getDemoRecipe(ingredientsText) {
  return {
    title: "Quick Fridge Skillet Scramble",
    description: `A flavorful, protein-packed meal crafted from: ${ingredientsText}`,
    servings: 2,
    ingredients: [
      { name: "Egg", amount: 4, unit: "large" },
      { name: "Spinach / Greens", amount: 1, unit: "cup" },
      { name: "Garlic", amount: 2, unit: "cloves" },
      { name: "Shredded Cheese", amount: 0.5, unit: "cup" }
    ],
    steps: [
      "Mince the garlic and roughly chop your fresh greens or vegetables.",
      "Heat a non-stick skillet over medium heat with a splash of olive oil.",
      "Sauté the garlic for 60 seconds until golden and fragrant.",
      "Add the greens, whisk eggs in a separate bowl, and pour gently into the skillet.",
      "Scramble to your preferred doneness, fold in cheese, and serve immediately!"
    ],
    swaps: [
      { original: "Spinach", swap: "Kale, Broccoli, or Bell Pepper" },
      { original: "Garlic", swap: "Garlic Powder or Diced Onion" }
    ]
  };
}

async function fetchRecipeFromGemini(genAI, ingredientsText, retryReason = null) {
  const modelsToTry = ['gemini-2.0-flash', 'gemini-2.0-flash-lite'];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: recipeSchema,
          temperature: 0.7,
        },
      });

      let prompt = `Create a realistic recipe using these available ingredients: "${ingredientsText}". Include realistic amounts, units, clear step-by-step instructions, base serving count, and 1 to 3 ingredient swaps.`;

      if (retryReason) {
        prompt += `\n\nCRITICAL FIX REQUIRED: Your previous output was invalid because: ${retryReason}. Return a valid JSON object matching the required schema.`;
      }

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (!text) {
        throw new Error('EMPTY_RESPONSE');
      }

      return JSON.parse(text);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
}

// Express route for POST /api/recipe
app.post(['/api/recipe', '/api/recipe/', '/recipe', '/'], async (req, res) => {
  const { ingredients } = req.body || {};

  if (!ingredients || typeof ingredients !== 'string' || !ingredients.trim()) {
    return res.status(400).json({ error: 'Please provide a list of ingredients.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return res.json(getDemoRecipe(ingredients));
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    let recipe = await fetchRecipeFromGemini(genAI, ingredients);

    if (!validateRecipe(recipe)) {
      recipe = await fetchRecipeFromGemini(
        genAI,
        ingredients,
        'Missing required fields or invalid data types'
      );

      if (!validateRecipe(recipe)) {
        return res.json(getDemoRecipe(ingredients));
      }
    }

    return res.json(recipe);
  } catch (error) {
    return res.json(getDemoRecipe(ingredients));
  }
});

// Fallback handler for all other /api endpoints
app.all('*', (req, res) => {
  const ingredients = req.body?.ingredients || 'chicken, spinach';
  return res.json(getDemoRecipe(ingredients));
});

export default app;
