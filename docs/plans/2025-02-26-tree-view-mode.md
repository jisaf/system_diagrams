# Tree View Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a non-destructive tree view mode that shows the full hierarchy flattened, with navigation links back to edit mode.

**Architecture:**
1. Add `viewMode` state to store ('edit' | 'tree')
2. Create TreeView component that renders all elements as a hierarchical tree with parent-child edges
3. Replace the Layout menu with a View toggle, keeping tree view read-only
4. Each node in tree view has a "link out" button that switches to edit mode at that element's location

**Tech Stack:** React, Zustand, React Flow, Tailwind CSS

---

## Task 1: Add View Mode State to Store

**Files:**
- Modify: `/tmp/system_diagrams/src/store.js`

**Step 1: Add viewMode state**

After `currentLevel: 'context',` (around line 27), add:

```javascript
// View mode: 'edit' for normal editing, 'tree' for hierarchical overview
viewMode: 'edit',
```

**Step 2: Add setViewMode action**

After `setCurrentLevel: (level) => set({ currentLevel: level }),` add:

```javascript
setViewMode: (mode) => set({ viewMode: mode }),
```

**Step 3: Commit**

```bash
cd /tmp/system_diagrams && git add src/store.js && git commit -m "feat(store): add viewMode state for tree view toggle"
```

---

## Task 2: Create TreeViewNode Component

**Files:**
- Create: `/tmp/system_diagrams/src/components/TreeViewNode.jsx`

**Step 1: Create the component**

This is a simplified read-only node for tree view with a "go to" link button:

```jsx
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { User, Box, Component, Server, ExternalLink, ExternalLinkIcon } from 'lucide-react';
import useStore from '../store';

const TreeViewNode = ({ data }) => {
  const setViewMode = useStore((state) => state.setViewMode);
  const navigateTo = useStore((state) => state.navigateTo);

  const getIcon = () => {
    const iconClass = 'w-4 h-4';
    switch (data.type) {
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
        return <Box className={iconClass} />;
    }
  };

  const getNodeStyle = () => {
    const base = 'px-3 py-2 rounded border min-w-[150px] text-sm';
    switch (data.type) {
      case 'system':
        return `${base} bg-blue-50 border-blue-300`;
      case 'container':
        return `${base} bg-green-50 border-green-300`;
      case 'component':
        return `${base} bg-yellow-50 border-yellow-300`;
      case 'person':
        return `${base} bg-purple-50 border-purple-300`;
      case 'externalSystem':
        return `${base} bg-gray-50 border-gray-300`;
      default:
        return `${base} bg-white border-gray-200`;
    }
  };

  const handleGoToElement = (e) => {
    e.stopPropagation();
    // Navigate to the parent context where this element lives
    const targetParentId = data.parentId || null;
    if (targetParentId) {
      navigateTo(targetParentId);
    } else {
      // Element is at root, navigate to root
      useStore.getState().navigateToRoot();
    }
    // Switch to edit mode
    setViewMode('edit');
  };

  return (
    <div className={`${getNodeStyle()} relative`}>
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2 !h-2 !bg-gray-400 !border-0"
      />

      <div className="flex items-center gap-2">
        {getIcon()}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-gray-900 truncate">
            {data.name || 'Unnamed'}
          </div>
          <div className="text-xs text-gray-500 capitalize">
            {data.type}
          </div>
        </div>

        {/* Go to element button */}
        <button
          onClick={handleGoToElement}
          className="p-1 hover:bg-white/50 rounded transition-colors"
          title="Go to this element in edit mode"
        >
          <ExternalLinkIcon className="w-3 h-3 text-gray-400 hover:text-blue-500" />
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-gray-400 !border-0"
      />
    </div>
  );
};

export default memo(TreeViewNode);
```

**Step 2: Commit**

```bash
cd /tmp/system_diagrams && git add src/components/TreeViewNode.jsx && git commit -m "feat(ui): add TreeViewNode component with go-to button"
```

---

## Task 3: Create TreeView Component

**Files:**
- Create: `/tmp/system_diagrams/src/components/TreeView.jsx`

**Step 1: Create the tree view canvas**

