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
  const getAllElements = useStore((state) => state.getAllElements);
  const getElementById = useStore((state) => state.getElementById);

  // Compute a simple hash of model data for comparison
  const computeHash = useCallback((data) => {
    return JSON.stringify(data);
  }, []);

  // Find all ancestor IDs for an element
  const getAncestorIds = useCallback((elementId) => {
    const ancestors = [];
    let current = getElementById(elementId);
    while (current && current.parentId) {
      ancestors.push(current.parentId);
      current = getElementById(current.parentId);
    }
    return ancestors;
  }, [getElementById]);

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
    if (!payload.new) return;

    const remoteData = payload.new.data;
    const remoteUpdatedAt = payload.new.updated_at;

    // Skip if this is our own save (hash matches)
    const remoteHash = computeHash(remoteData);
    if (remoteHash === lastSavedHashRef.current) {
      return;
    }

    // Skip if remote is older than our last save
    if (lastUpdatedAtRef.current && remoteUpdatedAt <= lastUpdatedAtRef.current) {
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

    if (changedIds.length === 0) return;

    // Import the new model data
    importModel(remoteData);

    // Collect ancestor IDs for cascading flash
    const ancestorIds = new Set();
    changedIds.forEach(id => {
      getAncestorIds(id).forEach((ancestorId, index) => {
        ancestorIds.add(ancestorId);
      });
    });

    // Flash directly changed elements at full intensity
    setFlashingElements(changedIds, 1.0);

    // Flash ancestors at reduced intensity (if they weren't directly changed)
    const ancestorsOnly = Array.from(ancestorIds).filter(id => !changedIds.includes(id));
    if (ancestorsOnly.length > 0) {
      // Slight delay for visual effect
      setTimeout(() => {
        setFlashingElements(ancestorsOnly, 0.4);
      }, 50);
    }

    console.log('[Realtime] Applied remote update, flashed elements:', changedIds);
  }, [computeHash, diffModels, importModel, setFlashingElements, getAncestorIds]);

  // Set up subscription
  useEffect(() => {
    if (!isSupabaseConfigured() || !currentModelId) {
      return;
    }

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
        handleRealtimeUpdate
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    return () => {
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
