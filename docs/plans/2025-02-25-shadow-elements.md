# Shadow Elements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add shadow elements that act as references/portals to elements elsewhere in the hierarchy, navigating to the target's location on double-click.

**Architecture:**
1. Add `shadows` array to store with `type: 'shadow'` and `targetId` field
2. Create ShadowNode component with dashed/faded styling and link icon
3. Modify double-click handler to navigate to target's parent context
4. Add shadow to Toolbar and create target picker in PropertiesPanel

**Tech Stack:** React, Zustand, React Flow, Tailwind CSS

---

## Task 1: Add Shadow Type to Store

**Files:**
- Modify: `/tmp/system_diagrams/src/store.js`

**Step 1: Add shadow to type mapping**

In `getPropertyName`, add shadow mapping:

```javascript
const getPropertyName = (type) => {
  const mapping = {
    'system': 'systems',
    'container': 'containers',
    'component': 'components',
    'person': 'people',
    'externalSystem': 'externalSystems',
    'shadow': 'shadows',
  };
  return mapping[type] || `${type}s`;
};
```

**Step 2: Add shadows array to state**

After `externalSystems: [],` add:

```javascript
shadows: [],
```

**Step 3: Update getAllElements to include shadows**

```javascript
getAllElements: () => {
  const state = get();
  return [
    ...state.systems,
    ...state.containers,
    ...state.components,
    ...state.people,
    ...state.externalSystems,
    ...state.shadows,
  ];
},
```

**Step 4: Update clearAll to include shadows**

Add `shadows: [],` to the clearAll set() call.

**Step 5: Update importModel to include shadows**

Add `shadows: model.shadows || [],` to the importModel set() call.

**Step 6: Update exportModel to include shadows**

Add `shadows: state.shadows,` to the exportModel return object.

**Step 7: Add helper to get element path for search**

Add this new function after `getChildCount`:

```javascript
// Get the full path of an element (for search display)
getElementPath: (elementId) => {
  const state = get();
  const path = [];
  let current = state.getElementById(elementId);

  while (current) {
    path.unshift(current.name || current.id);
    if (current.parentId) {
      current = state.getElementById(current.parentId);
    } else {
      break;
    }
  }

  return path.join(' / ');
},
```

**Step 8: Commit**

```bash
git add src/store.js
git commit -m "feat(store): add shadow element type with path helper"
```

---

## Task 2: Create ShadowNode Component

**Files:**
- Create: `/tmp/system_diagrams/src/components/ShadowNode.jsx`

**Step 1: Create the component**

```jsx
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Link2, User, Box, Component, Server, ExternalLink } from 'lucide-react';
import useStore from '../store';

const ShadowNode = ({ data, selected }) => {
  const getElementById = useStore((state) => state.getElementById);
  const target = getElementById(data.targetId);

  const getTargetIcon = () => {
    const iconClass = 'w-5 h-5';
    if (!target) return <Link2 className={iconClass} />;

    switch (target.type) {
      case 'system':
        return <Server className={iconClass} />;
      case 'container':
        return <Box className={iconClass} />;
      case 'component':
        return <Component className={iconClass} />;
      case 'person':
        return <User className={iconClass} />;
      case 'externalSystem':
        return <ExternalLink className={iconClass} />;
      default:
        return <Link2 className={iconClass} />;
    }
  };

  const getTargetTypeLabel = () => {
    if (!target) return 'Shadow (broken link)';

    const labels = {
      system: 'Software System',
      container: 'Container',
      component: 'Component',
      person: 'Person',
      externalSystem: 'External System',
    };
    return `Shadow → ${labels[target.type] || target.type}`;
  };

  // Shared handle styles
  const handleStyle = "!w-4 !h-4 !bg-slate-400 hover:!bg-blue-500 !border-2 !border-white transition-colors duration-150 cursor-crosshair";

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 border-dashed min-w-[200px] shadow-lg transition-all
        ${target ? 'bg-slate-50/50 border-slate-400' : 'bg-red-50/50 border-red-400'}
        ${selected ? 'ring-4 ring-blue-400' : ''} relative`}
    >
      <Handle type="target" position={Position.Top} id="top" className={handleStyle} />

      <div className="flex items-start gap-2 opacity-70">
        <div className="mt-1">{getTargetIcon()}</div>
        <div className="flex-1">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            {getTargetTypeLabel()}
          </div>
          <div className="font-bold text-gray-700 mb-1">
            {target?.name || 'Select target...'}
          </div>
          {target?.technology && (
            <div className="text-xs text-gray-500 italic mb-1">
              [{target.technology}]
            </div>
          )}
          {target?.description && (
            <div className="text-xs text-gray-600 mt-2">
              {target.description}
            </div>
          )}
        </div>
      </div>

      {/* Link badge */}
      <div className="absolute top-2 right-2">
        <Link2 className="w-4 h-4 text-slate-400" />
      </div>

      <Handle type="source" position={Position.Bottom} id="bottom" className={handleStyle} />
      <Handle type="source" position={Position.Right} id="right" className={handleStyle} />
      <Handle type="target" position={Position.Left} id="left" className={handleStyle} />
    </div>
  );
};

