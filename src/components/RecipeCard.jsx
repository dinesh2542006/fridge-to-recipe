import React, { useState } from 'react';
import { ChefHat, ShoppingBag, BookmarkCheck, Copy, Check } from 'lucide-react';
import ServingsControl, { formatQuantity } from './ServingsControl.jsx';
import StepChecklist from './StepChecklist.jsx';
import SwapsList from './SwapsList.jsx';

export default function RecipeCard({ recipe, onSaveRecipe, isSaved }) {
  const [currentServings, setCurrentServings] = useState(recipe.servings || 2);
  const [copied, setCopied] = useState(false);

  const baseServings = recipe.servings || 2;
  const scaleRatio = currentServings / baseServings;

  const handleCopy = () => {
    const lines = [
      `📖 ${recipe.title}`,
      `Description: ${recipe.description}`,
      `Servings: ${currentServings}`,
      '',
      '🛒 INGREDIENTS:',
      ...recipe.ingredients.map(
        (ing) => `- ${formatQuantity(ing.amount * scaleRatio)} ${ing.unit} ${ing.name}`
      ),
      '',
      '👨‍🍳 INSTRUCTIONS:',
      ...recipe.steps.map((step, i) => `${i + 1}. ${step}`),
    ];
    
    if (recipe.swaps && recipe.swaps.length > 0) {
      lines.push('', '🔄 INGREDIENT SWAPS:');
      recipe.swaps.forEach((s) => lines.push(`- Instead of ${s.original}, use ${s.swap}`));
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card">
      <div className="recipe-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="recipe-title">{recipe.title}</div>
            <div className="recipe-description">{recipe.description}</div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCopy}
              title="Copy recipe to clipboard"
            >
              {copied ? <Check size={16} className="text-emerald" /> : <Copy size={16} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onSaveRecipe(recipe)}
              title="Save recipe"
            >
              <BookmarkCheck size={16} style={{ color: isSaved ? 'var(--primary)' : 'currentColor' }} />
              {isSaved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <ServingsControl
        servings={currentServings}
        baseServings={baseServings}
        onChangeServings={setCurrentServings}
      />

      <div style={{ marginBottom: '1.5rem' }}>
        <div className="section-title">
          <ShoppingBag size={20} />
          <span>Scaled Ingredients</span>
        </div>
        <div className="ingredients-grid">
          {recipe.ingredients.map((item, idx) => {
            const scaledQty = formatQuantity(item.amount * scaleRatio);
            return (
              <div key={idx} className="ingredient-card">
                <span className="ingredient-name">{item.name}</span>
                <span className="ingredient-qty">
                  {scaledQty} {item.unit}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <StepChecklist steps={recipe.steps} />

      <SwapsList swaps={recipe.swaps} />
    </div>
  );
}
