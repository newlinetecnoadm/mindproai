import { useState } from "react";
import { Palette } from "lucide-react";
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
  preview: string; // gradient/color for preview swatch
  bg: string; // CSS value applied ONLY to the board background
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: "default",
    name: "Padrão",
    preview: "linear-gradient(135deg, hsl(215, 28%, 10%), hsl(215, 25%, 13%))",
    bg: "",
  },
  {
    id: "ocean",
    name: "Ocean",
    preview: "linear-gradient(135deg, hsl(210, 50%, 12%), hsl(200, 60%, 18%))",
    bg: "linear-gradient(135deg, hsl(210, 50%, 10%), hsl(200, 60%, 16%))",
  },
  {
    id: "forest",
    name: "Forest",
    preview: "linear-gradient(135deg, hsl(150, 30%, 8%), hsl(140, 35%, 14%))",
    bg: "linear-gradient(135deg, hsl(150, 30%, 8%), hsl(140, 35%, 14%))",
  },
  {
    id: "sunset",
    name: "Sunset",
    preview: "linear-gradient(135deg, hsl(15, 40%, 10%), hsl(25, 50%, 15%))",
    bg: "linear-gradient(135deg, hsl(15, 40%, 9%), hsl(25, 50%, 14%))",
  },
  {
    id: "purple",
    name: "Nebula",
    preview: "linear-gradient(135deg, hsl(270, 35%, 10%), hsl(280, 40%, 16%))",
    bg: "linear-gradient(135deg, hsl(270, 35%, 9%), hsl(280, 40%, 15%))",
  },
  {
    id: "midnight",
    name: "Midnight",
    preview: "linear-gradient(135deg, hsl(230, 30%, 8%), hsl(225, 35%, 14%))",
    bg: "linear-gradient(135deg, hsl(230, 30%, 7%), hsl(225, 35%, 13%))",
  },
  {
    id: "rose",
    name: "Rosé",
    preview: "linear-gradient(135deg, hsl(345, 30%, 10%), hsl(340, 35%, 16%))",
    bg: "linear-gradient(135deg, hsl(345, 30%, 9%), hsl(340, 35%, 15%))",
  },
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
      <PopoverContent className="w-56 p-3" align="end">
        <p className="text-xs font-medium mb-2">Fundo do Board</p>
        <div className="grid grid-cols-2 gap-2">
          {BOARD_THEMES.map((theme) => (
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
      </PopoverContent>
    </Popover>
  );
};

export default BoardThemePicker;

// Apply theme: only sets a CSS var for the board area background
export const applyBoardTheme = (themeId: string) => {
  const theme = BOARD_THEMES.find((t) => t.id === themeId);
  const root = document.documentElement;
  if (theme && theme.bg) {
    root.style.setProperty("--board-bg", theme.bg);
  } else {
    root.style.removeProperty("--board-bg");
  }
};

export const removeBoardTheme = () => {
  document.documentElement.style.removeProperty("--board-bg");
};
