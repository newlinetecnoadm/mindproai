import type { CSSProperties } from 'react'
import type { Node } from '@xyflow/react'

const BASE: CSSProperties = {
  boxSizing: 'border-box',
}

export const NODE_STYLES: Record<string, CSSProperties> = {
  // ── Mind map — transparent, text-only, no borders ─────────
  'mindmap-root': {
    ...BASE,
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
  },
  'mindmap-l1': {
    ...BASE,
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
  },
  'mindmap-l2': {
    ...BASE,
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
  },

  // ── Flowchart ─────────────────────────────────────────────
  'flowchart-process': {
    ...BASE,
    background: '#ffffff',
    border: '1px solid #b1b1b7',
    borderRadius: '8px',
  },
  'flowchart-decision': {
    ...BASE,
    background: '#FEF9E7',
    border: '1px solid #F39C12',
    borderRadius: '4px',
    transform: 'rotate(45deg)',
  },
  'flowchart-terminal': {
    ...BASE,
    background: '#2C3E50',
    border: 'none',
    borderRadius: '18px',
    color: '#ffffff',
    fontWeight: '600',
  },
  'flowchart-action': {
    ...BASE,
    background: '#EAFAF1',
    border: '1px solid #27AE60',
    borderRadius: '8px',
  },

  // ── Org chart ─────────────────────────────────────────────
  'orgchart-root': {
    ...BASE,
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
    color: '#3d3d3d',
    fontWeight: '700',
  },
  'orgchart-child': {
    ...BASE,
    background: '#ffffff',
    border: '1px solid #b1b1b7',
    borderRadius: '6px',
  },

  // ── Timeline ──────────────────────────────────────────────
  'timeline-event': {
    ...BASE,
    background: '#4472C4',
    border: 'none',
    borderRadius: '18px',
    color: '#ffffff',
    fontWeight: '600',
  },

  // ── Concept map ───────────────────────────────────────────
  'concept-root': {
    ...BASE,
    background: '#2C3E50',
    border: 'none',
    borderRadius: '22px',
    color: '#ffffff',
    fontWeight: '600',
  },
  'concept-child': {
    ...BASE,
    background: '#ffffff',
    border: '1.5px solid #9B59B6',
    borderRadius: '18px',
  },

  // ── Default (swimlane, wireframe, fallback) ───────────────
  'default': {
    ...BASE,
    background: '#ffffff',
    border: '1px solid #b1b1b7',
    borderRadius: '8px',
  },
}

export function getNodeStyle(styleKey: string | undefined): CSSProperties {
  if (!styleKey) return NODE_STYLES['default']
  return NODE_STYLES[styleKey] ?? NODE_STYLES['default']
}

export function buildNodeStyle(
  diagramType: string,
  isRoot: boolean,
  level: number = 1
): CSSProperties {
  if (diagramType === 'mindmap') {
    if (isRoot) return getNodeStyle('mindmap-root')
    if (level === 1) return getNodeStyle('mindmap-l1')
    return getNodeStyle('mindmap-l2')
  }
  if (diagramType === 'flowchart') return getNodeStyle('flowchart-process')
  if (diagramType === 'org') {
    return isRoot ? getNodeStyle('orgchart-root') : getNodeStyle('orgchart-child')
  }
  if (diagramType === 'timeline') return getNodeStyle('timeline-event')
  if (diagramType === 'concept' || diagramType === 'concept_map') {
    return isRoot ? getNodeStyle('concept-root') : getNodeStyle('concept-child')
  }
  return getNodeStyle('default')
}

// Function backwards compatibility for nodes lacking a style or styleKey
export function inferStyleKey(node: Node, diagramType: string): string {
  if (diagramType === 'mindmap') {
    if (node.id === 'root' || node.data?.isRoot) return 'mindmap-root'
    return 'mindmap-l1'
  }
  if (diagramType === 'flowchart') {
    const shape = node.data?.shape as string | undefined
    if (shape === 'diamond') return 'flowchart-decision'
    if (shape === 'oval') return 'flowchart-terminal'
    return 'flowchart-process'
  }
  if (diagramType === 'org' || diagramType === 'orgchart') {
    return node.data?.isRoot ? 'orgchart-root' : 'orgchart-child'
  }
  if (diagramType === 'timeline') {
    return 'timeline-event'
  }
  if (diagramType === 'concept' || diagramType === 'concept_map') {
    return node.data?.isRoot ? 'concept-root' : 'concept-child'
  }
  return 'default'
}
