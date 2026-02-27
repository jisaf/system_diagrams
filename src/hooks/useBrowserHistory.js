import { useEffect, useRef } from 'react';
import useStore from '../store';

/**
 * Hook that syncs app navigation state with browser history
 * Enables back/forward button navigation between views
 */
export const useBrowserHistory = () => {
  const currentParentId = useStore((state) => state.currentParentId);
  const viewMode = useStore((state) => state.viewMode);
  const navigateTo = useStore((state) => state.navigateTo);
  const navigateToRoot = useStore((state) => state.navigateToRoot);
  const setViewMode = useStore((state) => state.setViewMode);

  // Track if we're currently handling a popstate to avoid pushing duplicate history
  const isHandlingPopState = useRef(false);
  // Track the last state we pushed to avoid duplicate pushes
  const lastPushedState = useRef(null);

  // Push state to browser history when navigation changes
  useEffect(() => {
    // Don't push if we're handling a popstate event
    if (isHandlingPopState.current) {
      isHandlingPopState.current = false;
      return;
    }

    const stateKey = `${currentParentId || 'root'}-${viewMode}`;

    // Don't push duplicate states
    if (lastPushedState.current === stateKey) {
      return;
    }

    const state = {
      currentParentId,
      viewMode,
    };

    // Use replaceState for the initial state, pushState for subsequent
    if (lastPushedState.current === null) {
      window.history.replaceState(state, '');
    } else {
      window.history.pushState(state, '');
    }

    lastPushedState.current = stateKey;
  }, [currentParentId, viewMode]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event) => {
      isHandlingPopState.current = true;

      const state = event.state;

      if (state) {
        // Restore navigation state
        if (state.currentParentId === null) {
          navigateToRoot();
        } else {
          navigateTo(state.currentParentId);
        }

        // Restore view mode
        if (state.viewMode) {
          setViewMode(state.viewMode);
        }

        // Update last pushed state to match current
        lastPushedState.current = `${state.currentParentId || 'root'}-${state.viewMode || 'edit'}`;
      } else {
        // No state means we're at the initial page load state
        navigateToRoot();
        setViewMode('edit');
        lastPushedState.current = 'root-edit';
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Initialize with current state if none exists
    if (!window.history.state) {
      const initialState = {
        currentParentId,
        viewMode,
      };
      window.history.replaceState(initialState, '');
      lastPushedState.current = `${currentParentId || 'root'}-${viewMode}`;
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigateTo, navigateToRoot, setViewMode]);
};

export default useBrowserHistory;
