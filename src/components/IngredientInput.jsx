import React from 'react';
import { Sparkles, Utensils, Trash2 } from 'lucide-react';

const PRESET_INGREDIENTS = [
  'Chicken breast, spinach, garlic, rice, onion',
  'Eggs, tomatoes, cheese, avocado, bread',
  'Pasta, olive oil, garlic, parmesan, red pepper flakes',
  'Tofu, soy sauce, broccoli, carrots, sesame oil',
];

export default function IngredientInput({
  ingredientsText,
  setIngredientsText,
  onSubmit,
  isLoading,
}) {
  const handleChipClick = (preset) => {
    setIngredientsText(preset);
  };

  const handleClear = () => {
    setIngredientsText('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (ingredientsText.trim()) {
      onSubmit(ingredientsText);
    }
  };

  return (
    <div className="glass-card">
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <label className="input-label" htmlFor="ingredients-input">
            <Utensils size={18} />
            <span>What's in your fridge?</span>
          </label>
          {ingredientsText && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleClear}
              disabled={isLoading}
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
            >
              <Trash2 size={13} />
              Clear
            </button>
          )}
        </div>

        <textarea
          id="ingredients-input"
          className="ingredient-textarea"
          placeholder="List your ingredients (e.g. 2 eggs, 1 tomato, cheddar cheese, garlic)..."
          value={ingredientsText}
          onChange={(e) => setIngredientsText(e.target.value)}
          disabled={isLoading}
        />

        <div className="chips-container">
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', alignSelf: 'center' }}>Try:</span>
          {PRESET_INGREDIENTS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              className="chip-btn"
              onClick={() => handleChipClick(preset)}
              disabled={isLoading}
            >
              + {preset.split(',')[0]}...
            </button>
          ))}
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={isLoading || !ingredientsText.trim()}
        >
          <Sparkles size={18} />
          {isLoading ? 'Crafting Recipe...' : 'Generate Recipe'}
        </button>
      </form>
    </div>
  );
}
