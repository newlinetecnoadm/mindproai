import {
  Sparkles,
  Check,
  ArrowRight,
  Menu,
  X,
  Loader2,
  Brain,
  LayoutGrid,
  CalendarDays,
  Inbox,
  ListTodo,
  Bell,
  Users,
  FileDown,
  Bot,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import logoHorizontalColor from "@/assets/logo-horizontal-color.png";

// ─── Animation Variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.09, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ─── Module Data ──────────────────────────────────────────────────────────────
const modules = [
  {
    icon: Brain,
    title: "Mapas Mentais & Diagramas",
    description:
      "7 tipos de diagrama: mindmap, fluxograma, organograma, timeline, wireframe e mais. Auto-layout inteligente, templates prontos e colaboração ao vivo.",
    tags: ["Mindmap", "Flowchart", "Orgchart", "Timeline", "Swimlane", "Wireframe"],
  },
  {
    icon: LayoutGrid,
    title: "Boards Kanban",
    description:
      "Cards com checklists, labels, membros, anexos e comentários. Drag-and-drop fluido com temas visuais e workspaces organizados.",
    tags: ["Drag & Drop", "Checklists", "Labels", "Atividades"],
  },
  {
    icon: CalendarDays,
    title: "Agenda Integrada",
    description:
      "Calendário mensal e semanal conectado ao Kanban. Prazos de cartões viram eventos automaticamente — nunca perca um deadline.",
    tags: ["Mensal", "Semanal", "Sync Kanban"],
  },
  {
    icon: Bot,
    title: "Inteligência Artificial",
    description:
      "3 assistentes de IA: chat geral, expansão automática de mapas mentais e sugestão de tasks em boards. Conectado ao seu provedor preferido.",
    tags: ["AI Chat", "AI Map Assist", "AI Board Assist"],
  },
  {
    icon: Inbox,
    title: "Inbox Rápido",
    description:
      "Capture ideias e notas antes que sumam. Ordene por arrastar e processe na hora certa.",
    tags: ["Captura rápida", "Drag-to-order"],
  },
  {
    icon: ListTodo,
    title: "Planner",
    description:
      "Visão consolidada do seu planejamento. Tudo em um único painel.",
    tags: ["Painel integrado"],
  },
  {
    icon: Bell,
    title: "Notificações",
    description:
      "In-app e por e-mail. Preferências granulares por tipo de evento — comentários, prazos, membros adicionados e mais.",
    tags: ["In-app", "E-mail", "Granular"],
  },
  {
    icon: Users,
    title: "Colaboração em Tempo Real",
    description:
      "Presença ao vivo com cursores simultâneos (Supabase Realtime). Convites por e-mail com papel de editor ou visualizador.",
    tags: ["Realtime", "Presença", "Convites"],
  },
  {
    icon: FileDown,
    title: "Exportação & Compartilhamento",
    description:
      "Exporte diagramas como PDF ou imagem. Compartilhe via link público com token — sem exigir login do convidado.",
    tags: ["PDF", "Imagem", "Link público"],
  },
  {
    icon: CreditCard,
    title: "Planos Flexíveis",
    description:
      "Comece grátis, para sempre. Atualize para Pro ou Business conforme sua equipe cresce. Sem pegadinhas.",
    tags: ["Free forever", "Pro", "Business"],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────
const LandingPage = () => {
  const { user, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["landing-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price_brl");
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center">
            <img src={logoHorizontalColor} alt="Mind Pro AI" className="h-9" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#recursos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Recursos
            </a>
            <a href="#precos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Preços
            </a>
            <Link to="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/cadastro">
              <Button variant="hero" size="sm">Começar Grátis</Button>
            </Link>
          </div>

          <button
            className="md:hidden text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background p-4 space-y-3">
            <a href="#recursos" className="block text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Recursos</a>
            <a href="#precos" className="block text-sm text-muted-foreground" onClick={() => setMobileMenuOpen(false)}>Preços</a>
            <Link to="/login" className="block" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full">Entrar</Button>
            </Link>
            <Link to="/cadastro" className="block" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="hero" className="w-full">Começar Grátis</Button>
            </Link>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-4 bg-gradient-surface">
        <div className="container mx-auto max-w-5xl">
          {/* Badge */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Plataforma de Produtividade Visual com IA
            </span>
          </motion.div>

          {/* H1 */}
          <motion.h1
            className="text-4xl sm:text-5xl lg:text-[3.75rem] font-display font-extrabold leading-tight text-center mb-6"
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
          >
            Pense, organize e{" "}
            <span className="text-gradient">execute</span>{" "}
            tudo em um lugar
          </motion.h1>

          {/* Sub */}
          <motion.p
            className="text-lg sm:text-xl text-muted-foreground text-center max-w-2xl mx-auto mb-10 leading-relaxed"
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
          >
            Mapas mentais, diagramas, Kanban, agenda e IA — integrados numa única plataforma.
            Sem abrir dez abas diferentes.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14"
            initial="hidden" animate="visible" variants={fadeUp} custom={3}
          >
            <Link to="/cadastro">
              <Button variant="hero" size="lg" className="text-base px-8 h-12">
                Criar conta grátis <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
            <a href="#recursos">
              <Button variant="outline" size="lg" className="text-base px-8 h-12">
                Ver todos os recursos
              </Button>
            </a>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="flex flex-wrap justify-center gap-x-10 gap-y-4"
            initial="hidden" animate="visible" variants={fadeUp} custom={4}
          >
            {[
              ["7", "tipos de diagrama"],
              ["10", "módulos integrados"],
              ["3", "assistentes de IA"],
              ["R$ 0", "para começar"],
            ].map(([n, label]) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-extrabold text-primary">{n}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <div className="bg-secondary/60 border-y border-border py-4 px-4">
        <div className="container mx-auto flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm text-muted-foreground">
          {[
            "✓ Grátis para começar",
            "✓ Sem cartão de crédito",
            "✓ Cancele a qualquer hora",
            "✓ Dados seguros com Supabase",
          ].map((t) => <span key={t}>{t}</span>)}
        </div>
      </div>

      {/* ── Recursos ── */}
      <section id="recursos" className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            className="text-center mb-16"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">
              10 módulos. Uma plataforma.
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Tudo que você precisa para pensar, planejar e executar — sem trocar de ferramenta.
            </p>
          </motion.div>

          {/* 5-col on large, 2-col on md, 1-col on sm */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {modules.map((mod, i) => {
              const Icon = mod.icon;
              return (
                <motion.div
                  key={mod.title}
                  className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-lg transition-all duration-300 flex flex-col gap-4"
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                  variants={fadeUp}
                  custom={i % 3}
                >
                  <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    <Icon className="w-5 h-5 text-accent-foreground group-hover:text-primary-foreground transition-colors duration-300" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base mb-1.5">{mod.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{mod.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-auto">
                    {mod.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs rounded-full bg-secondary text-secondary-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA mid-page ── */}
      <section className="py-16 px-4 bg-gradient-hero">
        <div className="container mx-auto max-w-3xl text-center">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white mb-4">
              Sua equipe já poderia estar usando isso hoje.
            </h2>
            <p className="text-white/80 text-lg mb-8">
              Comece grátis. Sem cartão de crédito. Configure em minutos.
            </p>
            <Link to="/cadastro">
              <Button
                size="lg"
                className="bg-white text-primary font-bold hover:bg-white/90 text-base px-8 h-12"
              >
                Começar Grátis <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── Preços ── */}
      <section id="precos" className="py-24 px-4 bg-gradient-surface">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            className="text-center mb-16"
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-3">Planos e Preços</h2>
            <p className="text-muted-foreground text-lg">
              Comece grátis. Atualize quando precisar.
            </p>
          </motion.div>

          {plansLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6 items-start">
              {(plans ?? []).map((plan: any, i: number) => {
                const f = (plan.features ?? {}) as any;
                const featureList: string[] = f.list ?? [];
                const description = f.description ?? "";
                const ctaText = f.cta_text || (plan.name === "free" ? "Começar Grátis" : "Selecionar");
                const isHighlighted = f.is_highlighted ?? false;

                return (
                  <motion.div
                    key={plan.id}
                    className={`relative p-8 rounded-2xl border transition-all duration-300 flex flex-col ${
                      isHighlighted
                        ? "border-primary bg-card shadow-glow scale-[1.02]"
                        : "border-border bg-card hover:border-primary/30 hover:shadow-md"
                    }`}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                    variants={fadeUp}
                    custom={i}
                  >
                    {isHighlighted && (
                      <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-primary text-primary-foreground text-xs font-semibold whitespace-nowrap">
                        ✨ Mais popular
                      </span>
                    )}

                    <div className="mb-6">
                      <h3 className="font-display font-bold text-xl mb-1">{plan.display_name}</h3>
                      {description && (
                        <p className="text-muted-foreground text-sm">{description}</p>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1 mb-8">
                      <span className="text-5xl font-extrabold">
                        R${Number(plan.price_brl).toFixed(2).replace(".", ",")}
                      </span>
                      <span className="text-muted-foreground text-sm">/mês</span>
                    </div>

                    {featureList.length > 0 && (
                      <ul className="space-y-3 mb-8 flex-1">
                        {featureList.map((item: string) => (
                          <li key={item} className="flex items-start gap-2.5 text-sm">
                            <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                            <span className="text-foreground/80">{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <Link to="/cadastro" className="mt-auto">
                      <Button
                        variant={isHighlighted ? "hero" : "outline"}
                        className="w-full"
                      >
                        {ctaText}
                      </Button>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <motion.div
            initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}
          >
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">
              Pronto para organizar suas ideias?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto">
              Junte-se a times que já usam o Mind Pro AI para pensar com clareza e entregar mais rápido.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/cadastro">
                <Button variant="hero" size="lg" className="text-base px-8 h-12">
                  Criar conta grátis <ArrowRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="ghost" size="lg" className="text-base h-12">
                  Já tenho conta → Entrar
                </Button>
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Plano gratuito permanente · Sem cartão · Configura em minutos
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-10 px-4 bg-gradient-surface">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src={logoHorizontalColor} alt="Mind Pro AI" className="h-7" />
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Mind Pro AI · Todos os direitos reservados.
          </p>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
