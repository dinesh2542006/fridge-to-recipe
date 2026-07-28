import React, { useState, useEffect } from 'react';
import { CheckCircle2, ListOrdered } from 'lucide-react';

export default function StepChecklist({ steps = [] }) {
  const [completedSteps, setCompletedSteps] = useState({});

  useEffect(() => {
    setCompletedSteps({});
  }, [steps]);

  const toggleStep = (index) => {
    setCompletedSteps((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const totalSteps = steps.length;
  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPercent = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  return (
    <div>
      <div className="section-title">
        <ListOrdered size={20} />
        <span>Step-by-Step Instructions</span>
      </div>

      <div className="progress-container">
        <div className="progress-bar-bg">
          <div
            className="progress-bar-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="progress-text">
          {completedCount} of {totalSteps} done ({progressPercent}%)
        </span>
      </div>

      <div className="steps-list">
        {steps.map((stepText, index) => {
          const isDone = !!completedSteps[index];
          return (
            <div
              key={index}
              className={`step-item ${isDone ? 'done' : ''}`}
              onClick={() => toggleStep(index)}
            >
              <input
                type="checkbox"
                className="step-checkbox"
                checked={isDone}
                onChange={() => toggleStep(index)}
                onClick={(e) => e.stopPropagation()}
              />
              <div className="step-content">
                <div className="step-number">Step {index + 1}</div>
                <div className="step-text">{stepText}</div>
              </div>
              {isDone && <CheckCircle2 size={18} className="text-emerald" style={{ color: 'var(--primary)', flexShrink: 0 }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
