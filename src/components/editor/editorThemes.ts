export interface EditorTheme {
  id: string;
  name: string;
  emoji: string;
  bg: string;
  dotColor: string;
  edgeColor: string;
  minimapBg: string;
  minimapMask: string;
  edgeStrokeWidth: number;
  edgeAnimation: "none" | "dash" | "flow" | "pulse" | "glow" | "neon";
  edgeDashArray?: string;
  edgeOpacity?: number;
  isCustom?: boolean;
}

export const editorThemes: EditorTheme[] = [
  // ── Light themes ──
  {
    id: "default",
    name: "Padrão",
    emoji: "⚡",
    bg: "#fcfcfc",
    dotColor: "#e5e5e5",
    edgeColor: "#a3a3a3",
    minimapBg: "#ffffff",
    minimapMask: "rgba(252,252,252,0.7)",
    edgeStrokeWidth: 2,
    edgeAnimation: "none",
  },
  {
    id: "lavender",
    name: "Lavanda",
    emoji: "💜",
    bg: "#f5f0ff",
    dotColor: "#e0d4f5",
    edgeColor: "#9b7ed8",
    minimapBg: "#f5f0ff",
    minimapMask: "rgba(245,240,255,0.7)",
    edgeStrokeWidth: 2,
    edgeAnimation: "none",
  },
  {
    id: "peach",
    name: "Pêssego",
    emoji: "🍑",
    bg: "#fff5ee",
    dotColor: "#f0ddd0",
    edgeColor: "#e8926a",
    minimapBg: "#fff5ee",
    minimapMask: "rgba(255,245,238,0.7)",
    edgeStrokeWidth: 2,
    edgeAnimation: "none",
  },
  {
    id: "mint",
    name: "Menta",
    emoji: "🌿",
    bg: "#f0faf5",
    dotColor: "#d0e8dc",
    edgeColor: "#34a872",
    minimapBg: "#f0faf5",
    minimapMask: "rgba(240,250,245,0.7)",
    edgeStrokeWidth: 2,
    edgeAnimation: "none",
  },
  {
    id: "sky",
    name: "Céu",
    emoji: "☁️",
    bg: "#f0f7ff",
    dotColor: "#d0e2f5",
    edgeColor: "#4a9ee8",
    minimapBg: "#f0f7ff",
    minimapMask: "rgba(240,247,255,0.7)",
    edgeStrokeWidth: 2,
    edgeAnimation: "none",
  },
  {
    id: "sand",
    name: "Areia",
    emoji: "🏖️",
    bg: "#faf6f0",
    dotColor: "#e8dcc8",
    edgeColor: "#b89a6a",
    minimapBg: "#faf6f0",
    minimapMask: "rgba(250,246,240,0.7)",
    edgeStrokeWidth: 2,
    edgeAnimation: "none",
  },
  {
    id: "rose",
    name: "Rosa",
    emoji: "🌸",
    bg: "#fff0f5",
    dotColor: "#f0d0dd",
    edgeColor: "#e0608a",
    minimapBg: "#fff0f5",
    minimapMask: "rgba(255,240,245,0.7)",
    edgeStrokeWidth: 2,
    edgeAnimation: "none",
  },
  {
    id: "blueprint",
    name: "Blueprint",
    emoji: "📐",
    bg: "#eaf2fb",
    dotColor: "#c8daf0",
    edgeColor: "#2b6cb0",
    minimapBg: "#eaf2fb",
    minimapMask: "rgba(234,242,251,0.7)",
    edgeStrokeWidth: 1.5,
    edgeAnimation: "dash",
    edgeDashArray: "4 4",
  },
  // ── Dark themes ──
  {
    id: "night",
    name: "Noturno",
    emoji: "🌙",
    bg: "#0f172a",
    dotColor: "#1e293b",
    edgeColor: "#6366f1",
    minimapBg: "#1e293b",
    minimapMask: "rgba(15,23,42,0.7)",
    edgeStrokeWidth: 2,
    edgeAnimation: "glow",
    edgeOpacity: 0.9,
  },
  {
    id: "ocean",
    name: "Oceano",
    emoji: "🌊",
    bg: "#0c1929",
    dotColor: "#1a3050",
    edgeColor: "#38bdf8",
    minimapBg: "#132640",
    minimapMask: "rgba(12,25,41,0.7)",
    edgeStrokeWidth: 2,
    edgeAnimation: "dash",
    edgeDashArray: "6 3",
  },
  {
    id: "carbon",
    name: "Carbono",
    emoji: "🖤",
    bg: "#1a1a1a",
    dotColor: "#2a2a2a",
    edgeColor: "#e040fb",
    minimapBg: "#1a1a1a",
    minimapMask: "rgba(26,26,26,0.7)",
    edgeStrokeWidth: 2.5,
    edgeAnimation: "neon",
    edgeOpacity: 0.95,
  },
];

export function createCustomTheme(bg: string, edgeColor: string): EditorTheme {
  const isDark = isColorDark(bg);
  return {
    id: "custom",
    name: "Personalizado",
    emoji: "🎯",
    bg,
    dotColor: isDark ? lighten(bg, 15) : darken(bg, 8),
    edgeColor,
    minimapBg: isDark ? lighten(bg, 8) : bg,
    minimapMask: `${bg}b3`,
    edgeStrokeWidth: 2,
    edgeAnimation: "none",
    isCustom: true,
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.substring(0, 2), 16), parseInt(h.substring(2, 4), 16), parseInt(h.substring(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("");
}

export function isColorDark(hex: string): boolean {
  try {
    const [r, g, b] = hexToRgb(hex);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  } catch {
    return false;
  }
}

function lighten(hex: string, percent: number): string {
  try {
    const [r, g, b] = hexToRgb(hex);
    const amt = (255 * percent) / 100;
    return rgbToHex(r + amt, g + amt, b + amt);
  } catch {
    return hex;
  }
}

function darken(hex: string, percent: number): string {
  try {
    const [r, g, b] = hexToRgb(hex);
    const amt = (255 * percent) / 100;
    return rgbToHex(r - amt, g - amt, b - amt);
  } catch {
    return hex;
  }
}
