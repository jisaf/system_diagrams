import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Link2, User, Box, Component, Server, ExternalLink } from 'lucide-react';
import useStore from '../store';

const ShadowNode = ({ data, selected }) => {
  const getElementById = useStore((state) => state.getElementById);
  const target = getElementById(data.targetId);

  const getTargetIcon = () => {
    const iconClass = 'w-5 h-5';
    if (!target) return <Link2 className={iconClass} />;

    switch (target.type) {
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
        return <Link2 className={iconClass} />;
    }
  };

  const getTargetTypeLabel = () => {
    if (!target) return 'Shadow (broken link)';

    const labels = {
      system: 'Software System',
      container: 'Container',
      component: 'Component',
      person: 'Person',
      externalSystem: 'External System',
    };
    return `Shadow → ${labels[target.type] || target.type}`;
  };

  // Shared handle styles
  const handleStyle = "!w-4 !h-4 !bg-slate-400 hover:!bg-blue-500 !border-2 !border-white transition-colors duration-150 cursor-crosshair";

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 border-dashed min-w-[200px] shadow-lg transition-all
        ${target ? 'bg-slate-50/50 border-slate-400' : 'bg-red-50/50 border-red-400'}
        ${selected ? 'ring-4 ring-blue-400' : ''} relative`}
    >
      <Handle type="target" position={Position.Top} id="top" className={handleStyle} />

      <div className="flex items-start gap-2 opacity-70">
        <div className="mt-1">{getTargetIcon()}</div>
        <div className="flex-1">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            {getTargetTypeLabel()}
          </div>
          <div className="font-bold text-gray-700 mb-1">
            {target?.name || 'Select target...'}
          </div>
          {target?.technology && (
            <div className="text-xs text-gray-500 italic mb-1">
              [{target.technology}]
            </div>
          )}
          {target?.description && (
            <div className="text-xs text-gray-600 mt-2">
              {target.description}
            </div>
          )}
        </div>
      </div>

      {/* Link badge */}
      <div className="absolute top-2 right-2">
        <Link2 className="w-4 h-4 text-slate-400" />
      </div>

      <Handle type="source" position={Position.Bottom} id="bottom" className={handleStyle} />
      <Handle type="source" position={Position.Right} id="right" className={handleStyle} />
      <Handle type="target" position={Position.Left} id="left" className={handleStyle} />
    </div>
  );
};

export default memo(ShadowNode);
