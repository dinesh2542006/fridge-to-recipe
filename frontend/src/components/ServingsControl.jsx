import React from 'react';
import { Users, Minus, Plus } from 'lucide-react';

// Helper to format scaled ingredient amounts into clean readable numbers
export function formatQuantity(amount) {
  if (!amount || isNaN(amount)) return '0';
  
  // Format to max 2 decimal places, removing trailing zeros
  const rounded = Math.round(amount * 100) / 100;
  
  // Convert common decimals to fractions if cleanly divisible
  const integerPart = Math.floor(rounded);
  const decimalPart = Math.round((rounded - integerPart) * 100) / 100;

  let fractionStr = '';
  if (Math.abs(decimalPart - 0.25) < 0.05) fractionStr = '¼';
  else if (Math.abs(decimalPart - 0.33) < 0.05) fractionStr = '⅓';
  else if (Math.abs(decimalPart - 0.5) < 0.05) fractionStr = '½';
  else if (Math.abs(decimalPart - 0.67) < 0.05) fractionStr = '⅔';
  else if (Math.abs(decimalPart - 0.75) < 0.05) fractionStr = '¾';

  if (fractionStr) {
    return integerPart > 0 ? `${integerPart} ${fractionStr}` : fractionStr;
  }

  return rounded.toString();
}

export default function ServingsControl({ servings, baseServings, onChangeServings }) {
  const handleDecrement = () => {
    if (servings > 1) {
      onChangeServings(servings - 1);
    }
  };

  const handleIncrement = () => {
    onChangeServings(servings + 1);
  };

  return (
    <div className="servings-bar">
      <div className="servings-label">
        <Users size={18} className="text-emerald" />
        <span>Servings (Base: {baseServings})</span>
      </div>
      <div className="servings-stepper">
        <button
          type="button"
          className="step-btn"
          onClick={handleDecrement}
          disabled={servings <= 1}
          aria-label="Decrease servings"
        >
          <Minus size={16} />
        </button>
        <span className="servings-count">{servings}</span>
        <button
          type="button"
          className="step-btn"
          onClick={handleIncrement}
          aria-label="Increase servings"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}
