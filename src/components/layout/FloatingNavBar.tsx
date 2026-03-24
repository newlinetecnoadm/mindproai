import { useLocation, useNavigate } from "react-router-dom";
import { Inbox, CalendarDays, Kanban, ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface FloatingNavBarProps {
  activePanel?: "inbox" | "planner" | null;
  onTogglePanel?: (panel: "inbox" | "planner") => void;
}

const FloatingNavBar = ({ activePanel, onTogglePanel }: FloatingNavBarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const { data: boards = [] } = useQuery({
    queryKey: ["boards-nav", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boards")
        .select("id, title, is_starred")
        .eq("user_id", user!.id)
        .eq("is_closed", false)
        .order("is_starred", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Only show on board detail pages
  const isBoardDetail = location.pathname.match(/^\/boards\/[^/]+$/);
  if (!isBoardDetail) return null;

  const navItems = [
    {
      icon: Inbox,
      label: "Inbox",
      panel: "inbox" as const,
    },
    {
      icon: CalendarDays,
      label: "Planner",
      panel: "planner" as const,
    },
    {
      icon: Kanban,
      label: "Board",
      panel: null,
    },
  ];

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-6 left-0 right-0 z-50 flex justify-center pointer-events-none"
    >
      <div className="pointer-events-auto flex items-center gap-1 px-2 py-1.5 rounded-xl bg-card/95 backdrop-blur-xl border border-border shadow-lg">
        {navItems.map((item) => {
          const isActive = item.panel
            ? activePanel === item.panel
            : !activePanel;
          return (
            <button
              key={item.label}
              onClick={() => {
                if (item.panel && onTogglePanel) {
                  onTogglePanel(item.panel);
                } else if (!item.panel && onTogglePanel) {
                  // Close all panels
                  if (activePanel) onTogglePanel(activePanel);
                }
              }}
              className={cn(
                "relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <item.icon className="w-4 h-4" />
              {!isMobile && <span>{item.label}</span>}
              {isActive && (
                <motion.div
                  layoutId="floating-nav-indicator"
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary"
                />
              )}
            </button>
          );
        })}

        {/* Switch boards dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200">
              <ArrowLeftRight className="w-4 h-4" />
              {!isMobile && <span>Switch boards</span>}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {boards.length === 0 ? (
              <DropdownMenuItem disabled>Nenhum board encontrado</DropdownMenuItem>
            ) : (
              boards.map((board) => (
                <DropdownMenuItem
                  key={board.id}
                  onClick={() => navigate(`/boards/${board.id}`)}
                  className="cursor-pointer"
                >
                  <span className="truncate">{board.title}</span>
                  {board.is_starred && (
                    <span className="ml-auto text-warning text-xs">★</span>
                  )}
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
};

export default FloatingNavBar;
