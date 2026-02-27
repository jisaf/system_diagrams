import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import useStore from '../store';

const LAST_MODEL_KEY = 'c4-last-model-id';

export const useModels = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentModelId, setCurrentModelId] = useState(null);
  const initialLoadDone = useRef(false);
  const importModel = useStore((state) => state.importModel);

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
  const loadModel = useCallback(async (id, skipImport = false) => {
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

      // Store the model ID for next session
      localStorage.setItem(LAST_MODEL_KEY, id);

      // Auto-import the model data unless skipped
      if (!skipImport && data?.data) {
        importModel(data.data);
      }

      return data;
    } catch (err) {
      setError(err.message);
      console.error('Error loading model:', err);
      // Clear stored ID if model no longer exists
      if (err.message?.includes('not found') || err.code === 'PGRST116') {
        localStorage.removeItem(LAST_MODEL_KEY);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [importModel]);

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

  // Fetch models on mount and auto-load last accessed model
  useEffect(() => {
    const initializeModels = async () => {
      if (!isSupabaseConfigured()) return;

      await fetchModels();

      // Only auto-load once
      if (initialLoadDone.current) return;
      initialLoadDone.current = true;

      // Check for last accessed model
      const lastModelId = localStorage.getItem(LAST_MODEL_KEY);
      if (lastModelId) {
        console.log('Auto-loading last accessed model:', lastModelId);
        await loadModel(lastModelId);
      }
    };

    initializeModels();
  }, [fetchModels, loadModel]);

  return {
    models,
    loading,
    error,
    currentModelId,
    setCurrentModelId,
    isConfigured: isSupabaseConfigured(),
    fetchModels,
    loadModel,
    saveModel,
    saveAsModel,
    deleteModel,
    newModel,
  };
};

// Export helper to check if there's a stored model ID (for useLocalStorage)
export const hasStoredModelId = () => {
  return isSupabaseConfigured() && localStorage.getItem(LAST_MODEL_KEY) !== null;
};
