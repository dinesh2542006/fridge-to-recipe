import React, { useState, useRef, useEffect } from 'react';
import { ChefHat, Sun, Moon, AlertTriangle, RefreshCw, Sparkles } from 'lucide-react';
import IngredientInput from './components/IngredientInput.jsx';
import RecipeCard from './components/RecipeCard.jsx';
import SavedRecipes from './components/SavedRecipes.jsx';

export default function App() {
  const [ingredientsText, setIngredientsText] = useState('');
  const [recipe, setRecipe] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'error' | 'success'
  const [errorMessage, setErrorMessage] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [theme, setTheme] = useState('dark');
  const [savedRecipes, setSavedRecipes] = useState([]);

  // Ref guards for race condition & request cancellation handling
  const activeControllerRef = useRef(null);
  const requestIdRef = useRef(0);

  // Load saved recipes from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('saved_recipes');
      if (stored) {
        setSavedRecipes(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load saved recipes from localStorage:', e);
    }
  }, []);

  // Save recipes to localStorage when state updates
  const saveToLocalStorage = (recipes) => {
    setSavedRecipes(recipes);
    try {
      localStorage.setItem('saved_recipes', JSON.stringify(recipes));
    } catch (e) {
      console.warn('Failed to write saved recipes to localStorage:', e);
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Main function to fetch recipe from Express proxy endpoint
  const generateRecipe = async (queryText) => {
    if (!queryText || !queryText.trim()) return;

    // 1. Cancel any previous in-flight request
    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
    }

    // 2. Monotonic request ID counter
    const currentRequestId = ++requestIdRef.current;

    // 3. Create fresh AbortController for this request
    const controller = new AbortController();
    activeControllerRef.current = controller;

    setStatus('loading');
    setErrorMessage('');
    setLastQuery(queryText);

    try {
      console.log(`[CLIENT FETCH START] Querying /api/recipe (request #${currentRequestId}) with ingredients: "${queryText}"`);

      const response = await fetch('/api/recipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingredients: queryText }),
        signal: controller.signal,
      });

      console.log(`[CLIENT FETCH RESPONSE] HTTP Status: ${response.status} ${response.statusText}`);

      const responseText = await response.text();
      console.log('[CLIENT FETCH RAW RESPONSE TEXT]:', responseText);

      let data = {};
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        console.error('[CLIENT PARSE ERROR] Failed to parse response as JSON:', e, responseText);
      }

      // Guard: Ignore response if this request has been superseded by a newer submit
      if (currentRequestId !== requestIdRef.current) {
        console.log(`Ignoring superseded request #${currentRequestId}`);
        return;
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status} ${response.statusText}: ${responseText.substring(0, 150)}`);
      }

      if (!data.title || !data.ingredients) {
        throw new Error(`Incomplete recipe output received. Raw response: "${responseText.substring(0, 150)}..."`);
      }

      setRecipe(data);
      setStatus('success');
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`Request #${currentRequestId} aborted.`);
        return;
      }

      if (currentRequestId !== requestIdRef.current) {
        return;
      }

      console.error('[CLIENT FINAL ERROR HANDLER]:', error);
      setErrorMessage(error.message || 'Failed to generate recipe. Please check browser devtools console for details.');
      setStatus('error');
    } finally {
      // Clean up ref if this was the active request
      if (currentRequestId === requestIdRef.current) {
        activeControllerRef.current = null;
      }
    }
  };

  const handleRetry = () => {
    if (lastQuery) {
      generateRecipe(lastQuery);
    }
  };

  const handleSaveRecipe = (recipeToSave) => {
    const exists = savedRecipes.some((item) => item.recipe.title === recipeToSave.title);
    if (exists) return;

    const newSaved = [
      { id: Date.now().toString(), recipe: recipeToSave, createdAt: new Date().toISOString() },
      ...savedRecipes,
    ];
    saveToLocalStorage(newSaved);
  };

  const handleDeleteSavedRecipe = (id) => {
    const updated = savedRecipes.filter((item) => item.id !== id);
    saveToLocalStorage(updated);
  };

  const handleLoadSavedRecipe = (savedRecipe) => {
    setRecipe(savedRecipe);
    setStatus('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isCurrentSaved = recipe && savedRecipes.some((item) => item.recipe.title === recipe.title);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="logo-group">
          <div className="logo-badge">
            <ChefHat size={26} color="#ffffff" />
          </div>
          <div>
            <h1 className="brand-title">Fridge to Recipe</h1>
            <div className="brand-subtitle">AI-Powered Structured Recipe Generator</div>
          </div>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn-icon"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Ingredient Input Form */}
      <IngredientInput
        ingredientsText={ingredientsText}
        setIngredientsText={setIngredientsText}
        onSubmit={generateRecipe}
        isLoading={status === 'loading'}
      />

      {/* Main Content Area */}

      {/* 1. Loading State */}
      {status === 'loading' && (
        <div className="glass-card loading-card">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-subtitle" />
          <div style={{ margin: '1rem 0' }}>
            <div className="skeleton skeleton-box" />
          </div>
          <div className="skeleton skeleton-title" style={{ width: '40%' }} />
          <div className="skeleton skeleton-box" style={{ height: '120px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)', marginTop: '0.5rem' }}>
            <Sparkles size={16} className="animate-spin" />
            <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
              Asking Gemini AI & validating response schema...
            </span>
          </div>
        </div>
      )}

      {/* 2. Error State */}
      {status === 'error' && (
        <div className="error-card">
          <div className="error-header">
            <AlertTriangle size={22} />
            <span>Recipe Generation Failed</span>
          </div>
          <div className="error-text">{errorMessage}</div>
          <button type="button" className="btn-danger" onClick={handleRetry}>
            <RefreshCw size={16} />
            Retry Request
          </button>
        </div>
      )}

      {/* 3. Success State */}
      {status === 'success' && recipe && (
        <RecipeCard
          recipe={recipe}
          onSaveRecipe={handleSaveRecipe}
          isSaved={isCurrentSaved}
        />
      )}

      {/* 4. Idle State */}
      {status === 'idle' && (
        <div className="glass-card empty-state">
          <div className="empty-icon">🥦 🥚 🧀</div>
          <h3 style={{ marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
            Turn random ingredients into a step-by-step recipe
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '500px', margin: '0 auto' }}>
            Type what you have in your fridge above or click one of the quick sample chips.
            Our Express backend proxies Gemini AI to return structured, interactive recipes.
          </p>
        </div>
      )}

      {/* Saved Recipes Drawer */}
      <SavedRecipes
        savedRecipes={savedRecipes}
        onLoadRecipe={handleLoadSavedRecipe}
        onDeleteRecipe={handleDeleteSavedRecipe}
      />
    </div>
  );
}
