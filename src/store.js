import { create } from 'zustand';

// Helper function to get the correct store property name for a type
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

const useStore = create((set, get) => ({
  // Debug mode - set to true during development to enable logging
  debugMode: false,

  // Project metadata
  metadata: {
    name: 'New C4 Model',
    version: '1.0',
    author: 'Solution Architect',
  },

  // Current C4 level (context, container, component, code)
  currentLevel: 'context',

  // View mode: 'edit' for normal editing, 'tree' for hierarchical overview
  viewMode: 'edit',

  // Hierarchical navigation state
  currentParentId: null,  // null = root view, showing top-level elements
  navigationHistory: [],  // Stack of parent IDs for back navigation

  // Selected element for editing
  selectedElement: null,

  // Selected edge for editing
  selectedEdge: null,

  // Elements by type
  systems: [],
  containers: [],
  components: [],
  people: [],
  externalSystems: [],
  shadows: [],

  // Relationships
  relationships: [],

  // Validation warnings
  warnings: [],

  // Actions
  setMetadata: (metadata) => set({ metadata }),

  setCurrentLevel: (level) => set({ currentLevel: level }),

  setViewMode: (mode) => set({ viewMode: mode }),

  // Navigate into an element (drill down)
  navigateInto: (elementId) => {
    const state = get();
    const element = state.getElementById(elementId);
    if (!element) return;

    set({
      currentParentId: elementId,
      navigationHistory: [...state.navigationHistory, state.currentParentId],
      selectedElement: null,
      selectedEdge: null,
    });
  },

  // Navigate up one level
  navigateUp: () => {
    const state = get();
    if (state.navigationHistory.length === 0) return;

    const newHistory = [...state.navigationHistory];
    const parentId = newHistory.pop();

    set({
      currentParentId: parentId,
      navigationHistory: newHistory,
      selectedElement: null,
      selectedEdge: null,
    });
  },

  // Navigate to root
  navigateToRoot: () => {
    set({
      currentParentId: null,
      navigationHistory: [],
      selectedElement: null,
      selectedEdge: null,
    });
  },

  // Navigate to a specific element (for breadcrumb clicks)
  navigateTo: (elementId) => {
    const state = get();
    if (elementId === null) {
      // Navigate to root
      set({
        currentParentId: null,
        navigationHistory: [],
        selectedElement: null,
        selectedEdge: null,
      });
      return;
    }

    // Build the path from root to this element
    const buildPath = (targetId) => {
      const path = [];
      let current = state.getElementById(targetId);
      while (current && current.parentId) {
        path.unshift(current.parentId);
        current = state.getElementById(current.parentId);
      }
      return path;
    };

    const history = buildPath(elementId);
    set({
      currentParentId: elementId,
      navigationHistory: [null, ...history],
      selectedElement: null,
      selectedEdge: null,
    });
  },

  // Get breadcrumb trail (array of elements from root to current)
  getBreadcrumb: () => {
    const state = get();
    const trail = [];

    // Build trail from history + current
    for (const id of state.navigationHistory) {
      if (id !== null) {
        const element = state.getElementById(id);
        if (element) trail.push(element);
      }
    }

    // Add current parent
    if (state.currentParentId !== null) {
      const current = state.getElementById(state.currentParentId);
      if (current) trail.push(current);
    }

    return trail;
  },

  // Get children of an element
  getChildren: (parentId) => {
    const state = get();
    const allElements = state.getAllElements();
    if (parentId === null) {
      return allElements.filter(el => !el.parentId);
    }
    return allElements.filter(el => el.parentId === parentId);
  },

  // Check if element has children
  hasChildren: (elementId) => {
    return get().getChildren(elementId).length > 0;
  },

  // Count children of an element
  getChildCount: (elementId) => {
    return get().getChildren(elementId).length;
  },

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

  setSelectedElement: (element) => {
    const state = get();
    if (state.debugMode) {
      console.log('[Diagrams Debug] setSelectedElement called:', element ? { id: element.id, type: element.type } : null);
    }
    set({ selectedElement: element, selectedEdge: null });
  },

  setSelectedEdge: (edge) => {
    const state = get();
    if (state.debugMode) {
      console.log('[Diagrams Debug] setSelectedEdge called:', edge ? { id: edge.id } : null);
    }
    set({ selectedEdge: edge, selectedElement: null });
  },

  // Add element
  addElement: (type, element) => {
    const state = get();
    const newElement = {
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      parentId: state.currentParentId,  // Auto-assign to current context
      ...element,
    };

    const propertyName = getPropertyName(type);
    set((state) => ({
      [propertyName]: [...state[propertyName], newElement],
    }));

    return newElement;
  },

  // Update element
  updateElement: (type, id, updates) => {
    const state = get();
    if (state.debugMode) {
      console.log('[Diagrams Debug] updateElement called:', { type, id, updates });
    }

    const propertyName = getPropertyName(type);
    set((state) => {
      const updatedArray = state[propertyName].map((el) =>
        el.id === id ? { ...el, ...updates } : el
      );

      // Also update selectedElement if it's the one being updated
      const updatedElement = updatedArray.find((el) => el.id === id);
      const newSelectedElement = state.selectedElement?.id === id ? updatedElement : state.selectedElement;

      if (state.debugMode && updatedElement) {
        console.log('[Diagrams Debug] Element updated:', updatedElement);
      }

      return {
        [propertyName]: updatedArray,
        selectedElement: newSelectedElement,
      };
    });
  },

  // Delete element
  deleteElement: (type, id) => {
    const state = get();
    const propertyName = getPropertyName(type);

    // If currently navigated inside the element being deleted, go to root
    let navUpdate = {};
    if (state.currentParentId === id) {
      navUpdate = {
        currentParentId: null,
        navigationHistory: [],
      };
    } else if (state.navigationHistory.includes(id)) {
      // If deleted element is in navigation history, reset to root
      navUpdate = {
        currentParentId: null,
        navigationHistory: [],
      };
    }

    set((state) => ({
      [propertyName]: state[propertyName].filter((el) => el.id !== id),
      relationships: state.relationships.filter(
        (rel) => rel.from !== id && rel.to !== id
      ),
      ...navUpdate,
    }));
  },

  // Add relationship
  addRelationship: (relationship) => {
    const newRel = {
      id: `rel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...relationship,
    };

    set((state) => ({
      relationships: [...state.relationships, newRel],
    }));

    return newRel;
  },

  // Update relationship
  updateRelationship: (id, updates) => {
    const state = get();
    if (state.debugMode) {
      console.log('[Diagrams Debug] updateRelationship called:', { id, updates });
    }

    set((state) => {
      const updatedRelationships = state.relationships.map((rel) =>
        rel.id === id ? { ...rel, ...updates } : rel
      );

      // Also update selectedEdge if it's the one being updated
      const updatedRelationship = updatedRelationships.find((rel) => rel.id === id);
      const newSelectedEdge = state.selectedEdge?.id === id ? updatedRelationship : state.selectedEdge;

      if (state.debugMode && updatedRelationship) {
        console.log('[Diagrams Debug] Relationship updated:', updatedRelationship);
      }

      return {
        relationships: updatedRelationships,
        selectedEdge: newSelectedEdge,
      };
    });
  },

  // Delete relationship
  deleteRelationship: (id) => {
    set((state) => ({
      relationships: state.relationships.filter((rel) => rel.id !== id),
    }));
  },

  // Get all elements
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

  // Get element by id
  getElementById: (id) => {
    const elements = get().getAllElements();
    return elements.find((el) => el.id === id);
  },

  // Clear all data
  clearAll: () => {
    set({
      systems: [],
      containers: [],
      components: [],
      people: [],
      externalSystems: [],
      shadows: [],
      relationships: [],
      selectedElement: null,
      selectedEdge: null,
      warnings: [],
      currentParentId: null,
      navigationHistory: [],
    });
  },

  // Import model
  importModel: (model) => {
    set({
      metadata: model.metadata || get().metadata,
      systems: model.systems || [],
      containers: model.containers || [],
      components: model.components || [],
      people: model.people || [],
      externalSystems: model.externalSystems || [],
      shadows: model.shadows || [],
      relationships: model.relationships || [],
      currentParentId: null,
      navigationHistory: [],
      selectedElement: null,
      selectedEdge: null,
    });
  },

  // Export model
  exportModel: () => {
    const state = get();
    return {
      metadata: state.metadata,
      systems: state.systems,
      containers: state.containers,
      components: state.components,
      people: state.people,
      externalSystems: state.externalSystems,
      shadows: state.shadows,
      relationships: state.relationships,
    };
  },

  // Validate model
  validateModel: () => {
    const state = get();
    const warnings = [];

    // Check for containers without parent system
    state.containers.forEach((container) => {
      if (container.parentSystem && !state.systems.find((s) => s.id === container.parentSystem)) {
        warnings.push({
          type: 'warning',
          message: `Container "${container.name}" references non-existent parent system`,
          elementId: container.id,
        });
      }
    });

    // Check for components without parent container
    state.components.forEach((component) => {
      if (component.parentContainer && !state.containers.find((c) => c.id === component.parentContainer)) {
        warnings.push({
          type: 'warning',
          message: `Component "${component.name}" references non-existent parent container`,
          elementId: component.id,
        });
      }
    });

    // Check for orphaned relationships
    const allElements = state.getAllElements();
    const elementIds = new Set(allElements.map((el) => el.id));

    state.relationships.forEach((rel) => {
      if (!elementIds.has(rel.from)) {
        warnings.push({
          type: 'error',
          message: `Relationship references non-existent source element: ${rel.from}`,
          elementId: rel.id,
        });
      }
      if (!elementIds.has(rel.to)) {
        warnings.push({
          type: 'error',
          message: `Relationship references non-existent target element: ${rel.to}`,
          elementId: rel.id,
        });
      }
    });

    // Check complexity
    const visibleElements = get().getVisibleElements();
    if (visibleElements.length > 15) {
      warnings.push({
        type: 'info',
        message: `Current view has ${visibleElements.length} elements. Consider splitting into multiple diagrams for clarity.`,
      });
    }

    set({ warnings });
    return warnings;
  },

  // Get visible elements based on current navigation context
  getVisibleElements: () => {
    const state = get();
    const parentId = state.currentParentId;

    // Get all elements that have this parentId
    const allElements = state.getAllElements();
    return allElements.filter(el => {
      // For root view (parentId === null), show elements with no parent OR undefined parent
      if (parentId === null) {
        return !el.parentId;
      }
      // For drill-down views, show elements whose parentId matches
      return el.parentId === parentId;
    });
  },
}));

// Expose store for E2E testing (only in development/test environments)
if (typeof window !== 'undefined') {
  window.__ZUSTAND_STORE__ = useStore;
}

export default useStore;
