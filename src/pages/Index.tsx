import { LayoutDashboard, Calendar, Sparkles, Check, ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, Navigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import logoHorizontalColor from "@/assets/logo-horizontal-color.png";
import logoVerticalColor from "@/assets/logo-vertical-color.png";
import logoIconSimple from "@/assets/logo-icon-simple.png";

const plans = [
  {
    name: "Gratuito",
    price: "R$ 0",
    period: "/mês",
    description: "Perfeito para começar",
    features: ["3 mapas mentais", "2 boards Kanban", "Exportar PNG", "Templates básicos"],
    cta: "Começar Grátis",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "R$ 29,90",
    period: "/mês",
    description: "Para profissionais",
    features: ["Diagramas ilimitados", "Boards ilimitados", "Até 5 colaboradores", "Exportar PDF + PNG", "Todos os templates", "Sugestões de IA", "Histórico de versões"],
    cta: "Assinar Pro",
    highlighted: true,
  },
  {
    name: "Business",
    price: "R$ 79,90",
    period: "/mês",
    description: "Para equipes",
    features: ["Tudo do Pro", "Colaboradores ilimitados", "Suporte prioritário", "Funcionalidades avançadas"],
    cta: "Falar com Vendas",
    highlighted: false,
  },
];

const features = [
  {
    icon: "🧠",
    title: "Mapas Mentais & Diagramas",
    description: "Editor visual poderoso com 7 tipos de diagrama, templates prontos e auto-layout inteligente.",
  },
  {
    icon: "📋",
    title: "Boards Kanban",
    description: "Organize projetos com boards completos estilo Trello: cards, checklists, labels e colaboração.",
  },
  {
    icon: "📅",
    title: "Agenda Integrada",
    description: "Calendário conectado aos seus cards e diagramas. Nunca perca um prazo.",
  },
  {
    icon: "✨",
    title: "Inteligência Artificial",
    description: "Sugestões automáticas de expansão de nós e geração de diagramas a partir de texto.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5 },
  }),
};

const LandingPage = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center">
            <img src={logoHorizontalColor} alt="Mind Pro AI" className="h-9" />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Recursos</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Preços</a>
            <Link to="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/cadastro">
              <Button variant="hero" size="sm">Começar Grátis</Button>
            </Link>
          </div>

          <button className="md:hidden text-foreground" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background p-4 space-y-3">
            <a href="#features" className="block text-sm text-muted-foreground">Recursos</a>
            <a href="#pricing" className="block text-sm text-muted-foreground">Preços</a>
            <Link to="/login" className="block"><Button variant="ghost" className="w-full">Entrar</Button></Link>
            <Link to="/cadastro" className="block"><Button variant="hero" className="w-full">Começar Grátis</Button></Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" /> Nova plataforma de produtividade visual
            </span>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl lg:text-6xl font-display font-extrabold leading-tight mb-6"
            initial="hidden" animate="visible" variants={fadeUp} custom={1}
          >
            Organize ideias com{" "}
            <span className="text-gradient">mapas mentais</span>,{" "}
            boards e agenda
          </motion.h1>

          <motion.p
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            initial="hidden" animate="visible" variants={fadeUp} custom={2}
          >
            Crie diagramas profissionais, gerencie projetos com Kanban e mantenha tudo sincronizado em uma única plataforma.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            initial="hidden" animate="visible" variants={fadeUp} custom={3}
          >
            <Link to="/cadastro">
              <Button variant="hero" size="lg" className="text-base px-8">
                Começar Grátis <ArrowRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="hero-outline" size="lg" className="text-base px-8">
                Ver Recursos
              </Button>
            </a>
          </motion.div>

          {/* Logo icon as decorative element */}
          <motion.div
            className="mt-16"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
          >
            <img src={logoVerticalColor} alt="Mind Pro AI" className="h-40 mx-auto animate-float opacity-80" />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4 bg-gradient-surface">
        <div className="container mx-auto max-w-6xl">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">Tudo que você precisa</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Uma plataforma completa para organizar pensamentos, projetos e cronogramas.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                className="p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-300 hover:shadow-lg group"
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                <div className="text-3xl mb-4">{feature.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-5xl">
          <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0}>
            <h2 className="text-3xl sm:text-4xl font-display font-bold mb-4">Planos e Preços</h2>
            <p className="text-muted-foreground text-lg">
              Comece grátis. Atualize quando precisar.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                className={`relative p-8 rounded-2xl border transition-all duration-300 ${
                  plan.highlighted
                    ? "border-primary bg-card shadow-glow scale-[1.02]"
                    : "border-border bg-card hover:border-primary/30"
                }`}
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-primary text-primary-foreground text-xs font-semibold">
                    Mais popular
                  </span>
                )}
                <h3 className="font-display font-bold text-xl mb-1">{plan.name}</h3>
                <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/cadastro">
                  <Button
                    variant={plan.highlighted ? "hero" : "outline"}
                    className="w-full"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 px-4">
        <div className="container mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src={logoHorizontalColor} alt="Mind Pro AI" className="h-7" />
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Mind Pro AI. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
