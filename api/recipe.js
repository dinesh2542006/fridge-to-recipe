import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

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

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {}
  }

  const ingredients = body?.ingredients || 'chicken, spinach, garlic';

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return res.status(200).json(getDemoRecipe(ingredients));
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const modelsToTry = ['gemini-2.0-flash', 'gemini-2.0-flash-lite'];
    let recipe = null;

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

        const prompt = `Create a realistic recipe using these available ingredients: "${ingredients}". Include realistic amounts, units, clear step-by-step instructions, base serving count, and 1 to 3 ingredient swaps.`;
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        if (text) {
          const parsed = JSON.parse(text);
          if (validateRecipe(parsed)) {
            recipe = parsed;
            break;
          }
        }
      } catch (e) {
        console.warn(`Vercel function model ${modelName} error:`, e.message);
      }
    }

    if (!recipe) {
      return res.status(200).json(getDemoRecipe(ingredients));
    }

    return res.status(200).json(recipe);
  } catch (error) {
    return res.status(200).json(getDemoRecipe(ingredients));
  }
}
