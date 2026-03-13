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
  vars: Record<string, string>; // CSS custom properties overrides
}

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: "default",
    name: "Padrão",
    preview: "linear-gradient(135deg, hsl(215, 28%, 10%), hsl(215, 25%, 13%))",
    vars: {},
  },
  {
    id: "ocean",
    name: "Ocean",
    preview: "linear-gradient(135deg, hsl(210, 50%, 12%), hsl(200, 60%, 18%))",
    vars: {
      "--background": "210 50% 10%",
      "--card": "210 45% 14%",
      "--card-foreground": "200 20% 90%",
      "--muted": "210 40% 18%",
      "--muted-foreground": "200 15% 55%",
      "--border": "210 35% 22%",
      "--input": "210 35% 22%",
      "--secondary": "210 35% 20%",
      "--secondary-foreground": "200 20% 85%",
      "--accent": "200 50% 15%",
      "--accent-foreground": "200 80% 70%",
      "--primary": "200 80% 50%",
      "--ring": "200 80% 50%",
    },
  },
  {
    id: "forest",
    name: "Forest",
    preview: "linear-gradient(135deg, hsl(150, 30%, 8%), hsl(140, 35%, 14%))",
    vars: {
      "--background": "150 30% 8%",
      "--card": "148 28% 12%",
      "--card-foreground": "140 15% 88%",
      "--muted": "148 25% 16%",
      "--muted-foreground": "140 12% 52%",
      "--border": "148 22% 20%",
      "--input": "148 22% 20%",
      "--secondary": "148 22% 18%",
      "--secondary-foreground": "140 15% 82%",
      "--accent": "142 40% 14%",
      "--accent-foreground": "142 60% 65%",
      "--primary": "142 70% 45%",
      "--ring": "142 70% 45%",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    preview: "linear-gradient(135deg, hsl(15, 40%, 10%), hsl(25, 50%, 15%))",
    vars: {
      "--background": "15 40% 9%",
      "--card": "18 35% 13%",
      "--card-foreground": "20 20% 90%",
      "--muted": "18 30% 17%",
      "--muted-foreground": "20 15% 55%",
      "--border": "18 28% 21%",
      "--input": "18 28% 21%",
      "--secondary": "18 28% 19%",
      "--secondary-foreground": "20 18% 84%",
      "--accent": "25 45% 15%",
      "--accent-foreground": "25 80% 65%",
      "--primary": "25 90% 55%",
      "--ring": "25 90% 55%",
    },
  },
  {
    id: "purple",
    name: "Nebula",
    preview: "linear-gradient(135deg, hsl(270, 35%, 10%), hsl(280, 40%, 16%))",
    vars: {
      "--background": "270 35% 9%",
      "--card": "272 30% 13%",
      "--card-foreground": "270 15% 90%",
      "--muted": "272 28% 17%",
      "--muted-foreground": "270 12% 55%",
      "--border": "272 25% 21%",
      "--input": "272 25% 21%",
      "--secondary": "272 25% 19%",
      "--secondary-foreground": "270 15% 84%",
      "--accent": "280 40% 16%",
      "--accent-foreground": "280 70% 70%",
      "--primary": "275 70% 55%",
      "--ring": "275 70% 55%",
    },
  },
  {
    id: "midnight",
    name: "Midnight",
    preview: "linear-gradient(135deg, hsl(230, 30%, 8%), hsl(225, 35%, 14%))",
    vars: {
      "--background": "230 30% 7%",
      "--card": "228 28% 11%",
      "--card-foreground": "225 15% 88%",
      "--muted": "228 25% 15%",
      "--muted-foreground": "225 12% 50%",
      "--border": "228 22% 19%",
      "--input": "228 22% 19%",
      "--secondary": "228 22% 17%",
      "--secondary-foreground": "225 15% 82%",
      "--accent": "225 35% 14%",
      "--accent-foreground": "225 60% 68%",
      "--primary": "220 70% 55%",
      "--ring": "220 70% 55%",
    },
  },
  {
    id: "rose",
    name: "Rosé",
    preview: "linear-gradient(135deg, hsl(345, 30%, 10%), hsl(340, 35%, 16%))",
    vars: {
      "--background": "345 30% 9%",
      "--card": "343 28% 13%",
      "--card-foreground": "340 15% 90%",
      "--muted": "343 25% 17%",
      "--muted-foreground": "340 12% 55%",
      "--border": "343 22% 21%",
      "--input": "343 22% 21%",
      "--secondary": "343 22% 19%",
      "--secondary-foreground": "340 15% 84%",
      "--accent": "340 35% 15%",
      "--accent-foreground": "340 65% 68%",
      "--primary": "340 70% 55%",
      "--ring": "340 70% 55%",
    },
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
        <p className="text-xs font-medium mb-2">Tema do Board</p>
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

export const applyBoardTheme = (themeId: string) => {
  const theme = BOARD_THEMES.find((t) => t.id === themeId);
  const root = document.documentElement;
  
  // First reset to default dark theme by removing custom properties
  BOARD_THEMES.forEach((t) => {
    Object.keys(t.vars).forEach((key) => {
      root.style.removeProperty(key);
    });
  });

  // Apply new theme vars
  if (theme && Object.keys(theme.vars).length > 0) {
    Object.entries(theme.vars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });
  }
};

export const removeBoardTheme = () => {
  const root = document.documentElement;
  BOARD_THEMES.forEach((t) => {
    Object.keys(t.vars).forEach((key) => {
      root.style.removeProperty(key);
    });
  });
};
