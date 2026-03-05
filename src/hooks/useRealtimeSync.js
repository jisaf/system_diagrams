import { useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import useStore from '../store';

/**
 * Hook to subscribe to realtime updates for a model
 * When another client saves, we receive the update and flash changed elements
 */
export const useRealtimeSync = (currentModelId) => {
  const lastSavedHashRef = useRef(null);
  const lastUpdatedAtRef = useRef(null);
  const importModel = useStore((state) => state.importModel);
  const setFlashingElements = useStore((state) => state.setFlashingElements);

  // Compute a simple hash of model data for comparison
  const computeHash = useCallback((data) => {
    return JSON.stringify(data);
  }, []);

  // Diff two model states and return changed element IDs
  const diffModels = useCallback((oldModel, newModel) => {
    const changedIds = new Set();

    const allTypes = ['systems', 'containers', 'components', 'people', 'externalSystems', 'shadows'];

    allTypes.forEach(type => {
      const oldElements = oldModel?.[type] || [];
      const newElements = newModel?.[type] || [];

      // Create maps for comparison
      const oldMap = new Map(oldElements.map(el => [el.id, JSON.stringify(el)]));
      const newMap = new Map(newElements.map(el => [el.id, JSON.stringify(el)]));

      // Find changed or added elements
      newMap.forEach((value, id) => {
        if (oldMap.get(id) !== value) {
          changedIds.add(id);
        }
      });

      // Find deleted elements
      oldMap.forEach((_, id) => {
        if (!newMap.has(id)) {
          changedIds.add(id);
        }
      });
    });

    return Array.from(changedIds);
  }, []);

  // Handle incoming realtime update
  const handleRealtimeUpdate = useCallback((payload) => {
    console.log('[Realtime] handleRealtimeUpdate called with payload:', payload);

    if (!payload.new) {
      console.log('[Realtime] No payload.new, skipping');
      return;
    }

    const remoteData = payload.new.data;
    const remoteUpdatedAt = payload.new.updated_at;

    console.log('[Realtime] Remote data received, updated_at:', remoteUpdatedAt);

    // Skip if this is our own save (hash matches)
    const remoteHash = computeHash(remoteData);
    if (remoteHash === lastSavedHashRef.current) {
      console.log('[Realtime] Skipping - this is our own save (hash matches)');
      return;
    }

    // Skip if remote is older than our last save
    if (lastUpdatedAtRef.current && remoteUpdatedAt <= lastUpdatedAtRef.current) {
      console.log('[Realtime] Skipping - remote is older than our last save');
      return;
    }

    // Get current model for diffing
    const currentElements = {
      systems: useStore.getState().systems,
      containers: useStore.getState().containers,
      components: useStore.getState().components,
      people: useStore.getState().people,
      externalSystems: useStore.getState().externalSystems,
      shadows: useStore.getState().shadows,
    };

    // Find changed elements
    const changedIds = diffModels(currentElements, remoteData);
    console.log('[Realtime] Changed element IDs:', changedIds);

    if (changedIds.length === 0) {
      console.log('[Realtime] No changed elements detected, skipping');
      return;
    }

    // Import the new model data
    console.log('[Realtime] Importing new model data');
    importModel(remoteData);

    // Collect ancestor IDs for cascading flash - use store directly
    const ancestorIds = new Set();
    const getAncestors = (elementId) => {
      const ancestors = [];
      let current = useStore.getState().getElementById(elementId);
      while (current && current.parentId) {
        ancestors.push(current.parentId);
        current = useStore.getState().getElementById(current.parentId);
      }
      return ancestors;
    };

    changedIds.forEach(id => {
      getAncestors(id).forEach((ancestorId) => {
        ancestorIds.add(ancestorId);
      });
    });

    // Flash directly changed elements at full intensity
    console.log('[Realtime] Flashing elements:', changedIds);
    setFlashingElements(changedIds, 1.0);

    // Flash ancestors at reduced intensity (if they weren't directly changed)
    const ancestorsOnly = Array.from(ancestorIds).filter(id => !changedIds.includes(id));
    if (ancestorsOnly.length > 0) {
      console.log('[Realtime] Flashing ancestors:', ancestorsOnly);
      // Slight delay for visual effect
      setTimeout(() => {
        setFlashingElements(ancestorsOnly, 0.4);
      }, 50);
    }

    console.log('[Realtime] Applied remote update, flashed elements:', changedIds);
  }, [computeHash, diffModels, importModel, setFlashingElements]);

  // Set up subscription
  useEffect(() => {
    if (!isSupabaseConfigured() || !currentModelId) {
      console.log('[Realtime] Not subscribing - configured:', isSupabaseConfigured(), 'modelId:', currentModelId);
      return;
    }

    console.log('[Realtime] Setting up subscription for model:', currentModelId);

    const channel = supabase
      .channel(`model-${currentModelId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'models',
          filter: `id=eq.${currentModelId}`,
        },
        (payload) => {
          console.log('[Realtime] Received postgres_changes event:', payload);
          handleRealtimeUpdate(payload);
        }
      )
      .subscribe((status, err) => {
        console.log('[Realtime] Subscription status:', status);
        if (err) {
          console.error('[Realtime] Subscription error:', err);
        }
      });

    return () => {
      console.log('[Realtime] Cleaning up subscription for model:', currentModelId);
      supabase.removeChannel(channel);
    };
  }, [currentModelId, handleRealtimeUpdate]);

  // Method to update the last saved hash (called after local saves)
  const markAsSaved = useCallback((modelData, updatedAt) => {
    lastSavedHashRef.current = computeHash(modelData);
    lastUpdatedAtRef.current = updatedAt;
  }, [computeHash]);

  return { markAsSaved };
};
