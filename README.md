# C4 Navigator

A web-based C4 diagramming tool with IcePanel-style click-to-drill-down navigation. Built as a fork of Diagrams with enhanced hierarchical navigation capabilities.

## Features

- **Hierarchical Navigation**: Click into any element to see its children (System → Container → Component)
- **Breadcrumb Trail**: Visual navigation path with click-to-jump
- **Double-Click Drill-Down**: Double-click any element to navigate into it
- **Keyboard Shortcuts**:
  - `Escape` - Navigate up one level
  - `Home` - Return to root/context level
  - `Enter` - Drill into selected element
- **Context-Aware Toolbar**: Shows valid element types based on current level
- **Child Count Badges**: Visual indicators showing number of children per element
- **URL Hash Sharing**: Share diagrams via URL without needing a database
- **JSON Export/Import**: Full model persistence with hierarchy preserved
- **Single-File Deployment**: Entire app is a single HTML file

## Live Demo

Visit: https://jisaf.github.io/system_diagrams/

## Usage

### Creating Diagrams

1. Start at the Context level (root)
2. Add Systems and People using the toolbar
3. Double-click a System to navigate inside it
4. Add Containers within the System
5. Double-click a Container to add Components
6. Connect elements by dragging from handles (dots on element edges)

### Navigation

- **Breadcrumb**: Click any item in the breadcrumb trail to jump to that level
- **Double-click**: Enter an element to see its children
- **Escape key**: Go up one level
- **Home key**: Return to root level

### Sharing

1. Click the **Share** button in the header
2. URL is copied to clipboard with your diagram encoded
3. Share the URL - recipients will see your exact diagram

### Export/Import

- **Export**: Downloads your diagram as a JSON file
- **Import**: Load a previously exported JSON file
- The model includes all hierarchy information (parentId relationships)

## Local Development

The source code is in the `src/` directory if you want to modify the tool:

```bash
# Clone and install
git clone https://github.com/jisaf/system_diagrams.git
cd system_diagrams
npm install

# Development server
npm run dev

# Build standalone HTML (outputs to c4-navigator.html)
npm run build:standalone
```

## File Structure

- `docs/index.html` - Standalone single-file app (served by GitHub Pages)
- `index.html` - Development entry point for Vite
- `src/` - Source code
- `package.json` - Dependencies and scripts

## Deployment

GitHub Pages is configured to serve from the `docs/` folder. After making changes:

```bash
npm run build:standalone
git add docs/index.html
git commit -m "Update build"
git push
```

## Technology Stack

- React 18 + React Flow 12 for the canvas
- Zustand 4 for state management
- Tailwind CSS for styling
- Vite for building
- Custom inline script for single-file output

## License

MIT
