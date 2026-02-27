import { useState } from 'react';
import { Plus, X } from 'lucide-react';

const DEFAULT_PHASES = [
  'Discovery',
  'Design',
  'Build',
  'Testing',
  'Deployment',
  'Maintenance',
];

const PhaseEditor = ({ phases = [], onChange }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPhase, setNewPhase] = useState({
    name: '',
    startMonth: '',
    endMonth: '',
  });

  const handleAddPhase = () => {
    if (!newPhase.name || !newPhase.startMonth || !newPhase.endMonth) return;

    const phase = {
      id: `phase-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newPhase.name,
      startMonth: newPhase.startMonth,
      endMonth: newPhase.endMonth,
    };

    onChange([...phases, phase]);
    setNewPhase({ name: '', startMonth: '', endMonth: '' });
    setShowAddForm(false);
  };

  const handleDeletePhase = (phaseId) => {
    onChange(phases.filter(p => p.id !== phaseId));
  };

  const formatMonth = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
  };

  const isValidDateRange = newPhase.startMonth && newPhase.endMonth && newPhase.startMonth <= newPhase.endMonth;

  return (
    <div className="pt-4 border-t border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs font-semibold text-gray-600 uppercase">
          Timeline
        </label>
        <button
          onClick={() => setShowAddForm(true)}
          className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-gray-700"
          title="Add phase"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Existing phases */}
      <div className="space-y-2 mb-3">
        {phases.length === 0 && !showAddForm && (
          <p className="text-xs text-gray-400 italic">No phases defined</p>
        )}
        {phases.map((phase) => (
          <div
            key={phase.id}
            className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded text-sm"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-800 truncate">{phase.name}</div>
              <div className="text-xs text-gray-500">
                {formatMonth(phase.startMonth)} → {formatMonth(phase.endMonth)}
              </div>
            </div>
            <button
              onClick={() => handleDeletePhase(phase.id)}
              className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Add phase form */}
      {showAddForm && (
        <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
          <div className="mb-2">
            <label className="block text-xs text-gray-600 mb-1">Phase Name</label>
            <input
              type="text"
              list="phase-suggestions"
              value={newPhase.name}
              onChange={(e) => setNewPhase({ ...newPhase, name: e.target.value })}
              placeholder="e.g., Discovery"
              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="phase-suggestions">
              {DEFAULT_PHASES.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Start</label>
              <input
                type="month"
                value={newPhase.startMonth}
                onChange={(e) => setNewPhase({ ...newPhase, startMonth: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">End</label>
              <input
                type="month"
                value={newPhase.endMonth}
                onChange={(e) => setNewPhase({ ...newPhase, endMonth: e.target.value })}
                className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {newPhase.startMonth && newPhase.endMonth && !isValidDateRange && (
            <p className="text-xs text-red-600 mb-2">End month must be after start month</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleAddPhase}
              disabled={!newPhase.name || !isValidDateRange}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewPhase({ name: '', startMonth: '', endMonth: '' });
              }}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhaseEditor;
