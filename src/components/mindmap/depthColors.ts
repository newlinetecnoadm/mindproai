import type { Node, Edge } from "@xyflow/react";

/**
 * Default branch color palette (used for the "default" / neutral theme).
 * Each direct child of root gets a unique color; descendants inherit it.
 */
const BRANCH_COLORS = ["blue", "green", "indigo", "red", "yellow", "orange"];

/** Hex values used for edge strokes in the default theme */
export const BRANCH_HEX: Record<string, string> = {
  blue:    "#4472C4",
  green:   "#70AD47",
  indigo:  "#7B5EA7",
  red:     "#C0392B",
  yellow:  "#D4AC0D",
  orange:  "#E9853A",
  purple:  "#7B5EA7",
  default: "#6B7280",
};

export function getBranchHex(color: string | undefined): string {
  return BRANCH_HEX[color ?? "default"] ?? BRANCH_HEX.default;
}

export function getColorForDepth(depth: number): string {
  if (depth <= 0) return "orange";
  return BRANCH_COLORS[(depth - 1) % BRANCH_COLORS.length];
}

// ─── HSL helpers for theme-derived palettes ──────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hue = 0, sat = 0;
  const lum = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    sat = lum > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: hue = ((b - r) / d + 2) / 6; break;
      case b: hue = ((r - g) / d + 4) / 6; break;
    }
  }
  return [hue * 360, sat * 100, lum * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  const hNorm = ((h % 360) + 360) % 360;
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs((hNorm / 60) % 2 - 1));
  const m = lNorm - c / 2;
  let r = 0, g = 0, b = 0;

  if (hNorm < 60)       { r = c; g = x; b = 0; }
  else if (hNorm < 120) { r = x; g = c; b = 0; }
  else if (hNorm < 180) { r = 0; g = c; b = x; }
  else if (hNorm < 240) { r = 0; g = x; b = c; }
  else if (hNorm < 300) { r = x; g = 0; b = c; }
  else                  { r = c; g = 0; b = x; }

  const toHex = (v: number) =>
    Math.round(Math.max(0, Math.min(255, (v + m) * 255))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generate N distinct but harmonious branch colors from a theme base color.
 * Returns an array of hex strings. Colors vary in hue (±25° steps) and
 * lightness/saturation to keep them visually distinct within the same family.
 */
export function generateThemeBranchColors(baseHex: string, n: number): string[] {
  const [h, s, l] = hexToHsl(baseHex);
  const colors: string[] = [];

  // Hue offsets ±25 around the base, spread evenly up to ±90°
  const hueOffsets = [0, 25, -25, 50, -50, 75, -75, 100, -100];
  // Lightness modifier alternates: slightly darker, slightly lighter
  const lightMods  = [0, -10, +10, -5, +5, -15, +15, -8, +8];

  for (let i = 0; i < n; i++) {
    const hOff = hueOffsets[i % hueOffsets.length];
    const lMod = lightMods[i % lightMods.length];
    const newH = h + hOff;
    const newS = Math.max(30, Math.min(90, s + (i % 2 === 0 ? 5 : -5)));
    const newL = Math.max(30, Math.min(70, l + lMod));
    colors.push(hslToHex(newH, newS, newL));
  }
  return colors;
}

// ─── Tree helpers ─────────────────────────────────────────────────────────────

export function getNodeDepth(nodeId: string, edges: Edge[]): number {
  let depth = 0;
  let current = nodeId;
  const visited = new Set<string>();
  while (true) {
    if (visited.has(current)) break;
    visited.add(current);
    const parentEdge = edges.find((e) => e.target === current);
    if (!parentEdge) break;
    current = parentEdge.source;
    depth++;
  }
  return depth;
}

function findBranchAncestorId(nodeId: string, edges: Edge[]): string | null {
  const chain: string[] = [];
  let current = nodeId;
  const visited = new Set<string>();
  while (true) {
    if (visited.has(current)) break;
    visited.add(current);
    chain.unshift(current);
    const parentEdge = edges.find((e) => e.target === current);
    if (!parentEdge) break;
    current = parentEdge.source;
  }
  if (chain.length >= 2) return chain[1];
  return null;
}

export function buildDepthMap(nodes: Node[], edges: Edge[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const node of nodes) {
    map.set(node.id, getNodeDepth(node.id, edges));
  }
  return map;
}

/**
 * Assign branch colors to all nodes.
 * When themeOptions is provided and not the default theme, branch colors
 * are derived as harmonious variants of the theme's base edgeColor.
 */
export function assignDepthColors(
  nodes: Node[],
  edges: Edge[],
  themeOptions?: { edgeColor?: string; isDefault?: boolean; isDark?: boolean }
): Node[] {
  const depthMap = buildDepthMap(nodes, edges);

  const depth1Nodes = nodes.filter((n) => depthMap.get(n.id) === 1);

  // Palette: default theme uses BRANCH_HEX keys, others use theme-derived hex values
  const useThemePalette = themeOptions?.edgeColor && !themeOptions?.isDefault;
  const themeHexPalette: string[] = useThemePalette
    ? generateThemeBranchColors(themeOptions!.edgeColor!, Math.max(depth1Nodes.length, 6))
    : [];

  const depth1HexMap = new Map<string, string>();
  depth1Nodes.forEach((n, i) => {
    const hex = useThemePalette
      ? themeHexPalette[i % themeHexPalette.length]
      : BRANCH_HEX[BRANCH_COLORS[i % BRANCH_COLORS.length]];
    depth1HexMap.set(n.id, hex);
  });

  return nodes.map((node) => {
    const depth = depthMap.get(node.id) ?? 0;
    const isRoot = (node.data as any)?.isRoot;

    if (isRoot || depth === 0) {
      return {
        ...node,
        hidden: node.hidden,
        data: { ...node.data, branchHex: undefined, color: "root", depth: 0, isDark: themeOptions?.isDark },
      };
    }

    const branchAncestorId = findBranchAncestorId(node.id, edges);
    const branchHex = branchAncestorId ? depth1HexMap.get(branchAncestorId) : undefined;

    const color = branchHex ? "branch" : getColorForDepth(depth);
    return {
      ...node,
      // CRITICAL: preserve node.hidden so collapsed subtrees stay hidden after theme/layout changes
      hidden: node.hidden,
      data: { ...node.data, color, branchHex: branchHex ?? getBranchHex(color), depth, isDark: themeOptions?.isDark },
    };
  });
}

// ─── Theme options type ───────────────────────────────────────────────────────

export type EdgeThemeOptions = {
  edgeColor?: string;
  edgeAnimation?: string;
  edgeDashArray?: string;
  edgeType?: string;
  isDefault?: boolean;
  isDark?: boolean;
};

/**
 * Assign edge colors, types, and animation styles based on branch colors and active theme.
 * Must be called after assignDepthColors.
 *
 * @param nodes      Nodes already processed by assignDepthColors
 * @param edges      Raw edges
 * @param theme      Active theme options (color, animation, dashArray)
 */
export function assignEdgeColors(
  nodes: Node[],
  edges: Edge[],
  theme?: EdgeThemeOptions
): Edge[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const depthMap = buildDepthMap(nodes, edges);

  // Child count per source node
  const childCount = new Map<string, number>();
  for (const e of edges) {
    childCount.set(e.source, (childCount.get(e.source) ?? 0) + 1);
  }

  // Mark ONE collapse edge per parent — ONLY for depth >= 1 sources
  // (i.e., the circle is not shown on edges coming from the root node)
  const collapseEdgeIds = new Set<string>();
  const parentIds = [...new Set(edges.map((e) => e.source))];
  for (const parentId of parentIds) {
    const sourceDepth = depthMap.get(parentId) ?? 0;
    if (sourceDepth < 1) continue; // ← skip root edges

    const childEdges = edges.filter((e) => e.source === parentId);
    if (childEdges.length === 0) continue;
    const midIdx = Math.floor((childEdges.length - 1) / 2);
    collapseEdgeIds.add(childEdges[midIdx].id);
  }

  // Build animation style suffix for this theme
  const animStyle: Record<string, unknown> = {};
  if (theme?.edgeAnimation && theme.edgeAnimation !== "none") {
    animStyle._animation = theme.edgeAnimation;
    if (theme.edgeDashArray) animStyle._dashArray = theme.edgeDashArray;
  }

  return edges.map((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const sourceDepth = depthMap.get(edge.source) ?? 0;
    const isCollapsed = !!(sourceNode?.data as any)?.isCollapsed;
    const isCollapseEdge = collapseEdgeIds.has(edge.id);

    // For edges FROM root (depth 0), the color comes from the TARGET (depth-1 child).
    // For all other edges, the source node carries the branch color.
    const targetNode = nodeMap.get(edge.target);
    const branchHex: string = sourceDepth === 0
      ? ((targetNode?.data as any)?.branchHex ?? BRANCH_HEX.default)
      : ((sourceNode?.data as any)?.branchHex ?? getBranchHex((sourceNode?.data as any)?.color));

    const strokeWidth = sourceDepth === 0 ? 2 : 1.5;

    return {
      ...edge,
      // CRITICAL: preserve edge.hidden so collapsed edges stay hidden after re-coloring
      hidden: edge.hidden,
      type: theme?.edgeType ?? "mindmap",
      style: {
        stroke: branchHex,
        strokeWidth,
        ...animStyle,
      } as React.CSSProperties,
      data: {
        ...(edge.data ?? {}),
        branchColor: branchHex,
        isCollapseEdge,
        isCollapsed,
        sourceNodeId: edge.source,
      },
    };
  });
}
