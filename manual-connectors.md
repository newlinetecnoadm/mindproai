# Manual Connectors (Dashed Annotations) Plan

## Overview
The goal is to replace the current manual connector system with a new visual standard for annotations: a dashed arrow featuring a central, interactive control point to allow users to smoothly adjust the curve (bezier) of the line, similar to the provided reference images. The new system will be exclusively used for manual connections across all diagram modes.

## Project Type
WEB (React Flow / MindPro AI diagram module)

## Success Criteria
- [ ] Users can trigger the "Adicionar conexão" flow from the node floating toolbar or context menu.
- [ ] Manual connections are rendered as visually distinct dashed green arrows (`strokeDasharray`, `strokeEnd` arrow marker).
- [ ] Every manual connection has a central, interactive control point.
- [ ] Dragging the control point updates the edge's curvature (quadratic bezier curve) in real-time.
- [ ] Saving/Loading diagram state serializes the custom control point coordinates correctly.
- [ ] The interaction works seamlessly with `DiagramEditorCore.tsx` and custom React Flow edge implementations.

## Tech Stack
- **React Flow**: Core diagramming library. We will use a custom `<BaseEdge>` drawing an SVG `<path>` and `<EdgeLabelRenderer>` to attach a draggable DOM node to the edge's midpoint.
- **Tailwind CSS**: For styling the draggable control point.
- **Lucide Icons**: Not strictly needed for the edge, but used in toolbars if changes are required.

## File Structure
- `src/components/editor/edges/DashedAnnotationEdge.tsx` (NOVO/UPDATE)
- `src/components/editor/DiagramEditorCore.tsx` (MODIFIED - to handle control point updates and dragging logic)
- `src/components/editor/NodeFloatingToolbar.tsx` (MODIFIED - to align "Adicionar conexão" button design)

## Task Breakdown

### Task 1: Create `DashedAnnotationEdge`
- **Agent**: `frontend-specialist`
- **Skill**: `nextjs-react-expert`
- **Input**: Current `CustomEdges.tsx` implementation.
- **Output**: A new Edge component that reads an optional `data.controlPoint` from edge properties. If `controlPoint` is missing, it calculates a default midpoint. It renders an SVG `<path>` using a quadratic bezier (`M source Q cx cy target`) with dashed styling. It also renders a `<foreignObject>` or `<EdgeLabelRenderer>` exactly at `cx,cy` showing a small, draggable circular handle.
- **Verify**: The edge visually connects two nodes with a dashed line and displays a central handle.

### Task 2: Implement Drag Logic for Edge Control Point
- **Agent**: `frontend-specialist`
- **Skill**: `nextjs-react-expert`
- **Input**: The newly created `DashedAnnotationEdge`.
- **Output**: Event handlers (`onPointerDown`, `window.onPointerMove`, `window.onPointerUp`) hooked into the central handle to update the edge's `data.controlPoint` locally during drag, and dispatching a global state update to `DiagramEditorCore` on drag end using `setEdges()`.
- **Verify**: User can drag the center handle and the curve follows the mouse cursor smoothly. State is correctly persisted in React Flow's edge data.

### Task 3: Integrate with Toolbar & Connection Mode
- **Agent**: `frontend-specialist`
- **Skill**: `frontend-design`
- **Input**: `NodeFloatingToolbar.tsx` and connection mode logic in `DiagramEditorCore.tsx`.
- **Output**: Replace or enhance the current manual connector entry point to match the specific "Adicionar conexão" button style shown in user's mockup. Ensure that newly created manual edges get assigned the `type: "dashed_annotation"` automatically instead of standard lines.
- **Verify**: Clicking the new connection button allows drawing a line to another node; upon completion, a dashed edge with a center handle is spawned.

### Task 4: Verify Persistence and Styling
- **Agent**: `frontend-specialist`
- **Skill**: `webapp-testing`
- **Input**: Full diagram system.
- **Output**: Adjust saving and loading procedures if necessary to ensure `edge.data.controlPoint` is perfectly serialized and re-rendered upon reopening diagrams. Apply final color checks (using green as shown, or matching the theme dynamically properly padded with dashed logic).
- **Verify**: A diagram with curved manual connectors can be exported, re-imported/re-loaded, and still retains the exact curvature shapes.

## Phase X: Verification Checklist
- [ ] Lint: `npm run lint` passes.
- [ ] TypeScript: `npx tsc --noEmit` passes.
- [ ] No build errors.
- [ ] Socratic/Deep Design principles respected: No clichês, the edge control point handle has an appealing interactive state (hover scale, active glow).
- [ ] Edge connection points logic tested on multiple node types (Org, MindMap, Concept).
