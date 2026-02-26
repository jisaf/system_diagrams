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
