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
