export interface EditorTheme {
  id: string;
  name: string;
  emoji: string;
  bg: string;
  dotColor: string;
  edgeColor: string;
  nodeColor: string;
  cardBg: string;
  cardBorder: string;
  cardText: string;
  minimapBg: string;
  minimapNode: string;
  minimapMask: string;
}

export const editorThemes: EditorTheme[] = [
  {
    id: "default",
    name: "Padrão",
    emoji: "⚡",
    bg: "hsl(var(--background))",
    dotColor: "hsl(var(--border))",
    edgeColor: "hsl(var(--border))",
    nodeColor: "hsl(var(--primary))",
    cardBg: "hsl(var(--card))",
    cardBorder: "hsl(var(--border))",
    cardText: "hsl(var(--foreground))",
    minimapBg: "hsl(var(--card))",
    minimapNode: "hsl(var(--primary))",
    minimapMask: "hsl(var(--muted) / 0.7)",
  },
  {
    id: "night",
    name: "Noite",
    emoji: "🌙",
    bg: "#0f172a",
    dotColor: "#1e293b",
    edgeColor: "#334155",
    nodeColor: "#6366f1",
    cardBg: "#1e293b",
    cardBorder: "#334155",
    cardText: "#e2e8f0",
    minimapBg: "#1e293b",
    minimapNode: "#6366f1",
    minimapMask: "rgba(15, 23, 42, 0.7)",
  },
  {
    id: "forest",
    name: "Floresta",
    emoji: "🌲",
    bg: "#0c1a0e",
    dotColor: "#1a3a1e",
    edgeColor: "#2d5a32",
    nodeColor: "#22c55e",
    cardBg: "#14291a",
    cardBorder: "#2d5a32",
    cardText: "#d1fae5",
    minimapBg: "#14291a",
    minimapNode: "#22c55e",
    minimapMask: "rgba(12, 26, 14, 0.7)",
  },
  {
    id: "ocean",
    name: "Oceano",
    emoji: "🌊",
    bg: "#0c1929",
    dotColor: "#1a3050",
    edgeColor: "#2563eb",
    nodeColor: "#38bdf8",
    cardBg: "#132640",
    cardBorder: "#1e4080",
    cardText: "#bae6fd",
    minimapBg: "#132640",
    minimapNode: "#38bdf8",
    minimapMask: "rgba(12, 25, 41, 0.7)",
  },
  {
    id: "sunset",
    name: "Pôr do Sol",
    emoji: "🌅",
    bg: "#1c1017",
    dotColor: "#3d1f2a",
    edgeColor: "#9f1239",
    nodeColor: "#fb923c",
    cardBg: "#2a1520",
    cardBorder: "#5c1a30",
    cardText: "#fde68a",
    minimapBg: "#2a1520",
    minimapNode: "#fb923c",
    minimapMask: "rgba(28, 16, 23, 0.7)",
  },
  {
    id: "minimal",
    name: "Minimalista",
    emoji: "✨",
    bg: "#fafafa",
    dotColor: "#e5e5e5",
    edgeColor: "#a3a3a3",
    nodeColor: "#171717",
    cardBg: "#ffffff",
    cardBorder: "#e5e5e5",
    cardText: "#171717",
    minimapBg: "#ffffff",
    minimapNode: "#171717",
    minimapMask: "rgba(250, 250, 250, 0.7)",
  },
];
