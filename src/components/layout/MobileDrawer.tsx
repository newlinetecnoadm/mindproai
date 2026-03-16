import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Map,
  Kanban,
  Calendar,
  Settings,
  CreditCard,
  LogOut,
  Shield,
  Plus,
  X,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import logoHorizontal from "@/assets/logo-horizontal-color-2.png";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Map, label: "Diagramas", path: "/diagramas" },
  { icon: Kanban, label: "Boards", path: "/boards" },
  { icon: Calendar, label: "Agenda", path: "/agenda" },
  { icon: CreditCard, label: "Assinaturas", path: "/assinaturas" },
  { icon: Settings, label: "Configurações", path: "/configuracoes" },
];

const quickActions = [
  { icon: Brain, label: "Novo Diagrama", path: "/diagramas/novo", color: "bg-primary text-primary-foreground" },
  { icon: Kanban, label: "Novo Board", path: "/boards", color: "bg-success text-success-foreground" },
  { icon: Calendar, label: "Novo Evento", path: "/agenda", color: "bg-warning text-warning-foreground" },
];

const MobileDrawer = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [fabExpanded, setFabExpanded] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const handleQuickAction = (path: string) => {
    setFabExpanded(false);
    navigate(path);
  };

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-14 px-4 bg-card/95 backdrop-blur-xl border-b border-border md:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex flex-col gap-1 p-2"
          aria-label="Abrir menu"
        >
          <span className="w-5 h-0.5 bg-foreground rounded-full" />
          <span className="w-4 h-0.5 bg-foreground rounded-full" />
          <span className="w-5 h-0.5 bg-foreground rounded-full" />
        </button>
        <img src={logoHorizontal} alt="MindPro" className="h-6" />
        <div className="w-9" />
      </div>

      {/* Drawer Overlay + Panel */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm md:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 z-[61] w-72 bg-card border-r border-border flex flex-col md:hidden"
            >
              <div className="flex items-center justify-between h-14 px-4 border-b border-border">
                <img src={logoHorizontal} alt="MindPro" className="h-6" />
                <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>

              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setDrawerOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="px-3 py-4 border-t border-border space-y-1">
                {user && (
                  <div className="px-4 py-2 text-xs text-muted-foreground truncate">{user.email}</div>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={() => setDrawerOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-secondary hover:text-primary"
                  >
                    <Shield className="w-5 h-5" />
                    <span>Admin</span>
                  </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-sm text-muted-foreground hover:bg-secondary hover:text-destructive"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Sair</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

    </>
  );
};

export default MobileDrawer;
