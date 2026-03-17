import { useState } from "react";
import { Palette, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import cosmicImg from "@/assets/themes/cosmic.jpg";
import geometricImg from "@/assets/themes/geometric.jpg";
import auroraImg from "@/assets/themes/aurora.jpg";
import deepOceanImg from "@/assets/themes/deep-ocean.jpg";
import topographyImg from "@/assets/themes/topography.jpg";
import bokehImg from "@/assets/themes/bokeh.jpg";
import concreteImg from "@/assets/themes/concrete.jpg";
import smokeImg from "@/assets/themes/smoke.jpg";
import marbleImg from "@/assets/themes/marble.jpg";
import linenImg from "@/assets/themes/linen.jpg";

export interface BoardTheme {
  id: string;
  name: string;
  preview: string;
  bg: string;
  type: "gradient" | "image";
}

export const BOARD_THEMES: BoardTheme[] = [
  // ── Gradientes ──
  {
    id: "default",
    name: "Padrão",
    preview: "linear-gradient(135deg, hsl(0, 0%, 9%), hsl(0, 0%, 12%))",
    bg: "",
    type: "gradient",
  },
  {
    id: "ocean",
    name: "Ocean",
    preview: "linear-gradient(135deg, hsl(200, 30%, 10%), hsl(195, 35%, 15%))",
    bg: "linear-gradient(135deg, hsl(200, 30%, 9%), hsl(195, 35%, 14%))",
    type: "gradient",
  },
  {
    id: "forest",
    name: "Forest",
    preview: "linear-gradient(135deg, hsl(150, 20%, 8%), hsl(140, 25%, 13%))",
    bg: "linear-gradient(135deg, hsl(150, 20%, 8%), hsl(140, 25%, 13%))",
    type: "gradient",
  },
  {
    id: "sunset",
    name: "Sunset",
    preview: "linear-gradient(135deg, hsl(15, 25%, 10%), hsl(25, 35%, 14%))",
    bg: "linear-gradient(135deg, hsl(15, 25%, 9%), hsl(25, 35%, 13%))",
    type: "gradient",
  },
  {
    id: "purple",
    name: "Nebula",
    preview: "linear-gradient(135deg, hsl(270, 20%, 10%), hsl(280, 25%, 15%))",
    bg: "linear-gradient(135deg, hsl(270, 20%, 9%), hsl(280, 25%, 14%))",
    type: "gradient",
  },
  {
    id: "midnight",
    name: "Midnight",
    preview: "linear-gradient(135deg, hsl(230, 15%, 8%), hsl(225, 20%, 13%))",
    bg: "linear-gradient(135deg, hsl(230, 15%, 7%), hsl(225, 20%, 12%))",
    type: "gradient",
  },
  {
    id: "rose",
    name: "Rosé",
    preview: "linear-gradient(135deg, hsl(345, 18%, 10%), hsl(340, 22%, 15%))",
    bg: "linear-gradient(135deg, hsl(345, 18%, 9%), hsl(340, 22%, 14%))",
    type: "gradient",
  },
  // ── Imagens IA ──
  {
    id: "img-cosmic",
    name: "Cosmic",
    preview: `url(${cosmicImg})`,
    bg: cosmicImg,
    type: "image",
  },
  {
    id: "img-geometric",
    name: "Geometric",
    preview: `url(${geometricImg})`,
    bg: geometricImg,
    type: "image",
  },
  {
    id: "img-aurora",
    name: "Aurora",
    preview: `url(${auroraImg})`,
    bg: auroraImg,
    type: "image",
  },
  {
    id: "img-deep-ocean",
    name: "Deep Ocean",
    preview: `url(${deepOceanImg})`,
    bg: deepOceanImg,
    type: "image",
  },
  {
    id: "img-topography",
    name: "Topografia",
    preview: `url(${topographyImg})`,
    bg: topographyImg,
    type: "image",
  },
  {
    id: "img-bokeh",
    name: "Bokeh",
    preview: `url(${bokehImg})`,
    bg: bokehImg,
    type: "image",
  },
];

interface BoardThemePickerProps {
  currentTheme: string;
  onThemeChange: (themeId: string) => void;
}

const BoardThemePicker = ({ currentTheme, onThemeChange }: BoardThemePickerProps) => {
  const [open, setOpen] = useState(false);

  const gradientThemes = BOARD_THEMES.filter((t) => t.type === "gradient");
  const imageThemes = BOARD_THEMES.filter((t) => t.type === "image");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <Palette className="w-3.5 h-3.5" />
          Tema
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="end">
        {/* Gradientes */}
        <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
          <Palette className="w-3 h-3" /> Gradientes
        </p>
        <div className="grid grid-cols-2 gap-2">
          {gradientThemes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                onThemeChange(theme.id);
                setOpen(false);
              }}
              className={cn(
                "flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all",
                currentTheme === theme.id
                  ? "border-primary ring-1 ring-primary/30 bg-muted/50"
                  : "border-border hover:border-primary/30"
              )}
            >
              <div
                className="w-full h-8 rounded"
                style={{ background: theme.preview }}
              />
              <span className="text-[10px] font-medium">{theme.name}</span>
            </button>
          ))}
        </div>

        {/* Imagens */}
        <p className="text-xs font-medium mt-3 mb-2 flex items-center gap-1.5">
          <ImageIcon className="w-3 h-3" /> Imagens
        </p>
        <div className="grid grid-cols-3 gap-2">
          {imageThemes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                onThemeChange(theme.id);
                setOpen(false);
              }}
              className={cn(
                "flex flex-col items-center gap-1.5 p-1.5 rounded-lg border transition-all",
                currentTheme === theme.id
                  ? "border-primary ring-1 ring-primary/30 bg-muted/50"
                  : "border-border hover:border-primary/30"
              )}
            >
              <div
                className="w-full h-10 rounded bg-cover bg-center"
                style={{ backgroundImage: theme.preview }}
              />
              <span className="text-[9px] font-medium leading-tight truncate w-full text-center">
                {theme.name}
              </span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default BoardThemePicker;

// Apply theme: sets CSS vars for the board area background
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
