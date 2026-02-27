import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Server, Box, Component, User, ExternalLink } from 'lucide-react';
import useStore from '../store';

// Phase colors
const PHASE_COLORS = {
  'Discovery': 'bg-blue-500',
  'Design': 'bg-purple-500',
  'Build': 'bg-green-500',
  'Testing': 'bg-orange-500',
  'Deployment': 'bg-teal-500',
  'Maintenance': 'bg-gray-500',
};

const getPhaseColor = (phaseName) => {
  return PHASE_COLORS[phaseName] || 'bg-slate-500';
};

const getIcon = (type) => {
  const iconClass = 'w-4 h-4';
  switch (type) {
    case 'system': return <Server className={iconClass} />;
    case 'container': return <Box className={iconClass} />;
    case 'component': return <Component className={iconClass} />;
    case 'person': return <User className={iconClass} />;
    case 'externalSystem': return <ExternalLink className={iconClass} />;
    default: return <Box className={iconClass} />;
  }
};

const GanttView = () => {
  const getAllElements = useStore((state) => state.getAllElements);
  const setSelectedElement = useStore((state) => state.setSelectedElement);
  const setViewMode = useStore((state) => state.setViewMode);
  const navigateTo = useStore((state) => state.navigateTo);
  const navigateToRoot = useStore((state) => state.navigateToRoot);

  const [collapsedIds, setCollapsedIds] = useState(new Set());

  const elements = getAllElements().filter((el) => el.type !== 'shadow');

  // Build hierarchy
  const { tree, dateRange } = useMemo(() => {
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

    // Calculate date range from all phases
    let minDate = null;
    let maxDate = null;

    elements.forEach((el) => {
      (el.phases || []).forEach((phase) => {
        if (!minDate || phase.startMonth < minDate) minDate = phase.startMonth;
        if (!maxDate || phase.endMonth > maxDate) maxDate = phase.endMonth;
      });
    });

    // Default to current year if no phases
    if (!minDate) {
      const now = new Date();
      minDate = `${now.getFullYear()}-01`;
      maxDate = `${now.getFullYear()}-12`;
    }

    // Build flat list with depth info
    const flattenTree = (items, depth = 0) => {
      let result = [];
      items.forEach((item) => {
        result.push({ ...item, depth });
        const children = childrenMap.get(item.id) || [];
        if (children.length > 0 && !collapsedIds.has(item.id)) {
          result = result.concat(flattenTree(children, depth + 1));
        }
      });
      return result;
    };

    return {
      tree: flattenTree(rootElements),
      dateRange: { minDate, maxDate },
    };
  }, [elements, collapsedIds]);

  // Generate months array for timeline header
  const months = useMemo(() => {
    if (!dateRange.minDate || !dateRange.maxDate) return [];

    const result = [];
    let [year, month] = dateRange.minDate.split('-').map(Number);
    const [endYear, endMonth] = dateRange.maxDate.split('-').map(Number);

    while (year < endYear || (year === endYear && month <= endMonth)) {
      result.push({ year, month, key: `${year}-${String(month).padStart(2, '0')}` });
      month++;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
    return result;
  }, [dateRange]);

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const toggleCollapse = (id) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleRowClick = (element) => {
    setSelectedElement(element);
  };

  const handleRowDoubleClick = (element) => {
    // Navigate to element's parent context, then switch to edit mode
    const targetParentId = element.parentId || null;
    if (targetParentId) {
      navigateTo(targetParentId);
    } else {
      navigateToRoot();
    }
    setViewMode('edit');
  };

  // Check if element has children
  const hasChildren = (elementId) => {
    return elements.some((el) => el.parentId === elementId);
  };

  // Calculate bar position and width
  const getBarStyle = (phase) => {
    if (!phase.startMonth || !phase.endMonth || months.length === 0) return null;

    const startIdx = months.findIndex((m) => m.key === phase.startMonth);
    const endIdx = months.findIndex((m) => m.key === phase.endMonth);

    if (startIdx === -1 || endIdx === -1) return null;

    const left = (startIdx / months.length) * 100;
    const width = ((endIdx - startIdx + 1) / months.length) * 100;

    return { left: `${left}%`, width: `${width}%` };
  };

  return (
    <div className="flex-1 h-full bg-white overflow-auto">
      <div className="min-w-[800px]">
        {/* Header */}
        <div className="flex border-b border-gray-300 bg-gray-50 sticky top-0 z-10">
          <div className="w-64 flex-shrink-0 px-4 py-2 font-semibold text-sm text-gray-700 border-r border-gray-300">
            Element
          </div>
          <div className="flex-1 flex">
            {months.map((m) => (
              <div
                key={m.key}
                className="flex-1 px-1 py-2 text-xs text-center text-gray-600 border-r border-gray-200"
                style={{ minWidth: '40px' }}
              >
                <div>{monthNames[m.month - 1]}</div>
                <div className="text-gray-400">{m.year}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Rows */}
        {tree.map((element) => (
          <div
            key={element.id}
            className="flex border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
            onClick={() => handleRowClick(element)}
            onDoubleClick={() => handleRowDoubleClick(element)}
          >
            {/* Element name column */}
            <div
              className="w-64 flex-shrink-0 px-4 py-2 flex items-center gap-2 border-r border-gray-200"
              style={{ paddingLeft: `${16 + element.depth * 16}px` }}
            >
              {hasChildren(element.id) ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCollapse(element.id);
                  }}
                  className="p-0.5 hover:bg-gray-200 rounded"
                >
                  {collapsedIds.has(element.id) ? (
                    <ChevronRight className="w-3 h-3 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-gray-500" />
                  )}
                </button>
              ) : (
                <span className="w-4" />
              )}
              <span className="text-gray-500">{getIcon(element.type)}</span>
              <span className="text-sm truncate">{element.name || 'Unnamed'}</span>
            </div>

            {/* Timeline column */}
            <div className="flex-1 relative py-1">
              {(element.phases || []).map((phase) => {
                const style = getBarStyle(phase);
                if (!style) return null;
                return (
                  <div
                    key={phase.id}
                    className={`absolute top-1 bottom-1 ${getPhaseColor(phase.name)} rounded text-xs text-white flex items-center px-2 overflow-hidden`}
                    style={style}
                    title={`${phase.name}: ${phase.startMonth} → ${phase.endMonth}`}
                  >
                    <span className="truncate">{phase.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {tree.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No elements with timeline data. Add phases to elements in the Properties panel.
          </div>
        )}
      </div>
    </div>
  );
};

export default GanttView;
