# Gantt Chart & Timeline Phases Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add timeline phases to elements and a Gantt chart view for project timeline visualization.

**Architecture:** Phases stored as array on each element. New GanttView component renders hierarchical timeline. PhaseEditor component in PropertiesPanel for editing phases. View mode switcher extended with Gantt option.

**Tech Stack:** React, Zustand, Tailwind CSS, Lucide icons

---

## Task 1: Add Phases to Store Schema

**Files:**
- Modify: `src/store.js`

**Step 1: Update addElement to initialize phases**

In `src/store.js`, find the `addElement` action and add `phases: []` to the default element:

```javascript
// In addElement action, around line 215
addElement: (type, element) => {
  const state = get();
  const newElement = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    parentId: state.currentParentId,
    phases: [],  // ADD THIS LINE
    ...element,
  };
  // ... rest unchanged
```

**Step 2: Verify exportModel includes phases**

The `exportModel` function already exports all element properties, so phases will be included automatically.

**Step 3: Commit**

```bash
git add src/store.js
git commit -m "feat(store): add phases array to element schema"
```

---

## Task 2: Create PhaseEditor Component

**Files:**
- Create: `src/components/PhaseEditor.jsx`

**Step 1: Create the PhaseEditor component**

```jsx
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
```

**Step 2: Commit**

```bash
git add src/components/PhaseEditor.jsx
git commit -m "feat(components): create PhaseEditor component for timeline phases"
```

---

## Task 3: Integrate PhaseEditor into PropertiesPanel

**Files:**
- Modify: `src/components/PropertiesPanel.jsx`

**Step 1: Import PhaseEditor**

At the top of `PropertiesPanel.jsx`, add:

```jsx
import PhaseEditor from './PhaseEditor';
```

**Step 2: Add phase change handler**

Inside the component, after `handleSave`, add:

```jsx
const handlePhasesChange = (newPhases) => {
  if (selectedElement) {
    updateElement(selectedElement.type, selectedElement.id, { phases: newPhases });
  }
};
```

**Step 3: Add PhaseEditor to the JSX**

Find the Owners Section closing `</div>` (around line 543) and add PhaseEditor after it, before the Position section:

```jsx
            </div>

            {/* Timeline Phases */}
            <PhaseEditor
              phases={selectedElement.phases || []}
              onChange={handlePhasesChange}
            />
          </>
        )}

        {/* Position */}
```

**Step 4: Commit**

```bash
git add src/components/PropertiesPanel.jsx
git commit -m "feat(properties): integrate PhaseEditor into PropertiesPanel"
```

---

## Task 4: Create GanttView Component

**Files:**
- Create: `src/components/GanttView.jsx`

**Step 1: Create the GanttView component**