```jsx
import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
} from '@xyflow/react';
import useStore from '../store';
import TreeViewNode from './TreeViewNode';

const nodeTypes = {
  treeNode: TreeViewNode,
};

// Build hierarchical tree layout
const buildTreeLayout = (elements) => {
  // Separate root elements and build parent-child map
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

  const nodes = [];
  const edges = [];

  const NODE_WIDTH = 180;
  const NODE_HEIGHT = 60;
  const HORIZONTAL_SPACING = 220;
  const VERTICAL_SPACING = 100;

  // Calculate subtree width recursively
  const getSubtreeWidth = (elementId) => {
    const children = childrenMap.get(elementId) || [];
    if (children.length === 0) return NODE_WIDTH;

    let totalWidth = 0;
    children.forEach((child, index) => {
      if (index > 0) totalWidth += 40; // gap between siblings
      totalWidth += getSubtreeWidth(child.id);
    });

    return Math.max(NODE_WIDTH, totalWidth);
  };

  // Position nodes recursively
  const positionNode = (element, x, y, depth = 0) => {
    nodes.push({
      id: element.id,
      type: 'treeNode',
      position: { x, y },
      data: {
        ...element,
        label: element.name,
      },
      draggable: false,
      selectable: false,
    });

    const children = childrenMap.get(element.id) || [];
    if (children.length === 0) return;

    // Calculate total width needed for children
    let totalChildrenWidth = 0;
    const childWidths = children.map((child) => {
      const width = getSubtreeWidth(child.id);
      totalChildrenWidth += width;
      return width;
    });
    totalChildrenWidth += (children.length - 1) * 40; // gaps

    // Position children centered below parent
    let currentX = x + NODE_WIDTH / 2 - totalChildrenWidth / 2;

    children.forEach((child, index) => {
      const childX = currentX + childWidths[index] / 2 - NODE_WIDTH / 2;
      const childY = y + VERTICAL_SPACING;

      // Create edge from parent to child
      edges.push({
        id: `edge-${element.id}-${child.id}`,
        source: element.id,
        target: child.id,
        type: 'smoothstep',
        style: { stroke: '#94a3b8', strokeWidth: 1 },
      });

      positionNode(child, childX, childY, depth + 1);

      currentX += childWidths[index] + 40;
    });
  };

  // Position all root elements
  let currentRootX = 50;
  rootElements.forEach((root) => {
    const subtreeWidth = getSubtreeWidth(root.id);
    positionNode(root, currentRootX, 50);
    currentRootX += subtreeWidth + 80;
  });

  return { nodes, edges };
};

const TreeView = () => {
  const getAllElements = useStore((state) => state.getAllElements);
  const elements = getAllElements().filter((el) => el.type !== 'shadow');

  const { nodes, edges } = useMemo(
    () => buildTreeLayout(elements),
    [elements]
  );

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
        zoomOnPinch
      >
        <Background color="#e2e8f0" gap={20} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            switch (node.data?.type) {
              case 'system': return '#93c5fd';
              case 'container': return '#86efac';
              case 'component': return '#fde047';
              case 'person': return '#c4b5fd';
              default: return '#e2e8f0';
            }
          }}
        />
      </ReactFlow>
    </div>
  );
};

export default TreeView;
```

**Step 2: Commit**

```bash
cd /tmp/system_diagrams && git add src/components/TreeView.jsx && git commit -m "feat(ui): add TreeView component with hierarchical layout"
```

---

## Task 4: Update App.jsx to Support View Mode Toggle

**Files:**
- Modify: `/tmp/system_diagrams/src/App.jsx`

**Step 1: Import TreeView**

After the Header import, add:

```javascript
import TreeView from './components/TreeView';
```

**Step 2: Get viewMode from store**

Add to the useStore destructure or separate selector:

```javascript
const viewMode = useStore((state) => state.viewMode);
```

**Step 3: Conditionally render TreeView or ReactFlow canvas**

Find the main ReactFlow section (the `<ReactFlow ... />` component) and wrap it with the tree view conditional. The structure should be:

```jsx
{/* Main Canvas Area */}
<div className="flex-1 relative">
  {viewMode === 'tree' ? (
    <TreeView />
  ) : (
    <ReactFlow
      // ... existing props
    >
      {/* ... existing children */}
    </ReactFlow>
  )}
</div>
```

**Step 4: Commit**

```bash
cd /tmp/system_diagrams && git add src/App.jsx && git commit -m "feat(app): conditionally render TreeView based on viewMode"
```

---

## Task 5: Replace Layout Menu with View Toggle in Header

**Files:**
- Modify: `/tmp/system_diagrams/src/components/Header.jsx`

**Step 1: Import icons and store functions**

Update imports to include:
- Add `GitBranch` to lucide-react imports (for tree icon)
- Add `Eye` to lucide-react imports (for view toggle)

**Step 2: Get viewMode and setViewMode from store**

Update the useStore call:

```javascript
const { metadata, setMetadata, exportModel, importModel, clearAll, getAllElements, updateElement, relationships } = useStore();
const viewMode = useStore((state) => state.viewMode);
const setViewMode = useStore((state) => state.setViewMode);
```

**Step 3: Remove layout menu state and handler**

Remove:
- `const [showLayoutMenu, setShowLayoutMenu] = useState(false);`
- The `applyLayout` function
- The layout menu imports from layoutUtils (can keep for now, will be unused)

**Step 4: Replace the Layout button and menu with View toggle**

Replace the entire Layout button and dropdown section with:

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
</div>
```

**Step 5: Commit**

```bash
cd /tmp/system_diagrams && git add src/components/Header.jsx && git commit -m "feat(header): replace Layout menu with Edit/Tree view toggle"
```

---

## Task 6: Hide Toolbar and Properties Panel in Tree View

**Files:**
- Modify: `/tmp/system_diagrams/src/App.jsx`

**Step 1: Conditionally hide Toolbar in tree view**

Wrap the Toolbar component with a condition:

```jsx
{viewMode === 'edit' && <Toolbar />}
```

**Step 2: Conditionally hide PropertiesPanel in tree view**

Wrap the PropertiesPanel component with a condition:

```jsx
{viewMode === 'edit' && <PropertiesPanel />}
```

**Step 3: Commit**

```bash
cd /tmp/system_diagrams && git add src/App.jsx && git commit -m "feat(app): hide Toolbar and PropertiesPanel in tree view mode"
```

---

## Task 7: Build and Deploy

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
git commit -m "build: update standalone with tree view mode"
```

**Step 4: Push to GitHub**

```bash
git push origin main
```

---

## Summary

After completing all tasks:

1. **View mode toggle** - Switch between "Edit" and "Tree" modes in header
2. **Tree view** - Shows full hierarchy with parent-child edges, auto-layout
3. **Read-only** - Tree view is non-interactive (no dragging, no editing)
4. **Navigation** - Each node has a link button to jump to that element in edit mode
5. **Non-destructive** - Positions in tree view are computed, don't affect stored positions
