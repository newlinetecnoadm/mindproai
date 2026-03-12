import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Brain, LayoutDashboard, Map, Kanban, Calendar, Settings, LogOut, CreditCard, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Map, label: "Diagramas", path: "/diagramas" },
  { icon: Kanban, label: "Boards", path: "/boards" },
  { icon: Calendar, label: "Agenda", path: "/agenda" },
  { icon: CreditCard, label: "Assinaturas", path: "/assinaturas" },
  { icon: Settings, label: "Configurações", path: "/configuracoes" },
];

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 sticky top-0 h-screen",
        collapsed ? "w-16" : "w-60"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-2 p-4 h-16 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && <span className="font-display font-bold text-sidebar-foreground">Mind Pro AI</span>}
        </div>

        {/* Trial banner */}
        {!collapsed && (
          <div className="mx-3 mt-3 p-3 rounded-lg bg-accent text-accent-foreground text-xs">
            <p className="font-semibold">Trial Ativo</p>
            <p className="text-accent-foreground/70 mt-0.5">14 dias restantes</p>
            <Link to="/assinaturas">
              <Button variant="hero" size="sm" className="w-full mt-2 text-xs h-7">
                Fazer Upgrade
              </Button>
            </Link>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-1 mt-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div className="p-2 border-t border-sidebar-border">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full py-2 rounded-lg text-sidebar-foreground/50 hover:bg-sidebar-accent/50 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
