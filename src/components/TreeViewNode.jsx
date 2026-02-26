import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { User, Box, Component, Server, ExternalLink, ExternalLinkIcon } from 'lucide-react';
import useStore from '../store';

// Generate a consistent color from initials
const getColorFromInitials = (initials) => {
  if (!initials) return null;
  let hash = 0;
  for (let i = 0; i < initials.length; i++) {
    hash = initials.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsl(${hue}, 70%, 90%)`,
    text: `hsl(${hue}, 70%, 30%)`,
    border: `hsl(${hue}, 70%, 70%)`,
  };
};

// Get initials from a name
const getInitials = (name) => {
  if (!name || typeof name !== 'string') return null;
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
};

const TreeViewNode = ({ data }) => {
  const setViewMode = useStore((state) => state.setViewMode);
  const navigateTo = useStore((state) => state.navigateTo);

  // Get owner badges
  const ownerBadges = [
    { label: 'PM', name: data.ownerPM },
    { label: 'UX', name: data.ownerUX },
    { label: 'T', name: data.ownerTech },
  ].filter(o => o.name).map(o => ({
    ...o,
    initials: getInitials(o.name),
    colors: getColorFromInitials(getInitials(o.name)),
  }));

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
          onMouseDown={(e) => e.stopPropagation()}
          className="nodrag p-1 hover:bg-white/50 rounded transition-colors cursor-pointer"
          title="Go to this element in edit mode"
        >
          <ExternalLinkIcon className="w-3 h-3 text-gray-400 hover:text-blue-500" />
        </button>
      </div>

      {/* Owner badges */}
      {ownerBadges.length > 0 && (
        <div className="flex gap-1 mt-1 flex-wrap">
          {ownerBadges.map((badge) => (
            <span
              key={badge.label}
              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-medium border"
              style={{
                backgroundColor: badge.colors?.bg || '#f3f4f6',
                color: badge.colors?.text || '#374151',
                borderColor: badge.colors?.border || '#d1d5db',
              }}
              title={`${badge.label}: ${badge.name}`}
            >
              <span className="opacity-60">{badge.label}</span>
              <span>{badge.initials}</span>
            </span>
          ))}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2 !h-2 !bg-gray-400 !border-0"
      />
    </div>
  );
};

export default memo(TreeViewNode);