```jsx
import { useMemo, useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Server, Box, Component, User, ExternalLink } from 'lucide-react';
import useStore from '../store';

// Phase colors
const PHASE_COLORS = {
  'Discovery': 'bg-blue-500',
  'Design': 'bg-purple-500',
  'Build': 'bg-green-500',
  'Testing': 'bg-orange-500',
  'Deployment': 'bg-teal-500',
  'Maintenance': 'bg-gray-500',
};

const getPhaseColor = (phaseName) => {
  return PHASE_COLORS[phaseName] || 'bg-slate-500';
};

const getIcon = (type) => {
  const iconClass = 'w-4 h-4';
  switch (type) {
    case 'system': return <Server className={iconClass} />;
    case 'container': return <Box className={iconClass} />;
    case 'component': return <Component className={iconClass} />;
    case 'person': return <User className={iconClass} />;
    case 'externalSystem': return <ExternalLink className={iconClass} />;
    default: return <Box className={iconClass} />;
  }
};

const GanttView = () => {
  const getAllElements = useStore((state) => state.getAllElements);
  const setSelectedElement = useStore((state) => state.setSelectedElement);
  const setViewMode = useStore((state) => state.setViewMode);
  const navigateTo = useStore((state) => state.navigateTo);
  const navigateToRoot = useStore((state) => state.navigateToRoot);

  const [collapsedIds, setCollapsedIds] = useState(new Set());

  const elements = getAllElements().filter((el) => el.type !== 'shadow');

  // Build hierarchy
  const { tree, dateRange } = useMemo(() => {
    const childrenMap = new Map();
    const rootElements = [];

    elements.forEach((el) => {
      if (!el.parentId) {
        rootElements.push(el);
      } else {
        if (!childrenMap.has(el.parentId)) {
          childrenMap.set(el.parentId, []);
        }
        childrenMap.get(el.parentId).push(el);
      }
    });

    // Calculate date range from all phases
    let minDate = null;
    let maxDate = null;

    elements.forEach((el) => {
      (el.phases || []).forEach((phase) => {
        if (!minDate || phase.startMonth < minDate) minDate = phase.startMonth;
        if (!maxDate || phase.endMonth > maxDate) maxDate = phase.endMonth;
      });
    });

    // Default to current year if no phases
    if (!minDate) {
      const now = new Date();
      minDate = `${now.getFullYear()}-01`;
      maxDate = `${now.getFullYear()}-12`;
    }

    // Build flat list with depth info
    const flattenTree = (items, depth = 0) => {
      let result = [];
      items.forEach((item) => {
        result.push({ ...item, depth });
        const children = childrenMap.get(item.id) || [];
        if (children.length > 0 && !collapsedIds.has(item.id)) {
          result = result.concat(flattenTree(children, depth + 1));
        }
      });
      return result;
    };

    return {
      tree: flattenTree(rootElements),
      dateRange: { minDate, maxDate },
      childrenMap,
    };
  }, [elements, collapsedIds]);

  // Generate months array for timeline header
  const months = useMemo(() => {
    if (!dateRange.minDate || !dateRange.maxDate) return [];

    const result = [];
    let [year, month] = dateRange.minDate.split('-').map(Number);
    const [endYear, endMonth] = dateRange.maxDate.split('-').map(Number);

    while (year < endYear || (year === endYear && month <= endMonth)) {
      result.push({ year, month, key: `${year}-${String(month).padStart(2, '0')}` });
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
    return result;
  }, [dateRange]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const toggleCollapse = (id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRowClick = (element) => {
    setSelectedElement(element);
  };

  const handleRowDoubleClick = (element) => {
    // Navigate to element's parent context, then switch to edit mode
    const targetParentId = element.parentId || null;
    if (targetParentId) {
      navigateTo(targetParentId);
    } else {
      navigateToRoot();
    }
    setViewMode('edit');
  };

  // Check if element has children
  const hasChildren = (elementId) => {
    return elements.some((el) => el.parentId === elementId);
  };

  // Calculate bar position and width
  const getBarStyle = (phase) => {
    if (!phase.startMonth || !phase.endMonth || months.length === 0) return null;

    const startIdx = months.findIndex((m) => m.key === phase.startMonth);
    const endIdx = months.findIndex((m) => m.key === phase.endMonth);

    if (startIdx === -1 || endIdx === -1) return null;

    const left = (startIdx / months.length) * 100;
    const width = ((endIdx - startIdx + 1) / months.length) * 100;

    return { left: `${left}%`, width: `${width}%` };
  };

  return (
    <div className="flex-1 h-full bg-white overflow-auto">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="flex border-b border-gray-300 bg-gray-50 sticky top-0 z-10">
          <div className="w-64 flex-shrink-0 px-4 py-2 font-semibold text-sm text-gray-700 border-r border-gray-300">
            Element
          </div>
          <div className="flex-1 flex">
            {months.map((m) => (
              <div
                key={m.key}
                className="flex-1 px-1 py-2 text-xs text-center text-gray-600 border-r border-gray-200"
                style={{ minWidth: '40px' }}
              >
                <div>{monthNames[m.month - 1]}</div>
                <div className="text-gray-400">{m.year}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {tree.map((element) => (
          <div
            key={element.id}
            className="flex border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
            onClick={() => handleRowClick(element)}
            onDoubleClick={() => handleRowDoubleClick(element)}
          >
            {/* Element name column */}
            <div
              className="w-64 flex-shrink-0 px-4 py-2 flex items-center gap-2 border-r border-gray-200"
              style={{ paddingLeft: `${16 + element.depth * 16}px` }}
            >
              {hasChildren(element.id) ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapse(element.id);
                  }}
                  className="p-0.5 hover:bg-gray-200 rounded"
                >
                  {collapsedIds.has(element.id) ? (
                    <ChevronRight className="w-3 h-3 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-gray-500" />
                  )}
                </button>
              ) : (
                <span className="w-4" />
              )}
              <span className="text-gray-500">{getIcon(element.type)}</span>
              <span className="text-sm truncate">{element.name || 'Unnamed'}</span>
            </div>

            {/* Timeline column */}
            <div className="flex-1 relative py-1">
              {(element.phases || []).map((phase) => {
                const style = getBarStyle(phase);
                if (!style) return null;
                return (
                  <div
                    key={phase.id}
                    className={`absolute top-1 bottom-1 ${getPhaseColor(phase.name)} rounded text-xs text-white flex items-center px-2 overflow-hidden`}
                    style={style}
                    title={`${phase.name}: ${phase.startMonth} → ${phase.endMonth}`}
                  >
                    <span className="truncate">{phase.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {tree.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No elements with timeline data. Add phases to elements in the Properties panel.
          </div>
        )}
      </div>
    </div>
  );
};

export default GanttView;
```

