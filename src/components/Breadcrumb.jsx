import { Home, ChevronRight } from 'lucide-react';
import useStore from '../store';

const Breadcrumb = () => {
  const getBreadcrumb = useStore((state) => state.getBreadcrumb);
  const navigateToRoot = useStore((state) => state.navigateToRoot);
  const navigateTo = useStore((state) => state.navigateTo);
  const currentParentId = useStore((state) => state.currentParentId);
  const metadata = useStore((state) => state.metadata);

  const trail = getBreadcrumb();

  return (
    <nav className="flex items-center gap-1 text-sm">
      {/* Home button */}
      <button
        onClick={navigateToRoot}
        className={`flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-200 transition-colors ${
          currentParentId === null ? 'text-blue-600 font-medium' : 'text-gray-600'
        }`}
        title="Go to root view"
      >
        <Home className="w-4 h-4" />
        <span>{metadata.name || 'Model'}</span>
      </button>

      {/* Trail items */}
      {trail.map((element, index) => (
        <div key={element.id} className="flex items-center">
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <button
            onClick={() => navigateTo(element.id)}
            className={`px-2 py-1 rounded hover:bg-gray-200 transition-colors ${
              index === trail.length - 1 ? 'text-blue-600 font-medium' : 'text-gray-600'
            }`}
          >
            {element.name}
          </button>
        </div>
      ))}
    </nav>
  );
};

export default Breadcrumb;
