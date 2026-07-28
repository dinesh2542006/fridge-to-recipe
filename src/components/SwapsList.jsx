import React from 'react';
import { ArrowRightLeft } from 'lucide-react';

export default function SwapsList({ swaps = [] }) {
  if (!swaps || swaps.length === 0) return null;

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <div className="section-title">
        <ArrowRightLeft size={18} style={{ color: 'var(--accent-amber)' }} />
        <span>Possible Ingredient Swaps</span>
      </div>
      <div className="swaps-grid">
        {swaps.map((item, idx) => (
          <div key={idx} className="swap-card">
            <div className="swap-title">Substitute for {item.original}</div>
            <div className="swap-desc">👉 Use {item.swap}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
