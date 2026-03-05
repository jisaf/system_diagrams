import { useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import useStore from '../store';

/**
 * Hook to manage version history for a model
 */
export const useVersionHistory = (currentModelId) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const importModel = useStore((state) => state.importModel);

  // Fetch version history for current model
  const fetchVersions = useCallback(async () => {
    if (!isSupabaseConfigured() || !currentModelId) {
      setVersions([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('model_versions')
        .select('id, created_at, saved_by')
        .eq('model_id', currentModelId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchError) {
        // Table might not exist
        if (fetchError.code === '42P01') {
          setError('Version history not set up. See SUPABASE_SETUP.md');
        } else {
          throw fetchError;
        }
        setVersions([]);
        return;
      }

      setVersions(data || []);
    } catch (err) {
      console.error('Error fetching versions:', err);
      setError(err.message);
      setVersions([]);
    } finally {
      setLoading(false);
    }
  }, [currentModelId]);

  // Restore a specific version
  const restoreVersion = useCallback(async (versionId) => {
    if (!isSupabaseConfigured() || !versionId) return false;

    setLoading(true);
    setError(null);

    try {
      // Fetch the version data
      const { data, error: fetchError } = await supabase
        .from('model_versions')
        .select('data')
        .eq('id', versionId)
        .single();

      if (fetchError) throw fetchError;

      if (data?.data) {
        // Import the version data into the store
        importModel(data.data);
        console.log('[VersionHistory] Restored version:', versionId);
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error restoring version:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [importModel]);

  return {
    versions,
    loading,
    error,
    fetchVersions,
    restoreVersion,
  };
};
