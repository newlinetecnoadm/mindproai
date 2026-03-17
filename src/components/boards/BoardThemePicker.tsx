import { useState } from "react";
import { Palette, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface BoardTheme {
  id: string;
  name: string;
  preview: string;       // CSS for the preview swatch
  bg: string;            // value applied to board
  type: "gradient" | "image";
  emoji?: string;
}

// ── Unsplash photos (free, no API key needed at this size) ──
const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?w=1920&h=1080&fit=crop&q=80`;

const PHOTO_THEMES: BoardTheme[] = [
  {
    id: "photo-mountains",
    name: "Montanhas",
    preview: unsplash("photo-1519681393784-d120267933ba"),
    bg: unsplash("photo-1519681393784-d120267933ba"),
    type: "image",
  },
  {
    id: "photo-ocean",
    name: "Oceano",
    preview: unsplash("photo-1507525428034-b723cf961d3e"),
    bg: unsplash("photo-1507525428034-b723cf961d3e"),
    type: "image",
  },
  {
    id: "photo-forest",
    name: "Floresta",
    preview: unsplash("photo-1448375240586-882707db888b"),
    bg: unsplash("photo-1448375240586-882707db888b"),
    type: "image",
  },
  {
    id: "photo-stars",
    name: "Estrelas",
    preview: unsplash("photo-1519681393784-d120267933ba"),
    bg: unsplash("photo-1536746803623-cef87080bfc8"),
    type: "image",
  },
  {
    id: "photo-sunset",
    name: "Pôr do Sol",
    preview: unsplash("photo-1495616811223-4d98c6e9c869"),
    bg: unsplash("photo-1495616811223-4d98c6e9c869"),
    type: "image",
  },
  {
    id: "photo-lake",
    name: "Lago",
    preview: unsplash("photo-1439066615861-d1af74d74000"),
    bg: unsplash("photo-1439066615861-d1af74d74000"),
    type: "image",
  },
  {
    id: "photo-desert",
    name: "Deserto",
    preview: unsplash("photo-1509316785289-025f5b846b35"),
    bg: unsplash("photo-1509316785289-025f5b846b35"),
    type: "image",
  },
  {
    id: "photo-aurora",
    name: "Aurora",
    preview: unsplash("photo-1531366936337-7c912a4589a7"),
    bg: unsplash("photo-1531366936337-7c912a4589a7"),
    type: "image",
  },
];

const GRADIENT_THEMES: BoardTheme[] = [
  {
    id: "default",
    name: "Padrão",
    preview: "linear-gradient(135deg, #1a1a2e, #16213e)",
    bg: "",
    type: "gradient",
    emoji: "🌑",
  },
  {
    id: "midnight",
    name: "Meia-Noite",
    preview: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
    bg: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
    type: "gradient",
    emoji: "🔮",
  },
  {
    id: "arctic",
    name: "Ártico",
    preview: "linear-gradient(135deg, #0083B0, #00B4DB)",
    bg: "linear-gradient(135deg, #0a4d68, #0083B0, #00B4DB)",
    type: "gradient",
    emoji: "❄️",
  },
  {
    id: "sapphire",
    name: "Safira",
    preview: "linear-gradient(135deg, #0F2027, #203A43, #2C5364)",
    bg: "linear-gradient(135deg, #0F2027, #203A43, #2C5364)",
    type: "gradient",
    emoji: "💎",
  },
  {
    id: "aurora",
    name: "Aurora",
    preview: "linear-gradient(135deg, #4a1a6b, #c94b8c, #e56aa0)",
    bg: "linear-gradient(135deg, #2d1045, #6b2158, #c94b8c)",
    type: "gradient",
    emoji: "🌈",
  },
  {
    id: "ember",
    name: "Brasa",
    preview: "linear-gradient(135deg, #f37335, #fdc830)",
    bg: "linear-gradient(135deg, #7a3614, #f37335, #fdc830)",
    type: "gradient",
    emoji: "🍑",
  },
  {
    id: "rose",
    name: "Rosé",
    preview: "linear-gradient(135deg, #ee5a6f, #f09ea1)",
    bg: "linear-gradient(135deg, #6b1d2a, #ee5a6f, #f09ea1)",
    type: "gradient",
    emoji: "🌸",
  },
  {
    id: "emerald",
    name: "Esmeralda",
    preview: "linear-gradient(135deg, #0d9488, #2dd4bf)",
    bg: "linear-gradient(135deg, #064e3b, #0d9488, #2dd4bf)",
    type: "gradient",
    emoji: "🌍",
  },
  {
    id: "cosmos",
    name: "Cosmos",
    preview: "linear-gradient(135deg, #0f172a, #1e293b)",
    bg: "linear-gradient(135deg, #0f172a, #1e293b, #1a2744)",
    type: "gradient",
    emoji: "👽",
  },
  {
    id: "crimson",
    name: "Carmesim",
    preview: "linear-gradient(135deg, #3b0a0a, #7f1d1d, #991b1b)",
    bg: "linear-gradient(135deg, #3b0a0a, #7f1d1d, #991b1b)",
    type: "gradient",
    emoji: "🍄",
  },
];

export const BOARD_THEMES: BoardTheme[] = [...GRADIENT_THEMES, ...PHOTO_THEMES];

// ── Solid accent colors (quick pick row) ──
const SOLID_COLORS = [
  { id: "solid-blue", color: "#0078D4", bg: "#0078D4" },
  { id: "solid-orange", color: "#F57C00", bg: "#F57C00" },
  { id: "solid-green", color: "#00A651", bg: "#00A651" },
  { id: "solid-red", color: "#D32F2F", bg: "#D32F2F" },
  { id: "solid-purple", color: "#7B1FA2", bg: "#7B1FA2" },
  { id: "solid-pink", color: "#E91E90", bg: "#E91E90" },
  { id: "solid-teal", color: "#00897B", bg: "#00897B" },
  { id: "solid-gray", color: "#616161", bg: "#616161" },
];

interface BoardThemePickerProps {
  currentTheme: string;
  onThemeChange: (themeId: string) => void;
}

const BoardThemePicker = ({ currentTheme, onThemeChange }: BoardThemePickerProps) => {
  const [open, setOpen] = useState(false);

  const pick = (themeId: string) => {
    onThemeChange(themeId);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <Palette className="w-3.5 h-3.5" />
          Tema
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[304px] p-3 max-h-[480px] overflow-y-auto" align="end">
        {/* ── Gradient cards ── */}
        <p className="text-xs font-medium mb-2 flex items-center gap-1.5 text-muted-foreground">
          <Palette className="w-3 h-3" /> Cores
        </p>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {GRADIENT_THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              className={cn(
                "relative h-[60px] rounded-lg border transition-all overflow-hidden",
                currentTheme === t.id
                  ? "border-primary ring-2 ring-primary/40"
                  : "border-border hover:border-primary/30"
              )}
              style={{ background: t.preview }}
            >
              {t.emoji && (
                <span className="absolute bottom-1.5 left-2 text-sm drop-shadow-lg">{t.emoji}</span>
              )}
              {currentTheme === t.id && (
                <span className="absolute bottom-1.5 right-2 text-sm">✓</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Solid colors row ── */}
        <div className="flex gap-1.5 mb-3">
          {SOLID_COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => pick(c.id)}
              className={cn(
                "w-8 h-8 rounded-md border transition-all flex-shrink-0",
                currentTheme === c.id
                  ? "border-primary ring-2 ring-primary/40 scale-110"
                  : "border-border hover:scale-105"
              )}
              style={{ backgroundColor: c.color }}
            />
          ))}
        </div>

        {/* ── Photos ── */}
        <p className="text-xs font-medium mb-2 flex items-center gap-1.5 text-muted-foreground">
          <ImageIcon className="w-3 h-3" /> Fotos
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PHOTO_THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              className={cn(
                "relative h-[60px] rounded-lg border transition-all overflow-hidden bg-cover bg-center",
                currentTheme === t.id
                  ? "border-primary ring-2 ring-primary/40"
                  : "border-border hover:border-primary/30"
              )}
              style={{ backgroundImage: `url(${t.preview})` }}
            >
              <div className="absolute inset-0 bg-black/20" />
              <span className="absolute bottom-1 left-2 text-[9px] font-medium text-white drop-shadow-lg">
                {t.name}
              </span>
              {currentTheme === t.id && (
                <span className="absolute bottom-1 right-2 text-sm text-white">✓</span>
              )}
            </button>
          ))}
        </div>

        <p className="text-[8px] text-muted-foreground mt-2 text-center">
          Fotos por Unsplash
        </p>
      </PopoverContent>
    </Popover>
  );
};

export default BoardThemePicker;

// ── Apply / remove theme ──

const getContainer = () =>
  document.getElementById("board-theme-container");

const applyToEl = (themeId: string) => {
  const el = getContainer();
  if (!el) return false;

  // Reset
  el.style.background = "";
  el.style.backgroundImage = "";
  el.style.backgroundSize = "";
  el.style.backgroundPosition = "";

  // Check solid colors
  const solid = SOLID_COLORS.find((c) => c.id === themeId);
  if (solid) {
    el.style.background = solid.bg;
    return true;
  }

  const theme = BOARD_THEMES.find((t) => t.id === themeId);
  if (!theme || !theme.bg) return true;

  if (theme.type === "image") {
    el.style.backgroundImage = `url(${theme.bg})`;
    el.style.backgroundSize = "cover";
    el.style.backgroundPosition = "center";
  } else {
    el.style.background = theme.bg;
  }
  return true;
};

export const applyBoardTheme = (themeId: string) => {
  if (!applyToEl(themeId)) {
    // Element not yet in DOM — retry next frame
    requestAnimationFrame(() => applyToEl(themeId));
  }
};

export const removeBoardTheme = () => {
  const el = getContainer();
  if (!el) return;
  el.style.background = "";
  el.style.backgroundImage = "";
  el.style.backgroundSize = "";
  el.style.backgroundPosition = "";
};
