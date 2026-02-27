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
  const NODE_HEIGHT = 70;
  const HORIZONTAL_GAP = 20;
  const VERTICAL_SPACING = 100;
  const GRID_COLUMNS = 3; // Max columns in grid layout

  // Calculate grid dimensions for children
  const getGridDimensions = (numChildren) => {
    if (numChildren === 0) return { cols: 0, rows: 0 };
    const cols = Math.min(numChildren, GRID_COLUMNS);
    const rows = Math.ceil(numChildren / cols);
    return { cols, rows };
  };

  // Calculate subtree width recursively (now with grid layout)
  const getSubtreeWidth = (elementId) => {
    const children = childrenMap.get(elementId) || [];
    if (children.length === 0) return NODE_WIDTH;

    // Calculate width based on grid layout for direct children
    const { cols } = getGridDimensions(children.length);
    const directChildrenWidth = cols * NODE_WIDTH + (cols - 1) * HORIZONTAL_GAP;

    // Also need to consider grandchildren
    let maxChildSubtreeWidth = 0;
    children.forEach((child) => {
      const childWidth = getSubtreeWidth(child.id);
      maxChildSubtreeWidth = Math.max(maxChildSubtreeWidth, childWidth);
    });

    return Math.max(NODE_WIDTH, directChildrenWidth, maxChildSubtreeWidth);
  };

  // Calculate subtree height (needed for proper vertical spacing)
  const getSubtreeHeight = (elementId) => {
    const children = childrenMap.get(elementId) || [];
    if (children.length === 0) return NODE_HEIGHT;

    const { rows } = getGridDimensions(children.length);
    const childrenGridHeight = rows * NODE_HEIGHT + (rows - 1) * HORIZONTAL_GAP;

    // Find max height of any child subtree
    let maxChildSubtreeHeight = 0;
    children.forEach((child) => {
      const childHeight = getSubtreeHeight(child.id);
      maxChildSubtreeHeight = Math.max(maxChildSubtreeHeight, childHeight);
    });

    return NODE_HEIGHT + VERTICAL_SPACING + childrenGridHeight + maxChildSubtreeHeight;
  };

  // Position nodes recursively with grid layout for children
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

    const { cols, rows } = getGridDimensions(children.length);
    const gridWidth = cols * NODE_WIDTH + (cols - 1) * HORIZONTAL_GAP;
    const startX = x + NODE_WIDTH / 2 - gridWidth / 2;
    const startY = y + VERTICAL_SPACING;

    children.forEach((child, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const childX = startX + col * (NODE_WIDTH + HORIZONTAL_GAP);
      const childY = startY + row * (NODE_HEIGHT + HORIZONTAL_GAP);

      // Create edge from parent to child
      edges.push({
        id: `edge-${element.id}-${child.id}`,
        source: element.id,
        target: child.id,
        type: 'smoothstep',
        style: { stroke: '#94a3b8', strokeWidth: 1 },
      });

      positionNode(child, childX, childY, depth + 1);
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
        panOnDrag={true} // Allow panning with left mouse button
        zoomOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false} // Disable double-click zoom so node double-click works
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
