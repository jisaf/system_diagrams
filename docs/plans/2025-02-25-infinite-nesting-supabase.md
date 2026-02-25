# Infinite Component Nesting + Supabase Models Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable infinite component nesting and add Supabase-backed model storage with dropdown for loading saved models.

**Architecture:**
1. Modify Toolbar to allow components inside components (simple type rule change)
2. Add Supabase client with anonymous access for model CRUD
3. Add models dropdown to Header for Save/Load operations

**Tech Stack:** Supabase JS client, React hooks for data fetching

---

## Task 1: Enable Infinite Component Nesting

**Files:**
- Modify: `/tmp/system_diagrams/src/components/Toolbar.jsx:52-61`

**Step 1: Update getValidElementTypes to allow components inside components**

Change the switch statement to allow `component` type when inside a component:

```jsx
switch (parent.type) {
  case 'system':
    // Inside a system - can add containers
    return ['container', 'person'];
  case 'container':
    // Inside a container - can add components
    return ['component'];
  case 'component':
    // Inside a component - can add sub-components
    return ['component'];
  default:
    return [];
}
```

**Step 2: Verify manually**

Run: `cd /tmp/system_diagrams && npm run dev`
- Create a system, drill in
- Create a container, drill in
- Create a component, drill in
- Verify you can create another component inside it

**Step 3: Commit**

```bash
git add src/components/Toolbar.jsx
git commit -m "feat: allow infinite component nesting"
```

---

## Task 2: Create Supabase Client

**Files:**
- Create: `/tmp/system_diagrams/src/lib/supabase.js`

**Step 1: Install Supabase client**

```bash
cd /tmp/system_diagrams && npm install @supabase/supabase-js
```

