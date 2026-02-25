import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { User, Box, Component, Server, ExternalLink, Search } from 'lucide-react';
import useStore from '../store';

// Generate a consistent color from initials
const getColorFromInitials = (initials) => {
  if (!initials) return null;
  let hash = 0;
  for (let i = 0; i < initials.length; i++) {
    hash = initials.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Generate HSL color with good saturation and lightness for badges
  const hue = Math.abs(hash) % 360;
  return {
    bg: `hsl(${hue}, 70%, 90%)`,
    text: `hsl(${hue}, 70%, 30%)`,
    border: `hsl(${hue}, 70%, 70%)`,
  };
};

// Get initials from a name (first letter of first two words)
const getInitials = (name) => {
  if (!name || typeof name !== 'string') return null;
  const words = name.trim().split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
};

const C4Node = ({ data, selected }) => {
  const getChildCount = useStore((state) => state.getChildCount);
  const childCount = getChildCount(data.id);

  // Get owner initials and colors
  const ownerBadges = [
    { label: 'PM', name: data.ownerPM },
    { label: 'UX', name: data.ownerUX },
    { label: 'T', name: data.ownerTech },
  ].filter(o => o.name).map(o => ({
    ...o,
    initials: getInitials(o.name),
    colors: getColorFromInitials(getInitials(o.name)),
  }));

  const getNodeStyle = () => {
    const baseStyle = 'px-4 py-3 rounded-lg border-2 min-w-[200px] shadow-lg transition-all';

    switch (data.type) {
      case 'system':
        return `${baseStyle} bg-blue-100 border-blue-500 hover:bg-blue-200`;
      case 'container':
        return `${baseStyle} bg-green-100 border-green-500 hover:bg-green-200`;
      case 'component':
        return `${baseStyle} bg-yellow-100 border-yellow-500 hover:bg-yellow-200`;
      case 'person':
        return `${baseStyle} bg-purple-100 border-purple-500 hover:bg-purple-200`;
      case 'externalSystem':
        return `${baseStyle} bg-gray-100 border-gray-500 hover:bg-gray-200`;
      default:
        return `${baseStyle} bg-white border-gray-300`;
    }
  };

  const getIcon = () => {
    const iconClass = 'w-5 h-5';
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

  const getTypeLabel = () => {
    switch (data.type) {
      case 'system':
        return 'Software System';
      case 'container':
        return 'Container';
      case 'component':
        return 'Component';
      case 'person':
        return 'Person';
      case 'externalSystem':
        return 'External System';
      default:
        return data.type;
    }
  };

  // Shared handle styles - larger hit area with visible hover state
  const handleStyle = "!w-4 !h-4 !bg-slate-400 hover:!bg-blue-500 !border-2 !border-white transition-colors duration-150 cursor-crosshair";

  return (
    <div className={`${getNodeStyle()} ${selected ? 'ring-4 ring-blue-400' : ''} relative`}>
      <Handle type="target" position={Position.Top} id="top" className={handleStyle} />

      <div className="flex items-start gap-2">
        <div className="mt-1">{getIcon()}</div>
        <div className="flex-1">
          <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
            {getTypeLabel()}
          </div>
          <div className="font-bold text-gray-900 mb-1">
            {data.label || data.name || 'Unnamed'}
          </div>
          {data.technology && (
            <div className="text-xs text-gray-600 italic mb-1">
              [{data.technology}]
            </div>
          )}
          {data.description && (
            <div className="text-xs text-gray-700 mt-2">
              {data.description}
            </div>
          )}
        </div>
      </div>

      {/* Owner badges - bottom left */}
      {ownerBadges.length > 0 && (
        <div className="absolute bottom-2 left-2 flex items-center gap-1">
          {ownerBadges.map((badge) => (
            <div
              key={badge.label}
              className="px-1.5 py-0.5 rounded text-xs font-medium border"
              style={{
                backgroundColor: badge.colors.bg,
                color: badge.colors.text,
                borderColor: badge.colors.border,
              }}
              title={`${badge.label}: ${badge.name}`}
            >
              {badge.initials}
            </div>
          ))}
        </div>
      )}

      {/* Child count - bottom right */}
      {childCount > 0 && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1 text-xs text-gray-500 bg-white/80 px-1.5 py-0.5 rounded">
          <Search className="w-3 h-3" />
          <span>{childCount}</span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} id="bottom" className={handleStyle} />
      <Handle type="source" position={Position.Right} id="right" className={handleStyle} />
      <Handle type="target" position={Position.Left} id="left" className={handleStyle} />
    </div>
  );
};

export default memo(C4Node);
