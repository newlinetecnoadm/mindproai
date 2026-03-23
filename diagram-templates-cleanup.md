# Diagram Templates Cleanup Plan

## Overview
Remove all diagram templates and models, keeping only the "blank mental map".

## Success Criteria
- [ ] No more flowchart, orgchart, or other templates in "New Diagram" page.
- [ ] No filters for other diagram types in the list view.
- [ ] Landing page updated to show only Mindmaps.

## Task Breakdown
1. **Analysis**: Confirm which files define the templates. [x]
2. **New Diagram Flow**: Update `NewDiagram.tsx` to remove options. [ ]
3. **List View Cleanup**: Update `DiagramList.tsx` filters and UI. [ ]
4. **Landing Page Update**: Update `Index.tsx` metadata. [ ]
5. **Verification**: Run audit scripts. [ ]
