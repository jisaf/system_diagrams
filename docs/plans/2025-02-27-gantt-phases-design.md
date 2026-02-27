# Gantt Chart & Timeline Phases Design

## Overview

Add timeline phases to elements (systems, containers, components) and a Gantt chart view to visualize project timelines.

## Data Model

Each element gets a new `phases` array property:

```javascript
phases: [
  {
    id: 'phase-123',
    name: 'Discovery',        // From defaults or custom
    startMonth: '2025-01',    // YYYY-MM format
    endMonth: '2025-02',
  },
  {
    id: 'phase-456',
    name: 'Build',
    startMonth: '2025-03',
    endMonth: '2025-05',
  }
]
```

**Default phase names** (suggestions, not required):
- Discovery
- Design
- Build
- Testing
- Deployment
- Maintenance

Users can type custom phase names or pick from defaults.

## Properties Panel UI

Add a **"Timeline"** section below owner fields:

```
┌─────────────────────────────────────────┐
│ Timeline                            [+] │
├─────────────────────────────────────────┤
│ Discovery      Jan 2025 → Feb 2025  [×] │
│ Build          Mar 2025 → May 2025  [×] │
│ Testing        Jun 2025 → Jun 2025  [×] │
└─────────────────────────────────────────┘
```

**Adding a phase:** Click [+] to add a row with:
- Dropdown/text combo for phase name (shows defaults, allows custom)
- Two month pickers (Start / End) using `<input type="month">`
- Delete button [×]

**Validation:** End month must be ≥ start month. Visual warning if invalid.

## Gantt Chart View

New view mode "gantt" alongside "edit" and "tree".

**Layout:**
```
┌──────────────────────────────────────────────────────────────────┐
│ [Edit] [Tree] [Gantt]                              Jan-Jun 2025  │
├──────────────────┬───────────────────────────────────────────────┤
│ Element          │ J   F   M   A   M   J                         │
├──────────────────┼───────────────────────────────────────────────┤
│ ▼ System A       │                                               │
│   Container 1    │ ███ Discovery  ███████ Build                  │
│   Container 2    │         ███████ Build  ██ Test                │
│ ▼ System B       │                                               │
│   API Service    │     ████████████████████████ Build            │
└──────────────────┴───────────────────────────────────────────────┘
```

**Features:**
- Left column: hierarchical element list (collapsible)
- Right side: timeline with month columns
- Colored bars per phase:
  - Discovery = blue
  - Design = purple
  - Build = green
  - Testing = orange
  - Deployment = teal
  - Maintenance = gray
  - Custom = slate
- Hover on bar shows tooltip with phase details
- Scrollable timeline if date range is large
- Auto-calculates visible date range from all phases

## Gantt Interactions

- **Double-click on element row:** Navigate to that element's context in edit view
- **Single-click on element row:** Select element, show Properties Panel
- **Hover on phase bar:** Tooltip with phase name, dates, duration
- **No drag-to-resize:** Edit phases via Properties Panel only (keeps it simple)

## No Dependencies

The Gantt chart shows phases as independent bars. No dependency arrows between components - this keeps implementation simple and avoids complexity.

## Implementation Components

1. **Store changes:** Add `phases` array to element schema
2. **PropertiesPanel:** Add Timeline section with phase editor
3. **GanttView component:** New view with timeline rendering
4. **Header:** Add Gantt button to view mode switcher
5. **Export/Import:** Include phases in JSON and CSV exports
