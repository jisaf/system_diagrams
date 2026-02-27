import { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import useStore from './store';
import C4Node from './components/C4Node';
import ShadowNode from './components/ShadowNode';
import TreeView from './components/TreeView';
import GanttView from './components/GanttView';
import Toolbar from './components/Toolbar';
import PropertiesPanel from './components/PropertiesPanel';
import Header from './components/Header';
import { useLocalStorage } from './hooks/useLocalStorage';
import { useBrowserHistory } from './hooks/useBrowserHistory';

const nodeTypes = {
  c4Node: C4Node,
  shadowNode: ShadowNode,
};

// Calculate optimal handles based on node positions for shortest edge path
const getOptimalHandles = (sourceNode, targetNode) => {
  if (!sourceNode?.position || !targetNode?.position) {
    return { sourceHandle: 'bottom', targetHandle: 'top' };
  }

  const dx = targetNode.position.x - sourceNode.position.x;
  const dy = targetNode.position.y - sourceNode.position.y;

  // Use horizontal handles if nodes are more side-by-side than stacked
  if (Math.abs(dx) > Math.abs(dy)) {
    // Target is to the right of source
    if (dx > 0) {
      return { sourceHandle: 'right', targetHandle: 'left' };
    }
    // Target is to the left of source
    return { sourceHandle: 'left', targetHandle: 'right' };
  }

  // Use vertical handles if nodes are more stacked
  // Target is below source
  if (dy > 0) {
    return { sourceHandle: 'bottom', targetHandle: 'top' };
  }
  // Target is above source
  return { sourceHandle: 'top', targetHandle: 'bottom' };
};

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState(null);

  const {
    getAllElements,
    relationships,
    updateElement,
    setSelectedElement,
    setSelectedEdge,
    selectedElement,
    currentParentId,
    navigateInto,
    navigateTo,
  } = useStore();

  const navigateUp = useStore((state) => state.navigateUp);
  const navigateToRoot = useStore((state) => state.navigateToRoot);
  const viewMode = useStore((state) => state.viewMode);

  // Custom handler to intercept dimension changes
  const handleNodesChange = useCallback((changes) => {
    // Apply changes to React Flow
    onNodesChange(changes);

    // DISABLED: Dimension tracking for annotations causes infinite loops
    // TODO: Fix this properly later
    // For now, annotations will not persist their size on refresh
  }, [onNodesChange]);

  // Subscribe to individual store arrays to trigger re-renders
  const systems = useStore((state) => state.systems);
  const containers = useStore((state) => state.containers);
  const components = useStore((state) => state.components);
  const people = useStore((state) => state.people);
  const externalSystems = useStore((state) => state.externalSystems);
  const shadows = useStore((state) => state.shadows);
  const getVisibleElements = useStore((state) => state.getVisibleElements);

  // Enable local storage auto-save
  useLocalStorage();

  // Enable browser back/forward button navigation
  useBrowserHistory();

  // Update nodes and edges when store changes
  useEffect(() => {
    const elements = getVisibleElements();
    const newNodes = elements.map((el) => ({
      id: el.id,
      type: el.type === 'shadow' ? 'shadowNode' : 'c4Node',
      position: el.position || { x: Math.random() * 400, y: Math.random() * 300 },
      data: {
        ...el,
        label: el.name,
      },
    }));
    setNodes(newNodes);
  }, [systems, containers, components, people, externalSystems, shadows, currentParentId, getVisibleElements, setNodes]);

  useEffect(() => {
    const elements = getVisibleElements();
    const newEdges = relationships.map((rel) => {
      // Determine arrow markers based on arrowDirection
      const arrowDirection = rel.arrowDirection || 'right';
      let markerStart = undefined;
      let markerEnd = undefined;

      if (arrowDirection === 'left' || arrowDirection === 'both') {
        markerStart = { type: MarkerType.ArrowClosed };
      }
      if (arrowDirection === 'right' || arrowDirection === 'both') {
        markerEnd = { type: MarkerType.ArrowClosed };
      }

      // Determine line style based on lineStyle
      const lineStyle = rel.lineStyle || 'solid';
      let strokeDasharray = undefined;
      if (lineStyle === 'dashed') {
        strokeDasharray = '5,5';
      } else if (lineStyle === 'dotted') {
        strokeDasharray = '2,2';
      }

      // Calculate optimal handles based on node positions
      const sourceNode = elements.find((el) => el.id === rel.from);
      const targetNode = elements.find((el) => el.id === rel.to);
      const { sourceHandle, targetHandle } = getOptimalHandles(sourceNode, targetNode);

      return {
        id: rel.id,
        source: rel.from,
        target: rel.to,
        sourceHandle,
        targetHandle,
        label: rel.description || '',
        type: 'smoothstep',
        animated: rel.animated || false,
        markerStart,
        markerEnd,
        style: {
          stroke: '#64748b',
          strokeWidth: 2,
          strokeDasharray,
        },
        labelStyle: {
          fill: '#334155',
          fontSize: 12,
          fontWeight: 500,
        },
        labelBgStyle: {
          fill: '#f8fafc',
          fillOpacity: 0.9,
        },
      };
    });
    setEdges(newEdges);
  }, [relationships, setEdges, getVisibleElements, systems, containers, components, people, externalSystems, shadows, currentParentId]);

  // Handle node drag
  const onNodeDragStop = useCallback(
    (event, node) => {
      const element = getAllElements().find((el) => el.id === node.id);
      if (element) {
        // Extract only x and y to avoid any circular references from React Flow
        updateElement(element.type, element.id, {
          position: { x: node.position.x, y: node.position.y }
        });
      }
    },
    [getAllElements, updateElement]
  );

  // Handle edge connection
  const onConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        type: 'smoothstep',
        animated: false,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));

      // Add to store
      const { source, target } = params;
      useStore.getState().addRelationship({
        from: source,
        to: target,
        description: 'New relationship',
        technology: '',
      });
    },
    [setEdges]
  );

  // Expose onConnect for E2E testing
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__CREATE_CONNECTION__ = onConnect;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete window.__CREATE_CONNECTION__;
      }
    };
  }, [onConnect]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Don't handle if user is typing in an input
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }

      // Escape - go up one level or deselect
      if (event.key === 'Escape') {
        if (selectedElement) {
          setSelectedElement(null);
        } else {
          navigateUp();
        }
      }

      // Home - go to root
      if (event.key === 'Home' && !event.ctrlKey && !event.metaKey) {
        navigateToRoot();
      }

      // Enter - drill into selected element (infinite nesting - can always drill in)
      if (event.key === 'Enter' && selectedElement) {
        // Allow drilling into any element type except person and externalSystem
        if (selectedElement.type !== 'person' && selectedElement.type !== 'externalSystem') {
          navigateInto(selectedElement.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, setSelectedElement, navigateUp, navigateToRoot, navigateInto]);

  // Handle node click
  const onNodeClick = useCallback(
    (event, node) => {
      try {
        const element = getAllElements().find((el) => el.id === node.id);
        if (element) {
          console.log('[Diagrams] Node clicked:', element.type, element.id);
          setSelectedElement(element);
        } else {
          console.error('[Diagrams] Element not found for node:', node.id);
          setSelectedElement(null);
        }
      } catch (error) {
        console.error('[Diagrams] Error in onNodeClick:', error);
        setSelectedElement(null);
      }
    },
    [getAllElements, setSelectedElement]
  );

  // Handle node double-click (drill down)
  const onNodeDoubleClick = useCallback(
    (event, node) => {
      event.stopPropagation();
      const element = getAllElements().find((el) => el.id === node.id);
      if (!element) return;

      // If it's a shadow, navigate INTO the target
      if (element.type === 'shadow' && element.targetId) {
        const target = getAllElements().find((el) => el.id === element.targetId);
        if (target && target.type !== 'person' && target.type !== 'externalSystem') {
          navigateInto(target.id);
          return;
        }
      }

      // Navigate into any element (infinite nesting - can always drill in to add children)
      // Except person and externalSystem which are leaf nodes
      if (element.type !== 'person' && element.type !== 'externalSystem') {
        navigateInto(element.id);
      }
    },
    [getAllElements, navigateInto]
  );

  // Handle edge click
  const onEdgeClick = useCallback(
    (event, edge) => {
      const relationship = relationships.find((rel) => rel.id === edge.id);
      setSelectedEdge(relationship);
    },
    [relationships, setSelectedEdge]
  );

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedElement(null);
    setSelectedEdge(null);
  }, [setSelectedElement, setSelectedEdge]);

  // Handle drag over to allow drop
  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop to create new element
  const onDrop = useCallback(
    (event) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/c4-element-type');
      if (!type || !reactFlowInstance) return;

      // Convert screen position to flow position
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const element = {
        name: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
        description: '',
        technology: '',
        position,
      };

      useStore.getState().addElement(type, element);
    },
    [reactFlowInstance]
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />

      <div className="flex flex-1 overflow-hidden">
        {viewMode === 'edit' && <Toolbar />}

        {/* Main Canvas Area */}
        <div className="flex-1 relative">
          {viewMode === 'tree' ? (
            <TreeView />
          ) : viewMode === 'gantt' ? (
            <GanttView />
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={handleNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDragStop={onNodeDragStop}
              onNodeClick={onNodeClick}
              onNodeDoubleClick={onNodeDoubleClick}
              onEdgeClick={onEdgeClick}
              onPaneClick={onPaneClick}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onInit={setReactFlowInstance}
              nodeTypes={nodeTypes}
              fitView
              className="bg-gray-50"
            >
              <Background color="#cbd5e1" gap={16} />
              <Controls />
              <MiniMap
                nodeColor={(node) => {
                  switch (node.data.type) {
                    case 'system':
                      return '#3b82f6';
                    case 'container':
                      return '#22c55e';
                    case 'component':
                      return '#eab308';
                    case 'person':
                      return '#a855f7';
                    case 'externalSystem':
                      return '#6b7280';
                    default:
                      return '#94a3b8';
                  }
                }}
              />
            </ReactFlow>
          )}
        </div>

        {viewMode === 'edit' && <PropertiesPanel />}
      </div>
    </div>
  );
}

export default App;