export default memo(ShadowNode);
```

**Step 2: Commit**

```bash
git add src/components/ShadowNode.jsx
git commit -m "feat(ui): add ShadowNode component with dashed styling"
```

---

## Task 3: Register ShadowNode in App.jsx

**Files:**
- Modify: `/tmp/system_diagrams/src/App.jsx`

**Step 1: Import ShadowNode**

After the C4Node import, add:

```javascript
import ShadowNode from './components/ShadowNode';
```

**Step 2: Add to nodeTypes**

Update nodeTypes to:

```javascript
const nodeTypes = {
  c4Node: C4Node,
  shadowNode: ShadowNode,
};
```

**Step 3: Update node mapping in useEffect**

Find the useEffect that creates nodes and update the mapping to use different node type for shadows:

```javascript
const newNodes = elements.map((el) => ({
  id: el.id,
  type: el.type === 'shadow' ? 'shadowNode' : 'c4Node',
  position: el.position || { x: Math.random() * 400, y: Math.random() * 300 },
  data: {
```

**Step 4: Update double-click handler to navigate to shadow target**

Find the `onNodeDoubleClick` handler and update it to handle shadows:

```javascript
const onNodeDoubleClick = useCallback((event, node) => {
  const element = getAllElements().find(el => el.id === node.id);
  if (!element) return;

  // If it's a shadow, navigate to the target's parent context
  if (element.type === 'shadow' && element.targetId) {
    const target = getAllElements().find(el => el.id === element.targetId);
    if (target) {
      // Navigate to where the target lives (its parent, or root if no parent)
      const targetParentId = target.parentId || null;

      // Use navigateTo if target has a parent, otherwise navigateToRoot
      if (targetParentId) {
        navigateTo(targetParentId);
      } else {
        navigateToRoot();
      }
      return;
    }
  }

  // Normal behavior: navigate into the element
  navigateInto(node.id);
}, [getAllElements, navigateInto, navigateTo, navigateToRoot]);
```

Also add `navigateTo` to the destructured store functions.

**Step 5: Commit**

```bash
git add src/App.jsx
git commit -m "feat(app): register ShadowNode and handle double-click navigation"
```

---

## Task 4: Add Shadow to Toolbar

**Files:**
- Modify: `/tmp/system_diagrams/src/components/Toolbar.jsx`

**Step 1: Import Link2 icon**

Update the lucide-react import:

```javascript
import { Server, Box, Component, User, ExternalLink, Link2 } from 'lucide-react';
```

**Step 2: Add shadow to tools array**

After the externalSystem tool, add:

```javascript
{
  type: 'shadow',
  icon: Link2,
  label: 'Shadow (Reference)',
  color: 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-dashed',
},
```

**Step 3: Update getValidElementTypes to include shadow at all levels**

Shadow elements should be available everywhere. Update each case to include 'shadow':

```javascript
const getValidElementTypes = () => {
  if (currentParentId === null) {
    // Root view - can add systems, people, external systems, shadows
    return ['system', 'person', 'externalSystem', 'shadow'];
  }

  const parent = getElementById(currentParentId);
  if (!parent) return ['system', 'person', 'externalSystem', 'shadow'];

  switch (parent.type) {
    case 'system':
      return ['container', 'person', 'shadow'];
    case 'container':
      return ['component', 'shadow'];
    case 'component':
      return ['component', 'shadow'];
    default:
      return ['shadow'];
  }
};
```

**Step 4: Commit**

```bash
git add src/components/Toolbar.jsx
git commit -m "feat(toolbar): add shadow element type to all levels"
```

---

## Task 5: Add Target Picker to PropertiesPanel

**Files:**
- Modify: `/tmp/system_diagrams/src/components/PropertiesPanel.jsx`

**Step 1: Add state for search and target selection**

After the existing useState calls, add:

```javascript
const [targetSearch, setTargetSearch] = useState('');
const [showTargetPicker, setShowTargetPicker] = useState(false);
```

**Step 2: Get store functions for shadows**

Update the useStore destructure to include:

```javascript
const {
  selectedElement,
  selectedEdge,
  setSelectedElement,
  setSelectedEdge,
  updateElement,
  deleteElement,
  updateRelationship,
  deleteRelationship,
  getAllElements,
  getElementPath,
} = useStore();
```

**Step 3: Add shadow-specific form handling**

Add new state for shadow target:

```javascript
const [shadowTargetId, setShadowTargetId] = useState('');
```

Update the useEffect that sets formData to also handle shadows:

```javascript
useEffect(() => {
  if (selectedElement && selectedElement.id) {
    // ... existing code ...

    // Set shadow target
    if (selectedElement.type === 'shadow') {
      setShadowTargetId(selectedElement.targetId || '');
    }
  }
}, [selectedElement?.id]);
```

**Step 4: Add filtered elements for search**

Before the return statement, add:

```javascript
// Get all elements except shadows for target picker
const allTargetableElements = getAllElements().filter(el => el.type !== 'shadow');

// Filter by search term (matches path)
const filteredElements = targetSearch
  ? allTargetableElements.filter(el => {
      const path = getElementPath(el.id).toLowerCase();
      return path.includes(targetSearch.toLowerCase());
    })
  : allTargetableElements;
```

**Step 5: Add shadow properties UI**

Add this section right after the element Type display, before the ID field (around line 280-290):

```jsx
{/* Shadow Target Picker - only for shadow type */}
{selectedElement.type === 'shadow' && (
  <div className="mb-4">
    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
      Target Element
    </label>

    {/* Current target display */}
    {shadowTargetId && (
      <div className="mb-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded text-sm">
        <div className="font-medium text-blue-900">
          {getAllElements().find(el => el.id === shadowTargetId)?.name || 'Unknown'}
        </div>
        <div className="text-xs text-blue-600">
          {getElementPath(shadowTargetId)}
        </div>
      </div>
    )}

    {/* Search input */}
    <div className="relative">
      <input
        type="text"
        value={targetSearch}
        onChange={(e) => {
          setTargetSearch(e.target.value);
          setShowTargetPicker(true);
        }}
        onFocus={() => setShowTargetPicker(true)}
        placeholder="Search elements by path..."
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Dropdown */}
      {showTargetPicker && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {filteredElements.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No elements found</div>
          ) : (
            filteredElements.slice(0, 20).map((el) => (
              <div
                key={el.id}
                onClick={() => {
                  setShadowTargetId(el.id);
                  setTargetSearch('');
                  setShowTargetPicker(false);
                  updateElement('shadow', selectedElement.id, { targetId: el.id });
                }}
                className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                  el.id === shadowTargetId ? 'bg-blue-50' : ''
                }`}
              >
                <div className="text-sm font-medium">{el.name || el.id}</div>
                <div className="text-xs text-gray-500">{getElementPath(el.id)}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>

    {/* Manual ID input */}
    <div className="mt-2">
      <input
        type="text"
        value={shadowTargetId}
        onChange={(e) => {
          setShadowTargetId(e.target.value);
          updateElement('shadow', selectedElement.id, { targetId: e.target.value });
        }}
        placeholder="Or paste element ID directly..."
        className="w-full px-3 py-2 border border-gray-300 rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  </div>
)}
```

**Step 6: Hide name/description fields for shadows**

Wrap the Name, Technology, Description, Tags, and Owners sections in a condition:

```jsx
{selectedElement.type !== 'shadow' && (
  <>
    {/* Name */}
    ...
    {/* Technology */}
    ...
    {/* Description */}
    ...
    {/* Tags */}
    ...
    {/* Owners Section */}
    ...
  </>
)}
```

**Step 7: Close picker when clicking outside**

Add useEffect for click-outside detection:

```javascript
useEffect(() => {
  const handleClickOutside = () => setShowTargetPicker(false);
  if (showTargetPicker) {
    // Small delay to allow click on picker items
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
    };
  }
}, [showTargetPicker]);
```

**Step 8: Commit**

```bash
git add src/components/PropertiesPanel.jsx
git commit -m "feat(properties): add target picker for shadow elements"
```

---

## Task 6: Update useLocalStorage to include shadows

**Files:**
- Modify: `/tmp/system_diagrams/src/hooks/useLocalStorage.js`

**Step 1: Add shadows to sanitizeModel**

Find the sanitizeModel function and add shadows handling:

```javascript
shadows: (model.shadows || []).map(sanitizeElement),
```

**Step 2: Commit**

```bash
git add src/hooks/useLocalStorage.js
git commit -m "feat(storage): persist shadow elements in localStorage"
```

---

## Task 7: Build and Test

**Step 1: Build the project**

```bash
cd /tmp/system_diagrams && npm run build
```

Expected: Build succeeds with no errors

**Step 2: Build standalone**

```bash
npm run build:standalone
```

Expected: Standalone HTML created successfully

**Step 3: Commit final build**

```bash
git add docs/index.html
git commit -m "build: update standalone with shadow elements"
```

**Step 4: Push to GitHub**

```bash
git push origin main
```

---

## Summary

After completing all tasks:

1. **Shadow element type** - New element stored in `shadows` array
2. **Visual styling** - Dashed border, faded appearance, link icon badge
3. **Target picker** - Searchable dropdown with fuzzy path matching
4. **Navigation** - Double-click navigates to target's parent context
5. **Persistence** - Shadows saved to localStorage and Supabase
