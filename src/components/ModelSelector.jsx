import { useState, useRef, useEffect } from 'react';
import { Database, ChevronDown, Save, FilePlus, Trash2, FolderOpen, Loader2, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { useModels } from '../hooks/useModels';
import { useAutoSave } from '../hooks/useAutoSave';
import useStore from '../store';

const ModelSelector = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [newName, setNewName] = useState('');
  const dropdownRef = useRef(null);

  const {
    models,
    loading,
    error,
    currentModelId,
    isConfigured,
    loadModel,
    saveModel,
    saveAsModel,
    deleteModel,
    newModel,
    fetchModels,
  } = useModels();

  const { metadata, exportModel, importModel, clearAll, setMetadata } = useStore();

  // Auto-save functionality
  const { autoSaveEnabled, toggleAutoSave, saveStatus } = useAutoSave(currentModelId, fetchModels);

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

  // Get status icon for auto-save
  const getStatusIcon = () => {
    if (loading) return <Loader2 className="w-4 h-4 animate-spin" />;
    if (saveStatus === 'saving') return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (saveStatus === 'saved') return <Check className="w-4 h-4 text-green-300" />;
    if (saveStatus === 'error') return <AlertCircle className="w-4 h-4 text-red-300" />;
    return <Database className="w-4 h-4" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm transition-colors"
        title={autoSaveEnabled && currentModelId ? 'Auto-save enabled' : 'Cloud models'}
      >
        {getStatusIcon()}
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
                {/* Auto-save toggle */}
                <div className="px-3 py-2 flex items-center justify-between">
                  <span className="text-sm text-gray-700">Auto-save</span>
                  <button
                    onClick={() => toggleAutoSave(!autoSaveEnabled)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      autoSaveEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                    } ${!currentModelId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!currentModelId}
                    title={!currentModelId ? 'Save a model first to enable auto-save' : ''}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                        autoSaveEnabled ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Models List */}
              <div className="max-h-64 overflow-y-auto">
                {error && (
                  <div className="px-3 py-2 text-sm text-red-600 bg-red-50 border-b border-red-100">
                    Error: {error}
                    <button
                      onClick={() => fetchModels()}
                      className="ml-2 underline hover:no-underline"
                    >
                      Retry
                    </button>
                  </div>
                )}
                {models.length === 0 && !error ? (
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
