import { useMemo, useCallback } from 'react';
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
  const HORIZONTAL_GAP = 40;
  const VERTICAL_SPACING = 120;
  const GRID_COLUMNS = 3; // Max columns in grid layout

  // Calculate subtree width recursively
  const getSubtreeWidth = (elementId) => {
    const children = childrenMap.get(elementId) || [];
    if (children.length === 0) return NODE_WIDTH;

    // For grid layout, find the widest row
    const cols = Math.min(children.length, GRID_COLUMNS);
    const numRows = Math.ceil(children.length / cols);

    let maxRowWidth = NODE_WIDTH;

    for (let row = 0; row < numRows; row++) {
      let rowWidth = 0;
      const colsInThisRow = Math.min(cols, children.length - row * cols);

      for (let col = 0; col < colsInThisRow; col++) {
        const childIndex = row * cols + col;
        const childWidth = getSubtreeWidth(children[childIndex].id);
        rowWidth += childWidth;
        if (col < colsInThisRow - 1) {
          rowWidth += HORIZONTAL_GAP;
        }
      }

      maxRowWidth = Math.max(maxRowWidth, rowWidth);
    }

    return maxRowWidth;
  };

  // Calculate subtree height recursively
  const getSubtreeHeight = (elementId) => {
    const children = childrenMap.get(elementId) || [];
    if (children.length === 0) return NODE_HEIGHT;

    const cols = Math.min(children.length, GRID_COLUMNS);
    const numRows = Math.ceil(children.length / cols);

    // For each row, find the max height of children in that row (including their subtrees)
    let totalRowsHeight = 0;
    for (let row = 0; row < numRows; row++) {
      let maxRowHeight = NODE_HEIGHT;
      for (let col = 0; col < cols; col++) {
        const childIndex = row * cols + col;
        if (childIndex < children.length) {
          const childHeight = getSubtreeHeight(children[childIndex].id);
          maxRowHeight = Math.max(maxRowHeight, childHeight);
        }
      }
      totalRowsHeight += maxRowHeight;
      if (row < numRows - 1) {
        totalRowsHeight += VERTICAL_SPACING;
      }
    }

    return NODE_HEIGHT + VERTICAL_SPACING + totalRowsHeight;
  };

  // Get the height of a single element's subtree (used for row offset calculation)
  const getRowHeight = (children, cols, rowIndex) => {
    let maxHeight = NODE_HEIGHT;
    for (let col = 0; col < cols; col++) {
      const childIndex = rowIndex * cols + col;
      if (childIndex < children.length) {
        const childHeight = getSubtreeHeight(children[childIndex].id);
        maxHeight = Math.max(maxHeight, childHeight);
      }
    }
    return maxHeight;
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
    });

    const children = childrenMap.get(element.id) || [];
    if (children.length === 0) return;

    const cols = Math.min(children.length, GRID_COLUMNS);
    const numRows = Math.ceil(children.length / cols);

    // Get the parent's subtree width (this determines total available space)
    const parentSubtreeWidth = getSubtreeWidth(element.id);
    const centerX = x + NODE_WIDTH / 2;

    // Track Y position per row, accounting for subtree heights
    let currentY = y + VERTICAL_SPACING;

    for (let row = 0; row < numRows; row++) {
      const colsInThisRow = Math.min(cols, children.length - row * cols);

      // Calculate the width of this row based on actual subtree widths
      const childWidths = [];
      for (let col = 0; col < colsInThisRow; col++) {
        const childIndex = row * cols + col;
        childWidths.push(getSubtreeWidth(children[childIndex].id));
      }

      const rowWidth = childWidths.reduce((sum, w) => sum + w, 0) + (colsInThisRow - 1) * HORIZONTAL_GAP;
      let currentX = centerX - rowWidth / 2;

      for (let col = 0; col < colsInThisRow; col++) {
        const childIndex = row * cols + col;
        const child = children[childIndex];
        const childSubtreeWidth = childWidths[col];

        // Position child at center of its subtree allocation
        const childX = currentX + (childSubtreeWidth - NODE_WIDTH) / 2;

        // Create edge from parent to child
        edges.push({
          id: `edge-${element.id}-${child.id}`,
          source: element.id,
          target: child.id,
          type: 'smoothstep',
          style: { stroke: '#94a3b8', strokeWidth: 1 },
        });

        positionNode(child, childX, currentY, depth + 1);

        currentX += childSubtreeWidth + HORIZONTAL_GAP;
      }

      // Move to next row - offset by the max height of this row's subtrees
      currentY += getRowHeight(children, cols, row) + VERTICAL_SPACING;
    }
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
  const setViewMode = useStore((state) => state.setViewMode);
  const navigateInto = useStore((state) => state.navigateInto);
  const navigateTo = useStore((state) => state.navigateTo);
  const navigateToRoot = useStore((state) => state.navigateToRoot);

  const elements = getAllElements().filter((el) => el.type !== 'shadow');

  const { nodes, edges } = useMemo(
    () => buildTreeLayout(elements),
    [elements]
  );

  // Handle double-click - same as edit view but navigates to element's context then switches to edit
  const onNodeDoubleClick = useCallback(
    (event, node) => {
      event.stopPropagation();
      const element = node.data;
      if (!element) return;

      // Navigate to the parent context where this element lives, then switch to edit mode
      const targetParentId = element.parentId || null;
      if (targetParentId) {
        navigateTo(targetParentId);
      } else {
        navigateToRoot();
      }
      setViewMode('edit');
    },
    [navigateTo, navigateToRoot, setViewMode]
  );

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeDoubleClick={onNodeDoubleClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        className="bg-gray-50"
      >
        <Background color="#e2e8f0" gap={20} />
        <Controls />
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
