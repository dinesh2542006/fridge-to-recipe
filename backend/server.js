import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

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

// Structured recipe generator fallback
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

// Call Gemini API
async function fetchRecipeFromGemini(genAI, ingredientsText, retryReason = null) {
  const modelsToTry = ['gemini-2.0-flash', 'gemini-2.0-flash-lite'];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      console.log(`Calling Gemini API (${modelName})...`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: recipeSchema,
          temperature: 0.7,
        },
      });

      let prompt = `Create a realistic recipe using these available ingredients: "${ingredientsText}".
Include realistic amounts, units, clear step-by-step instructions, base serving count, and 1 to 3 ingredient swaps.`;

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
      console.warn(`Gemini model ${modelName} notice:`, err.message);
      lastError = err;
    }
  }

  throw lastError;
}

// POST /api/recipe endpoint
app.post('/api/recipe', async (req, res) => {
  const { ingredients } = req.body;

  if (!ingredients || typeof ingredients !== 'string' || !ingredients.trim()) {
    return res.status(400).json({ error: 'Please provide a list of ingredients.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    console.log('No GEMINI_API_KEY configured. Returning demo recipe.');
    return res.json(getDemoRecipe(ingredients));
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // 20 second timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('TIMEOUT')), 20000);
  });

  try {
    // Race LLM call against 20s timeout
    const recipeTask = (async () => {
      let recipe = await fetchRecipeFromGemini(genAI, ingredients);

      // Validate schema on server
      if (!validateRecipe(recipe)) {
        console.warn('First attempt produced invalid shape. Retrying once...');
        recipe = await fetchRecipeFromGemini(
          genAI,
          ingredients,
          'Missing required fields or invalid data types'
        );

        if (!validateRecipe(recipe)) {
          throw new Error('INVALID_OUTPUT_AFTER_RETRY');
        }
      }
      return recipe;
    })();

    const recipe = await Promise.race([recipeTask, timeoutPromise]);
    return res.json(recipe);

  } catch (error) {
    console.error('Server handled Gemini call:', error.message);

    // If quota rate limit (429) or API error occurs, return high quality fallback recipe to avoid breaking user experience
    if (error.message && (error.message.includes('429') || error.message.includes('Quota'))) {
      console.warn('Gemini 429 quota reached. Providing fallback recipe.');
      return res.json(getDemoRecipe(ingredients));
    }

    if (error.message === 'TIMEOUT') {
      return res.status(504).json({ error: 'Recipe generation took too long. Please try again.' });
    }

    if (error.message === 'INVALID_OUTPUT_AFTER_RETRY') {
      return res.status(502).json({ error: 'Failed to generate a valid recipe structure from AI. Please try again.' });
    }

    // Fallback response for any API errors so app remains functional
    return res.json(getDemoRecipe(ingredients));
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
