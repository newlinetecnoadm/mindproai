import { Brain, Lightbulb, Workflow, Settings, Target } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate, Navigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import logoIconFull from "@/assets/logo-icon-full.png";
import logoVerticalBrand from "@/assets/logo-vertical-brand.png";
import logoHorizontal from "@/assets/logo-horizontal-color-2.png";

const floatingIcons = [
  { Icon: Brain, top: "12%", left: "10%", delay: 0, duration: 6 },
  { Icon: Lightbulb, top: "18%", left: "65%", delay: 1.5, duration: 7 },
  { Icon: Workflow, top: "70%", left: "15%", delay: 0.8, duration: 5.5 },
  { Icon: Settings, top: "60%", left: "75%", delay: 2, duration: 8 },
  { Icon: Target, top: "45%", left: "85%", delay: 1, duration: 6.5 },
];

const pills = ["Mapas Mentais", "Kanban", "Agenda", "IA Integrada"];

const Login = () => {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials"
        ? "E-mail ou senha incorretos"
        : error.message);
    } else {
      navigate("/dashboard");
    }
  };

  const handleGoogleLogin = async () => {
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (error) toast.error("Erro ao entrar com Google");
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center"
        style={{ background: "linear-gradient(135deg, hsl(220 8% 7%) 0%, hsl(220 10% 12%) 50%, hsl(220 8% 7%) 100%)" }}
      >
        {/* Dot grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        {/* Animated orbs */}
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(25 98% 50% / 0.08) 0%, transparent 70%)",
            top: "20%", left: "30%",
          }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[300px] h-[300px] rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(25 98% 50% / 0.05) 0%, transparent 70%)",
            bottom: "15%", right: "20%",
          }}
          animate={{ scale: [1.1, 0.9, 1.1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Floating icons */}
        {floatingIcons.map(({ Icon, top, left, delay, duration }, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ top, left }}
            animate={{
              y: [0, -12, 0, 8, 0],
              x: [0, 6, 0, -6, 0],
              rotate: [0, 5, 0, -5, 0],
            }}
            transition={{
              duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay,
            }}
          >
            <Icon className="w-8 h-8 text-white/[0.08]" strokeWidth={1.5} />
          </motion.div>
        ))}

        {/* Center content */}
        <div className="relative z-10 text-center px-12 max-w-md">
          {/* Logo with glow */}
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full scale-150" />
            <img src={logoIconFull} alt="Mind Pro AI" className="relative h-36 mx-auto" />
          </div>

          <p className="text-white/50 text-sm leading-relaxed mb-8">
            Plataforma de produtividade com inteligência artificial. Organize ideias, crie mapas mentais e transforme pensamentos em ação.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2">
            {pills.map((pill) => (
              <span
                key={pill}
                className="px-4 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] text-white/40 text-xs font-medium backdrop-blur-sm"
              >
                {pill}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="flex-1 flex items-center justify-center bg-card px-6 py-12 lg:py-0">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="w-full max-w-sm space-y-8"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-4">
            <Link to="/">
              <img src={logoHorizontal} alt="Mind Pro AI" className="h-8" />
            </Link>
          </div>

          <div>
            <h1 className="text-xl font-display font-bold mb-1">Entrar na sua conta</h1>
            <p className="text-sm text-primary/70">Insira suas credenciais para acessar o painel</p>
          </div>

          <div className="space-y-5">
            {/* Google */}
            <Button
              variant="outline"
              className="w-full h-11 gap-3 text-sm font-medium"
              type="button"
              onClick={handleGoogleLogin}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continuar com Google
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                <span className="bg-card px-3 text-primary/60 font-medium">ou continue com e-mail</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="h-11"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold">Senha</Label>
                  <Link to="/esqueci-senha" className="text-xs text-primary hover:underline font-medium">
                    Esqueceu a senha?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="h-11"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button variant="hero" className="w-full h-11 text-sm font-semibold" type="submit" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Não tem uma conta?{" "}
            <Link to="/cadastro" className="text-primary hover:underline font-medium">Criar conta</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
