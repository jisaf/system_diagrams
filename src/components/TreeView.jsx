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

    // For grid layout, we need to calculate width per row and take the max
    const cols = Math.min(children.length, GRID_COLUMNS);

    // Calculate total width needed: sum of widths for each column
    // Each column's width is the max subtree width of elements in that column
    const columnWidths = [];
    for (let col = 0; col < cols; col++) {
      let maxWidth = NODE_WIDTH;
      for (let i = col; i < children.length; i += cols) {
        const childWidth = getSubtreeWidth(children[i].id);
        maxWidth = Math.max(maxWidth, childWidth);
      }
      columnWidths.push(maxWidth);
    }

    const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0) + (cols - 1) * HORIZONTAL_GAP;
    return Math.max(NODE_WIDTH, totalWidth);
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

    // Calculate column widths for proper horizontal spacing
    const columnWidths = [];
    for (let col = 0; col < cols; col++) {
      let maxWidth = NODE_WIDTH;
      for (let i = col; i < children.length; i += cols) {
        const childWidth = getSubtreeWidth(children[i].id);
        maxWidth = Math.max(maxWidth, childWidth);
      }
      columnWidths.push(maxWidth);
    }

    const totalWidth = columnWidths.reduce((sum, w) => sum + w, 0) + (cols - 1) * HORIZONTAL_GAP;
    const startX = x + NODE_WIDTH / 2 - totalWidth / 2;

    // Track Y position per row, accounting for subtree heights
    let currentY = y + VERTICAL_SPACING;

    for (let row = 0; row < numRows; row++) {
      let currentX = startX;

      for (let col = 0; col < cols; col++) {
        const childIndex = row * cols + col;
        if (childIndex >= children.length) break;

        const child = children[childIndex];

        // Position child at center of its allocated column width
        const childX = currentX + (columnWidths[col] - NODE_WIDTH) / 2;

        // Create edge from parent to child
        edges.push({
          id: `edge-${element.id}-${child.id}`,
          source: element.id,
          target: child.id,
          type: 'smoothstep',
          style: { stroke: '#94a3b8', strokeWidth: 1 },
        });

        positionNode(child, childX, currentY, depth + 1);

        currentX += columnWidths[col] + HORIZONTAL_GAP;
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