**Step 2: Commit**

```bash
git add src/components/GanttView.jsx
git commit -m "feat(components): create GanttView component for timeline visualization"
```

---

## Task 5: Add Gantt View Mode to Header

**Files:**
- Modify: `src/components/Header.jsx`

**Step 1: Import BarChart3 icon**

Update the lucide-react import at the top:

```jsx
import { Download, Upload, FileJson, FileImage, FileCode, FileText, Share2, Check, AlertCircle, Eye, GitBranch, Table, BarChart3 } from 'lucide-react';
```

**Step 2: Add Gantt button to view mode toggle**

Find the view mode toggle section (around line 420-444) and add the Gantt button after the Tree button:

```jsx
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
              <button
                onClick={() => setViewMode('edit')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${
                  viewMode === 'edit'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Edit mode - navigate and edit elements"
              >
                <Eye className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => setViewMode('tree')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${
                  viewMode === 'tree'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Tree view - see full hierarchy"
              >
                <GitBranch className="w-4 h-4" />
                Tree
              </button>
              <button
                onClick={() => setViewMode('gantt')}
                className={`flex items-center gap-1 px-3 py-1.5 rounded text-sm transition-colors ${
                  viewMode === 'gantt'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
                title="Gantt view - see project timeline"
              >
                <BarChart3 className="w-4 h-4" />
                Gantt
              </button>
            </div>
```

**Step 3: Commit**

```bash
git add src/components/Header.jsx
git commit -m "feat(header): add Gantt view mode button"
```

---

## Task 6: Integrate GanttView into App.jsx

**Files:**
- Modify: `src/App.jsx`

**Step 1: Import GanttView**

Add to imports at the top:

```jsx
import GanttView from './components/GanttView';
```

**Step 2: Add GanttView to the view rendering**

Find the main canvas area (around line 365-408) and update the conditional rendering:

```jsx
        {/* Main Canvas Area */}
        <div className="flex-1 relative">
          {viewMode === 'tree' ? (
            <TreeView />
          ) : viewMode === 'gantt' ? (
            <GanttView />
          ) : (
            <ReactFlow
              // ... existing ReactFlow props
            >
              {/* ... existing children */}
            </ReactFlow>
          )}
        </div>
```

**Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat(app): integrate GanttView into main app"
```

---

## Task 7: Build and Deploy

**Step 1: Build the application**

```bash
npm run build
```

Expected: Build completes without errors.

**Step 2: Build standalone version**

```bash
npm run build:standalone
```

Expected: Standalone HTML created successfully.

**Step 3: Commit and push**

```bash
git add docs/index.html
git commit -m "build: deploy Gantt chart feature"
git push origin main
```

---

## Summary

After completing all tasks, you will have:

1. **Phases data model** - Each element can have an array of phases with name, startMonth, endMonth
2. **PhaseEditor component** - UI for adding/removing phases in Properties Panel
3. **GanttView component** - Full timeline visualization with:
   - Hierarchical collapsible element list
   - Month-based timeline with colored bars
   - Click to select, double-click to navigate
   - Phase tooltips on hover
4. **View mode switcher** - Edit / Tree / Gantt buttons in header