**Step 2: Create Supabase client module**

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Only create client if credentials are configured
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = () => !!supabase;
```

**Step 3: Create .env.example file**

Create `/tmp/system_diagrams/.env.example`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Step 4: Update .gitignore**

Add `.env` and `.env.local` to gitignore.

**Step 5: Commit**

```bash
git add src/lib/supabase.js .env.example .gitignore
git commit -m "feat: add Supabase client configuration"
```

---

## Task 3: Create useModels Hook

**Files:**
- Create: `/tmp/system_diagrams/src/hooks/useModels.js`

**Step 1: Create the hook for model CRUD operations**

```javascript
import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const useModels = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentModelId, setCurrentModelId] = useState(null);

  // Fetch all models
  const fetchModels = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('models')
        .select('id, name, updated_at')
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;
      setModels(data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching models:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load a specific model
  const loadModel = useCallback(async (id) => {
    if (!isSupabaseConfigured()) return null;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('models')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      setCurrentModelId(id);
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error loading model:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Save model (create or update)
  const saveModel = useCallback(async (name, modelData) => {
    if (!isSupabaseConfigured()) return null;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name,
        data: modelData,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (currentModelId) {
        // Update existing
        const { data, error: updateError } = await supabase
          .from('models')
          .update(payload)
          .eq('id', currentModelId)
          .select()
          .single();

        if (updateError) throw updateError;
        result = data;
      } else {
        // Create new
        const { data, error: insertError } = await supabase
          .from('models')
          .insert(payload)
          .select()
          .single();

        if (insertError) throw insertError;
        result = data;
        setCurrentModelId(result.id);
      }

      await fetchModels(); // Refresh list
      return result;
    } catch (err) {
      setError(err.message);
      console.error('Error saving model:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentModelId, fetchModels]);

  // Save as new model
  const saveAsModel = useCallback(async (name, modelData) => {
    if (!isSupabaseConfigured()) return null;

    setLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('models')
        .insert({
          name,
          data: modelData,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) throw insertError;
      setCurrentModelId(data.id);
      await fetchModels();
      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error saving model:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchModels]);

  // Delete a model
  const deleteModel = useCallback(async (id) => {
    if (!isSupabaseConfigured()) return false;

    setLoading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('models')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      if (currentModelId === id) {
        setCurrentModelId(null);
      }

      await fetchModels();
      return true;
    } catch (err) {
      setError(err.message);
      console.error('Error deleting model:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentModelId, fetchModels]);

  // Clear current model (new diagram)
  const newModel = useCallback(() => {
    setCurrentModelId(null);
  }, []);

  // Fetch models on mount
  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return {
    models,
    loading,
    error,
    currentModelId,
    isConfigured: isSupabaseConfigured(),
    fetchModels,
    loadModel,
    saveModel,
    saveAsModel,
    deleteModel,
    newModel,
  };
};
```

**Step 2: Commit**

```bash
git add src/hooks/useModels.js
git commit -m "feat: add useModels hook for Supabase CRUD"
```

---

## Task 4: Create ModelSelector Component

**Files:**
- Create: `/tmp/system_diagrams/src/components/ModelSelector.jsx`

**Step 1: Create the dropdown component**

```jsx
import { useState, useRef, useEffect } from 'react';
import { Database, ChevronDown, Save, FilePlus, Trash2, FolderOpen, Loader2 } from 'lucide-react';
import { useModels } from '../hooks/useModels';
import useStore from '../store';

const ModelSelector = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [newName, setNewName] = useState('');
  const dropdownRef = useRef(null);

  const {
    models,
    loading,
    currentModelId,
    isConfigured,
    loadModel,
    saveModel,
    saveAsModel,
    deleteModel,
    newModel,
  } = useModels();

  const { metadata, exportModel, importModel, clearAll, setMetadata } = useStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setShowSaveAs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isConfigured) {
    return null; // Don't show if Supabase not configured
  }

  const handleSave = async () => {
    const modelData = exportModel();
    if (currentModelId) {
      await saveModel(metadata.name, modelData);
    } else {
      setShowSaveAs(true);
      setNewName(metadata.name);
    }
    setIsOpen(false);
  };

  const handleSaveAs = async () => {
    if (!newName.trim()) return;
    const modelData = exportModel();
    // Update metadata name to match
    setMetadata({ ...metadata, name: newName.trim() });
    await saveAsModel(newName.trim(), { ...modelData, metadata: { ...modelData.metadata, name: newName.trim() } });
    setShowSaveAs(false);
    setNewName('');
  };

  const handleLoad = async (id) => {
    const model = await loadModel(id);
    if (model?.data) {
      importModel(model.data);
    }
    setIsOpen(false);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Delete this model? This cannot be undone.')) {
      await deleteModel(id);
    }
  };

  const handleNew = () => {
    clearAll();
    newModel();
    setMetadata({ name: 'New C4 Model', version: '1.0', author: 'Solution Architect' });
    setIsOpen(false);
  };

  const currentModel = models.find(m => m.id === currentModelId);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm transition-colors"
        title="Cloud models"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Database className="w-4 h-4" />
        )}
        <span className="max-w-[120px] truncate">
          {currentModel ? currentModel.name : 'Models'}
        </span>
        <ChevronDown className="w-3 h-3" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {showSaveAs ? (
            <div className="p-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model Name
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveAs()}
                placeholder="Enter model name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleSaveAs}
                  disabled={!newName.trim()}
                  className="flex-1 px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowSaveAs(false)}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Actions */}
              <div className="p-2 border-b border-gray-100">
                <button
                  onClick={handleNew}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                >
                  <FilePlus className="w-4 h-4" />
                  New Model
                </button>
                <button
                  onClick={handleSave}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {currentModelId ? 'Save' : 'Save As...'}
                </button>
                {currentModelId && (
                  <button
                    onClick={() => { setShowSaveAs(true); setNewName(metadata.name); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save As...
                  </button>
                )}
              </div>

              {/* Models List */}
              <div className="max-h-64 overflow-y-auto">
                {models.length === 0 ? (
                  <div className="px-3 py-4 text-sm text-gray-500 text-center">
                    No saved models
                  </div>
                ) : (
                  models.map((model) => (
                    <div
                      key={model.id}
                      onClick={() => handleLoad(model.id)}
                      className={`flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-100 cursor-pointer ${
                        model.id === currentModelId ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <FolderOpen className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{model.name}</span>
                      </div>
                      <button
                        onClick={(e) => handleDelete(e, model.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="Delete model"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
```

**Step 2: Commit**

```bash
git add src/components/ModelSelector.jsx
git commit -m "feat: add ModelSelector dropdown component"
```

---

## Task 5: Integrate ModelSelector into Header

**Files:**
- Modify: `/tmp/system_diagrams/src/components/Header.jsx`

**Step 1: Import and add ModelSelector**

Add import at top:
```jsx
import ModelSelector from './ModelSelector';
```

**Step 2: Add ModelSelector to the header buttons**

Find the "Share/Export/Import Buttons" div and add ModelSelector before the Share button:

```jsx
{/* Share/Export/Import Buttons */}
<div className="flex items-center gap-2">
  {/* Cloud Models */}
  <ModelSelector />

  {/* Share Button */}
  <button
```

**Step 3: Commit**

```bash
git add src/components/Header.jsx
git commit -m "feat: integrate ModelSelector into Header"
```

---

## Task 6: Create Supabase Table (SQL for user to run)

**Files:**
- Create: `/tmp/system_diagrams/docs/SUPABASE_SETUP.md`

**Step 1: Create setup documentation**

```markdown
# Supabase Setup Guide

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Choose an organization and name your project
4. Set a database password (save it somewhere safe)
5. Choose a region close to your users
6. Click "Create new project"

## 2. Create the Models Table

Go to the SQL Editor in your Supabase dashboard and run:

```sql
-- Create models table
CREATE TABLE models (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE models ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (anonymous access)
CREATE POLICY "Allow anonymous access" ON models
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX models_updated_at_idx ON models(updated_at DESC);
```

## 3. Get Your API Keys

1. Go to Project Settings → API
2. Copy the "Project URL" (e.g., `https://xxxxx.supabase.co`)
3. Copy the "anon public" key

## 4. Configure the App

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

For GitHub Pages deployment, you'll need to build with the environment variables:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co \
VITE_SUPABASE_ANON_KEY=your-anon-key \
npm run build:standalone
```

## 5. Verify Setup

1. Run `npm run dev`
2. You should see a "Models" dropdown in the header
3. Create a diagram and click Save
4. Refresh the page - your model should appear in the dropdown
```

**Step 2: Commit**

```bash
git add docs/SUPABASE_SETUP.md
git commit -m "docs: add Supabase setup guide"
```

---

## Task 7: Create lib directory and verify structure

**Step 1: Create the lib directory**

```bash
mkdir -p /tmp/system_diagrams/src/lib
```

**Step 2: Build and verify**

```bash
cd /tmp/system_diagrams && npm install && npm run build
```

Expected: Build succeeds with no errors

**Step 3: Test dev server**

```bash
npm run dev
```

Manually verify:
- App loads
- ModelSelector shows (will be hidden if Supabase not configured, which is expected)
- Can drill into components and add sub-components

---

## Task 8: Build Standalone and Deploy

**Step 1: Build standalone**

```bash
cd /tmp/system_diagrams && npm run build:standalone
```

**Step 2: Commit all changes**

```bash
git add -A
git commit -m "feat: complete infinite nesting and Supabase model storage"
```

**Step 3: Push to GitHub**

```bash
git push origin main
```

---

## Summary

After completing all tasks:

1. **Infinite component nesting** - Components can contain other components
2. **Supabase integration** - Models dropdown with Save/Load/Delete
3. **Graceful degradation** - App works without Supabase (dropdown hidden)
4. **Documentation** - Setup guide for users to configure their own Supabase

User needs to:
1. Create Supabase project
2. Run the SQL to create the `models` table
3. Set environment variables
4. Rebuild and deploy
