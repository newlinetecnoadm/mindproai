import type { CSSProperties } from 'react'
import type { Node } from '@xyflow/react'

const BASE: CSSProperties = {
  boxSizing: 'border-box',
}

export const BRAND_GRAY = "#3d3d3d";

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
    borderRadius: '12px', // Consistency with OrgNode
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
  'swimlane': {
    ...BASE,
    background: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '0',
  },
  'wireframe': {
    ...BASE,
    background: '#ffffff',
    border: '1px dashed #6c757d',
    borderRadius: '4px',
  },
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
  level: number = 1,
  branchHex?: string
): CSSProperties {
  let style: CSSProperties = {}

  if (diagramType === 'mindmap' || diagramType === 'mindMap') {
    if (isRoot) {
      style = getNodeStyle('mindmap-root')
    } else if (level === 1) {
      // Level 1: Filled pill with hierarchy color
      style = { 
        ...getNodeStyle('mindmap-l1'), 
        background: branchHex || '#f3f4f6', 
        color: '#ffffff', 
        borderRadius: '20px', 
        padding: '6px 16px',
        fontWeight: '600'
      }
    } else {
      // Level 2+: Transparent with hierarchy color in text
      style = { 
        ...getNodeStyle('mindmap-l2'), 
        color: branchHex || BRAND_GRAY,
        padding: '4px 8px' 
      }
    }
  } else if (diagramType === 'flowchart') {
    style = getNodeStyle('flowchart-process')
  } else if (diagramType === 'org' || diagramType === 'orgchart' || diagramType === 'org_mindmap' || diagramType === 'orgMindMap') {
    if (isRoot) style = getNodeStyle('orgchart-root')
    else {
      // Org chart nodes at Level 1 are also filled by default in the mindmap-like system
      const isFilled = level === 1;
      if (isFilled) {
        style = { 
          ...getNodeStyle('orgchart-child'), 
          background: branchHex || '#ffffff',
          color: branchHex ? '#ffffff' : BRAND_GRAY 
        }
      } else {
        style = { 
          ...getNodeStyle('orgchart-child'), 
          background: 'transparent',
          border: 'none',
          color: branchHex || BRAND_GRAY 
        }
      }
    }
  } else if (diagramType === 'timeline') {
    style = getNodeStyle('timeline-event')
  } else if (diagramType === 'concept' || diagramType === 'concept_map') {
    style = isRoot ? getNodeStyle('concept-root') : { ...getNodeStyle('concept-child'), background: branchHex || '#ffffff' }
    if (branchHex && !isRoot) style.color = '#ffffff'
  } else if (diagramType === 'swimlane') {
    style = getNodeStyle('swimlane')
  } else if (diagramType === 'wireframe') {
    style = getNodeStyle('wireframe')
  } else {
    style = getNodeStyle('default')
  }

  return style
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
