import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Map, Kanban, Calendar, Settings, CreditCard, ChevronLeft, ChevronRight, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileDrawer from "./MobileDrawer";
import logoHorizontal from "@/assets/logo-horizontal-color-2.png";
import logoIcon from "@/assets/logo-icon-color-2.png";

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
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    return saved === "true";
  });

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  };
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: plan } = usePlan();
  const { data: isAdmin } = useIsAdmin();
  const isMobile = useIsMobile();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const trialDays = plan?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(plan.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;
  const showTrial = plan?.status === "trialing" && trialDays > 0;

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <MobileDrawer />
        <main className="pt-14 pb-20 overflow-auto">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
        {/* Bottom Floating Tab Bar */}
        <nav className="fixed bottom-4 left-3 right-3 z-50 flex items-center justify-around rounded-2xl bg-card/80 backdrop-blur-xl border border-border/50 shadow-lg py-1.5 md:hidden">
          {navItems.slice(0, 5).map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px]",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-transform duration-200", isActive && "scale-110")} />
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
                {isActive && (
                  <span className="absolute -bottom-0.5 w-5 h-0.5 rounded-full bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 sticky top-0 h-screen",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}>
        {/* Logo area */}
        <div className={cn(
          "flex items-center h-16 border-b border-sidebar-border shrink-0",
          collapsed ? "justify-center px-2" : "px-5"
        )}>
          {collapsed ? (
            <img src={logoIcon} alt="MindPro" className="h-8 w-8 object-contain" />
          ) : (
            <img src={logoHorizontal} alt="MindPro" className="h-7" />
          )}
        </div>

        {/* Trial banner */}
        {!collapsed && showTrial && (
          <div className="mx-3 mt-3 p-3 rounded-lg bg-sidebar-accent text-sidebar-accent-foreground text-xs">
            <p className="font-semibold">Trial Ativo</p>
            <p className="text-accent-foreground/70 mt-0.5">{trialDays} dias restantes</p>
            <Link to="/assinaturas">
              <Button variant="hero" size="sm" className="w-full mt-2 text-xs h-7">
                Fazer Upgrade
              </Button>
            </Link>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg text-[13px] font-medium transition-all duration-200",
                  collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="flex-shrink-0 w-[18px] h-[18px]" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-3 pt-2 border-t border-sidebar-border space-y-0.5">
          {!collapsed && user && (
            <div className="px-3 py-2 text-[11px] text-sidebar-foreground/50 truncate font-medium">
              {user.email}
            </div>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              title={collapsed ? "Admin" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-lg text-[13px] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-primary transition-all duration-200",
                collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
              )}
            >
              <Shield className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>Admin</span>}
            </Link>
          )}
          <button
            onClick={handleSignOut}
            className={cn(
              "flex items-center gap-3 w-full rounded-lg text-[13px] text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-destructive transition-all duration-200",
              collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
          <button
            onClick={toggleCollapsed}
            className="flex items-center justify-center w-full py-2 rounded-lg text-sidebar-foreground/40 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
