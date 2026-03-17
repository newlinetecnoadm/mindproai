import { useState } from "react";
import { Palette, Mountain, Shapes, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// ── Image imports ──
import geoHexagonImg from "@/assets/themes/geo-hexagon.jpg";
import geoLowpolyImg from "@/assets/themes/geo-lowpoly.jpg";
import geoGridImg from "@/assets/themes/geo-grid.jpg";
import landMountainsImg from "@/assets/themes/land-mountains.jpg";
import landOceanImg from "@/assets/themes/land-ocean.jpg";
import landForestImg from "@/assets/themes/land-forest.jpg";
import texMarbleImg from "@/assets/themes/tex-marble.jpg";
import texConcreteImg from "@/assets/themes/tex-concrete.jpg";
import absSmokeImg from "@/assets/themes/abs-smoke.jpg";
import absFluidImg from "@/assets/themes/abs-fluid.jpg";

export interface BoardTheme {
  id: string;
  name: string;
  preview: string;
  bg: string;
  type: "gradient" | "image";
  category: "color" | "geometric" | "landscape" | "texture" | "abstract";
}

export const BOARD_THEMES: BoardTheme[] = [
  // ── Cores / Gradientes ──
  {
    id: "default",
    name: "Padrão",
    preview: "linear-gradient(135deg, hsl(0,0%,9%), hsl(0,0%,12%))",
    bg: "",
    type: "gradient",
    category: "color",
  },
  {
    id: "charcoal",
    name: "Carvão",
    preview: "linear-gradient(135deg, hsl(0,0%,7%), hsl(20,8%,12%))",
    bg: "linear-gradient(135deg, hsl(0,0%,7%), hsl(20,8%,12%))",
    type: "gradient",
    category: "color",
  },
  {
    id: "ember",
    name: "Brasa",
    preview: "linear-gradient(135deg, hsl(15,15%,8%), hsl(25,30%,12%))",
    bg: "linear-gradient(135deg, hsl(15,15%,8%), hsl(25,30%,12%))",
    type: "gradient",
    category: "color",
  },
  {
    id: "slate",
    name: "Ardósia",
    preview: "linear-gradient(135deg, hsl(210,8%,8%), hsl(200,10%,13%))",
    bg: "linear-gradient(135deg, hsl(210,8%,8%), hsl(200,10%,13%))",
    type: "gradient",
    category: "color",
  },
  {
    id: "olive",
    name: "Oliva",
    preview: "linear-gradient(135deg, hsl(80,8%,8%), hsl(70,12%,12%))",
    bg: "linear-gradient(135deg, hsl(80,8%,8%), hsl(70,12%,12%))",
    type: "gradient",
    category: "color",
  },
  {
    id: "wine",
    name: "Vinho",
    preview: "linear-gradient(135deg, hsl(345,12%,8%), hsl(340,18%,12%))",
    bg: "linear-gradient(135deg, hsl(345,12%,8%), hsl(340,18%,12%))",
    type: "gradient",
    category: "color",
  },

  // ── Geométrico ──
  {
    id: "geo-hexagon",
    name: "Hexagonal",
    preview: `url(${geoHexagonImg})`,
    bg: geoHexagonImg,
    type: "image",
    category: "geometric",
  },
  {
    id: "geo-lowpoly",
    name: "Low Poly",
    preview: `url(${geoLowpolyImg})`,
    bg: geoLowpolyImg,
    type: "image",
    category: "geometric",
  },
  {
    id: "geo-grid",
    name: "Grid",
    preview: `url(${geoGridImg})`,
    bg: geoGridImg,
    type: "image",
    category: "geometric",
  },

  // ── Paisagem ──
  {
    id: "land-mountains",
    name: "Montanhas",
    preview: `url(${landMountainsImg})`,
    bg: landMountainsImg,
    type: "image",
    category: "landscape",
  },
  {
    id: "land-ocean",
    name: "Oceano",
    preview: `url(${landOceanImg})`,
    bg: landOceanImg,
    type: "image",
    category: "landscape",
  },
  {
    id: "land-forest",
    name: "Floresta",
    preview: `url(${landForestImg})`,
    bg: landForestImg,
    type: "image",
    category: "landscape",
  },

  // ── Textura ──
  {
    id: "tex-marble",
    name: "Mármore",
    preview: `url(${texMarbleImg})`,
    bg: texMarbleImg,
    type: "image",
    category: "texture",
  },
  {
    id: "tex-concrete",
    name: "Concreto",
    preview: `url(${texConcreteImg})`,
    bg: texConcreteImg,
    type: "image",
    category: "texture",
  },

  // ── Abstrato ──
  {
    id: "abs-smoke",
    name: "Fumaça",
    preview: `url(${absSmokeImg})`,
    bg: absSmokeImg,
    type: "image",
    category: "abstract",
  },
  {
    id: "abs-fluid",
    name: "Fluido",
    preview: `url(${absFluidImg})`,
    bg: absFluidImg,
    type: "image",
    category: "abstract",
  },
];

interface CategorySection {
  key: BoardTheme["category"];
  label: string;
  icon: React.ReactNode;
  cols: number;
}

const CATEGORIES: CategorySection[] = [
  { key: "color", label: "Cores", icon: <Palette className="w-3 h-3" />, cols: 3 },
  { key: "geometric", label: "Geométrico", icon: <Shapes className="w-3 h-3" />, cols: 3 },
  { key: "landscape", label: "Paisagem", icon: <Mountain className="w-3 h-3" />, cols: 3 },
  { key: "texture", label: "Textura", icon: <Layers className="w-3 h-3" />, cols: 2 },
  { key: "abstract", label: "Abstrato", icon: <Sparkles className="w-3 h-3" />, cols: 2 },
];

interface BoardThemePickerProps {
  currentTheme: string;
  onThemeChange: (themeId: string) => void;
}

const BoardThemePicker = ({ currentTheme, onThemeChange }: BoardThemePickerProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <Palette className="w-3.5 h-3.5" />
          Tema
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 max-h-[420px] overflow-y-auto" align="end">
        {CATEGORIES.map((cat, idx) => {
          const themes = BOARD_THEMES.filter((t) => t.category === cat.key);
          if (!themes.length) return null;
          const isImage = cat.key !== "color";

          return (
            <div key={cat.key} className={cn(idx > 0 && "mt-3")}>
              <p className="text-xs font-medium mb-2 flex items-center gap-1.5 text-muted-foreground">
                {cat.icon} {cat.label}
              </p>
              <div className={cn("grid gap-2", `grid-cols-${cat.cols}`)}>
                {themes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      onThemeChange(theme.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex flex-col items-center gap-1 p-1.5 rounded-lg border transition-all",
                      currentTheme === theme.id
                        ? "border-primary ring-1 ring-primary/30 bg-muted/50"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <div
                      className={cn("w-full rounded", isImage ? "h-12 bg-cover bg-center" : "h-8")}
                      style={
                        isImage
                          ? { backgroundImage: theme.preview }
                          : { background: theme.preview }
                      }
                    />
                    <span className="text-[9px] font-medium leading-tight truncate w-full text-center">
                      {theme.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
};

export default BoardThemePicker;

export const applyBoardTheme = (themeId: string) => {
  const theme = BOARD_THEMES.find((t) => t.id === themeId);
  const root = document.documentElement;

  if (!theme || !theme.bg) {
    root.style.removeProperty("--board-bg");
    root.style.removeProperty("--board-bg-image");
    return;
  }

  if (theme.type === "image") {
    root.style.removeProperty("--board-bg");
    root.style.setProperty("--board-bg-image", `url(${theme.bg})`);
  } else {
    root.style.setProperty("--board-bg", theme.bg);
    root.style.removeProperty("--board-bg-image");
  }
};

export const removeBoardTheme = () => {
  document.documentElement.style.removeProperty("--board-bg");
  document.documentElement.style.removeProperty("--board-bg-image");
};
