import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import useStore from '../store';

// Debounce delay in milliseconds
const DEBOUNCE_DELAY = 2000;

export const useAutoSave = (currentModelId, onSaveComplete) => {
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(() => {
    // Load from localStorage
    const saved = localStorage.getItem('c4-autosave-enabled');
    return saved === 'true';
  });
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error'
  const debounceRef = useRef(null);
  const lastSaveDataRef = useRef(null);

  // Subscribe to store data that should trigger auto-save
  const systems = useStore((state) => state.systems);
  const containers = useStore((state) => state.containers);
  const components = useStore((state) => state.components);
  const people = useStore((state) => state.people);
  const externalSystems = useStore((state) => state.externalSystems);
  const shadows = useStore((state) => state.shadows);
  const relationships = useStore((state) => state.relationships);
  const metadata = useStore((state) => state.metadata);
  const exportModel = useStore((state) => state.exportModel);

  // Toggle auto-save and persist to localStorage
  const toggleAutoSave = useCallback((enabled) => {
    setAutoSaveEnabled(enabled);
    localStorage.setItem('c4-autosave-enabled', enabled ? 'true' : 'false');
  }, []);

  // Perform the actual save
  const performSave = useCallback(async () => {
    if (!isSupabaseConfigured() || !currentModelId) {
      return;
    }

    const modelData = exportModel();
    const dataString = JSON.stringify(modelData);

    // Skip if data hasn't changed since last save
    if (dataString === lastSaveDataRef.current) {
      return;
    }

    setSaveStatus('saving');

    try {
      const { error: updateError } = await supabase
        .from('models')
        .update({
          name: metadata.name,
          data: modelData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentModelId);

      if (updateError) throw updateError;

      lastSaveDataRef.current = dataString;
      setSaveStatus('saved');
      onSaveComplete?.();

      // Reset status after a delay
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Auto-save error:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [currentModelId, exportModel, metadata.name, onSaveComplete]);

  // Watch for data changes and trigger debounced save
  useEffect(() => {
    if (!autoSaveEnabled || !currentModelId || !isSupabaseConfigured()) {
      return;
    }

    // Clear any pending save
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the save
    debounceRef.current = setTimeout(() => {
      performSave();
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [
    autoSaveEnabled,
    currentModelId,
    performSave,
    // Data dependencies - changes to these trigger auto-save
    systems,
    containers,
    components,
    people,
    externalSystems,
    shadows,
    relationships,
  ]);

  // Reset lastSaveDataRef when model changes
  useEffect(() => {
    lastSaveDataRef.current = null;
  }, [currentModelId]);

  return {
    autoSaveEnabled,
    toggleAutoSave,
    saveStatus,
  };
};
