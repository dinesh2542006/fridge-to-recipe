import React from 'react';
import { Bookmark, Trash2, ArrowRight } from 'lucide-react';

export default function SavedRecipes({ savedRecipes = [], onLoadRecipe, onDeleteRecipe }) {
  if (!savedRecipes || savedRecipes.length === 0) return null;

  return (
    <div className="glass-card" style={{ marginTop: '2rem' }}>
      <div className="section-title">
        <Bookmark size={18} style={{ color: 'var(--primary)' }} />
        <span>Saved Recipes ({savedRecipes.length})</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {savedRecipes.map((item) => (
          <div
            key={item.id}
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{item.recipe.title}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                {item.recipe.ingredients.length} ingredients • {item.recipe.servings} servings
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => onLoadRecipe(item.recipe)}
                style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}
              >
                View <ArrowRight size={14} />
              </button>
              <button
                type="button"
                className="btn-icon"
                onClick={() => onDeleteRecipe(item.id)}
                aria-label="Delete saved recipe"
                style={{ width: '30px', height: '30px' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
