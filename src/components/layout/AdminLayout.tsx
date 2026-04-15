import { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, CreditCard, BarChart3, Settings, ArrowLeft, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Logo from "./Logo";

const navItems = [
  { icon: BarChart3, label: "Métricas", path: "/admin" },
  { icon: Users, label: "Usuários", path: "/admin/usuarios" },
  { icon: CreditCard, label: "Planos & Assinaturas", path: "/admin/planos" },
  { icon: Settings, label: "Configurações", path: "/admin/configuracoes" },
];

const AdminLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex flex-col w-60 border-r border-sidebar-border bg-sidebar sticky top-0 h-screen">
        <div className="px-5 h-16 border-b border-sidebar-border flex items-center gap-2">
          <Logo variant="horizontal" className="h-7" forceDark />
        </div>

        <div className="mx-3 mt-3 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs flex items-center gap-2">
          <Shield className="w-4 h-4 shrink-0" />
          <span className="font-semibold">Área Administrativa</span>
        </div>

        <nav className="flex-1 p-2 space-y-1 mt-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-xs text-sidebar-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Voltar ao App
            </Button>
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
};

export default AdminLayout;
