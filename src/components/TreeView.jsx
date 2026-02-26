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
