# Fridge to Recipe — AI-Powered React App

A production-ready fullstack web application that takes free-form ingredients from a user's fridge, calls Google Gemini AI via a secure Node/Express proxy backend with structured JSON output enforcement, and renders an interactive, stateful recipe UI.

---

## 🚀 Quick Setup & Local Execution

### Prerequisites
- Node.js (v18 or higher recommended)
- A Google Gemini API Key (free from [Google AI Studio](https://aistudio.google.com/))

### 1. Backend Setup
```bash
cd backend
npm install
```
Create a `.env` file in the `backend` directory (or copy from `.env.example`):
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
PORT=5000
```
Start the backend server:
```bash
npm start
# Server runs on http://localhost:5000
```

### 2. Frontend Setup
In a separate terminal window:
```bash
cd frontend
npm install
npm run dev
# App runs on http://localhost:3000
```

Open `http://localhost:3000` in your web browser.

---

## 🛠️ Tech Stack & Key Choices

- **Frontend**: React + Vite, CSS custom design system (dark/light themes, glassmorphism, responsive down to ~375px mobile viewports), Lucide React icons.
- **Backend**: Node.js + Express proxy server.
- **AI Model**: Google Gemini 2.0 Flash (`gemini-2.0-flash`) using `responseMimeType: "application/json"` and `responseSchema`.

---

## 💡 Key Architectural & Interview Defense Decisions

### 1. Server-Side Double Validation & Single-Attempt Retry Loop
- **Problem**: Even with `responseSchema` requested, AI models can occasionally produce invalid types, empty strings, missing fields, or broken JSON formatting.
- **Solution**:
  1. The Express backend receives the JSON from Gemini and passes it through a strict validator (`validateRecipe`).
  2. If validation fails, the backend triggers a **single-attempt retry** to Gemini, explicitly instructing the model what field failed or went wrong in its initial attempt.
  3. If the second attempt still fails, the backend returns a clean `502 Bad Gateway` error instead of sending broken data to the client.
  4. A **20-second timeout promise** (`Promise.race`) protects the server from lingering LLM hangs, returning a `504 Gateway Timeout` if exceeded.

### 2. Frontend Request Lifecycle Safety (No Stale Overwrites)
- **Problem**: If a user submits query #1, then quickly submits query #2 before #1 completes, query #1 could resolve *after* query #2 and overwrite the screen with outdated state (race condition).
- **Solution**:
  1. **AbortController**: Every new submit immediately calls `activeControllerRef.current.abort()`, canceling the in-flight HTTP request at the network layer.
  2. **Monotonic Request ID Counter (`requestIdRef`)**: Each submission increments a sequence ID (`currentRequestId = ++requestIdRef.current`). When a fetch resolves or fails, the frontend checks `if (currentRequestId !== requestIdRef.current) return;`. If superseded, the response is discarded silently.

### 3. API Key Security
- `GEMINI_API_KEY` lives exclusively on the backend in `backend/.env`. The frontend never touches or exposes the secret key in bundle assets or client network headers.

---

## 🌟 Interactive UI Features
- **Servings Scaler (+/−)**: Automatically rescales all ingredient quantities proportionally in real time, formatted nicely with clean numbers or common fractions (e.g. `1 ½ cups`).
- **Interactive Step Checklist**: Step-by-step instructions with checkable boxes, strikethrough visuals, and a live completion progress bar.
- **Ingredient Swaps**: Clear cards displaying substitutions if you are missing an ingredient.
- **Saved Recipes**: Save favorite recipes locally (`localStorage`) and reload them at any time.
- **Copy & Share**: 1-click clipboard copy of full recipe text.

---

## 📌 Known Limitations
- The model suggestions rely on Gemini API availability and current quota limits.
- Extremely obscure non-food input text might be rejected by the server validation logic (which correctly surfaces a user-friendly retry error).

---

## ⏱️ Time Spent
- Planning & Schema Design: ~30 mins
- Backend Proxy, Validation & Retry Implementation: ~45 mins
- Frontend UI Components, Servings Math & Step Checklist: ~60 mins
- Request Cancellation & Race Condition Guarding: ~30 mins
- CSS Styling & Theme Polish: ~30 mins
- **Total Time**: ~3 hours 15 minutes
