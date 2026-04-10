import type { Node, Edge } from "@xyflow/react";

export interface DiagramTemplate {
  id: string;
  name: string;
  description: string;
  icon?: string;
  type: string;
  category?: string;
  nodes: Node[];
  edges: Edge[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function n(id: string, label: string, x: number, y: number, opts: Partial<Node["data"]> = {}): Node {
  return {
    id,
    type: "mindmap",
    position: { x, y },
    data: { label, ...opts },
    style: { background: "transparent", border: "none", padding: 0, boxShadow: "none" },
  };
}

function e(id: string, source: string, target: string): Edge {
  return { id, source, target, type: "mindmap" };
}

// ─── Template: Em Branco ──────────────────────────────────────────────────────

const blankMindmap: DiagramTemplate = {
  id: "mm-blank",
  name: "Em branco",
  description: "Comece do zero com um mapa mental",
  icon: "🧠",
  type: "mindmap",
  category: "mindmap",
  nodes: [n("root", "Ideia Central", 0, 0, { isRoot: true, depth: 0 })],
  edges: [],
};

// ─── Template: Brainstorming ──────────────────────────────────────────────────

const brainstorming: DiagramTemplate = {
  id: "mm-brainstorm",
  name: "Brainstorming",
  description: "Expanda ideias em todas as direções",
  icon: "💡",
  type: "mindmap",
  category: "mindmap",
  nodes: [
    n("root", "Tema Central", 0, 0, { isRoot: true, depth: 0 }),
    n("b1", "Problema", 200, -150, { depth: 1 }),
    n("b2", "Solução", 200, 0, { depth: 1 }),
    n("b3", "Oportunidade", 200, 150, { depth: 1 }),
    n("b4", "Risco", -200, -100, { depth: 1 }),
    n("b5", "Recurso", -200, 100, { depth: 1 }),
    n("b1a", "Causa raiz", 420, -200, { depth: 2 }),
    n("b1b", "Impacto", 420, -130, { depth: 2 }),
    n("b2a", "Curto prazo", 420, -30, { depth: 2 }),
    n("b2b", "Longo prazo", 420, 40, { depth: 2 }),
    n("b3a", "Mercado", 420, 110, { depth: 2 }),
    n("b3b", "Tecnologia", 420, 180, { depth: 2 }),
    n("b4a", "Mitigação", -420, -150, { depth: 2 }),
    n("b5a", "Equipe", -420, 50, { depth: 2 }),
    n("b5b", "Orçamento", -420, 120, { depth: 2 }),
  ],
  edges: [
    e("e-r-b1", "root", "b1"), e("e-r-b2", "root", "b2"), e("e-r-b3", "root", "b3"),
    e("e-r-b4", "root", "b4"), e("e-r-b5", "root", "b5"),
    e("e-b1-b1a", "b1", "b1a"), e("e-b1-b1b", "b1", "b1b"),
    e("e-b2-b2a", "b2", "b2a"), e("e-b2-b2b", "b2", "b2b"),
    e("e-b3-b3a", "b3", "b3a"), e("e-b3-b3b", "b3", "b3b"),
    e("e-b4-b4a", "b4", "b4a"),
    e("e-b5-b5a", "b5", "b5a"), e("e-b5-b5b", "b5", "b5b"),
  ],
};

// ─── Template: Planejamento de Projeto ────────────────────────────────────────

const projetoPlano: DiagramTemplate = {
  id: "mm-projeto",
  name: "Planejamento de Projeto",
  description: "Organize fases, tarefas e responsáveis",
  icon: "📋",
  type: "mindmap",
  category: "mindmap",
  nodes: [
    n("root", "Projeto", 0, 0, { isRoot: true, depth: 0 }),
    n("fase1", "Planejamento", 200, -200, { depth: 1 }),
    n("fase2", "Execução", 200, 0, { depth: 1 }),
    n("fase3", "Entrega", 200, 200, { depth: 1 }),
    n("rec", "Recursos", -200, -100, { depth: 1 }),
    n("risco", "Riscos", -200, 100, { depth: 1 }),
    n("f1a", "Escopo", 420, -260, { depth: 2 }),
    n("f1b", "Cronograma", 420, -200, { depth: 2 }),
    n("f1c", "Orçamento", 420, -140, { depth: 2 }),
    n("f2a", "Sprint 1", 420, -50, { depth: 2 }),
    n("f2b", "Sprint 2", 420, 20, { depth: 2 }),
    n("f2c", "Sprint 3", 420, 90, { depth: 2 }),
    n("f3a", "Homologação", 420, 150, { depth: 2 }),
    n("f3b", "Deploy", 420, 220, { depth: 2 }),
    n("r1", "Equipe", -420, -150, { depth: 2 }),
    n("r2", "Ferramentas", -420, -80, { depth: 2 }),
    n("ri1", "Técnico", -420, 50, { depth: 2 }),
    n("ri2", "Negócio", -420, 120, { depth: 2 }),
  ],
  edges: [
    e("e-r-f1", "root", "fase1"), e("e-r-f2", "root", "fase2"), e("e-r-f3", "root", "fase3"),
    e("e-r-rec", "root", "rec"), e("e-r-ri", "root", "risco"),
    e("e-f1-f1a", "fase1", "f1a"), e("e-f1-f1b", "fase1", "f1b"), e("e-f1-f1c", "fase1", "f1c"),
    e("e-f2-f2a", "fase2", "f2a"), e("e-f2-f2b", "fase2", "f2b"), e("e-f2-f2c", "fase2", "f2c"),
    e("e-f3-f3a", "fase3", "f3a"), e("e-f3-f3b", "fase3", "f3b"),
    e("e-rec-r1", "rec", "r1"), e("e-rec-r2", "rec", "r2"),
    e("e-ri-ri1", "risco", "ri1"), e("e-ri-ri2", "risco", "ri2"),
  ],
};

// ─── Template: Análise SWOT ───────────────────────────────────────────────────

const swotAnalysis: DiagramTemplate = {
  id: "mm-swot",
  name: "Análise SWOT",
  description: "Forças, fraquezas, oportunidades e ameaças",
  icon: "📊",
  type: "mindmap",
  category: "mindmap",
  nodes: [
    n("root", "SWOT", 0, 0, { isRoot: true, depth: 0, icon: "📊" }),
    n("s", "Forças (S)", 220, -150, { depth: 1 }),
    n("w", "Fraquezas (W)", 220, 50, { depth: 1 }),
    n("o", "Oportunidades (O)", -220, -150, { depth: 1 }),
    n("t", "Ameaças (T)", -220, 50, { depth: 1 }),
    n("s1", "Vantagem competitiva", 440, -220, { depth: 2 }),
    n("s2", "Time experiente", 440, -160, { depth: 2 }),
    n("s3", "Produto único", 440, -100, { depth: 2 }),
    n("w1", "Recursos limitados", 440, 0, { depth: 2 }),
    n("w2", "Processo manual", 440, 60, { depth: 2 }),
    n("w3", "Baixo marketing", 440, 120, { depth: 2 }),
    n("o1", "Mercado crescente", -440, -220, { depth: 2 }),
    n("o2", "Nova tecnologia", -440, -160, { depth: 2 }),
    n("o3", "Parcerias", -440, -100, { depth: 2 }),
    n("t1", "Concorrência", -440, 0, { depth: 2 }),
    n("t2", "Mudança regulatória", -440, 60, { depth: 2 }),
    n("t3", "Crise econômica", -440, 120, { depth: 2 }),
  ],
  edges: [
    e("e-r-s", "root", "s"), e("e-r-w", "root", "w"), e("e-r-o", "root", "o"), e("e-r-t", "root", "t"),
    e("e-s-s1", "s", "s1"), e("e-s-s2", "s", "s2"), e("e-s-s3", "s", "s3"),
    e("e-w-w1", "w", "w1"), e("e-w-w2", "w", "w2"), e("e-w-w3", "w", "w3"),
    e("e-o-o1", "o", "o1"), e("e-o-o2", "o", "o2"), e("e-o-o3", "o", "o3"),
    e("e-t-t1", "t", "t1"), e("e-t-t2", "t", "t2"), e("e-t-t3", "t", "t3"),
  ],
};

// ─── Template: OKR ────────────────────────────────────────────────────────────

const okrTemplate: DiagramTemplate = {
  id: "mm-okr",
  name: "OKR",
  description: "Objetivos e resultados-chave",
  icon: "🎯",
  type: "mindmap",
  category: "mindmap",
  nodes: [
    n("root", "OKRs Q1 2025", 0, 0, { isRoot: true, depth: 0, icon: "🎯" }),
    n("o1", "Crescer receita", 200, -200, { depth: 1 }),
    n("o2", "Melhorar produto", 200, 0, { depth: 1 }),
    n("o3", "Engajamento", 200, 200, { depth: 1 }),
    n("o1kr1", "MRR +30%", 420, -270, { depth: 2 }),
    n("o1kr2", "NPS > 60", 420, -210, { depth: 2 }),
    n("o1kr3", "Churn < 5%", 420, -150, { depth: 2 }),
    n("o2kr1", "CSAT > 4.5", 420, -60, { depth: 2 }),
    n("o2kr2", "Bugs críticos: 0", 420, 0, { depth: 2 }),
    n("o2kr3", "3 features lançadas", 420, 60, { depth: 2 }),
    n("o3kr1", "DAU +40%", 420, 140, { depth: 2 }),
    n("o3kr2", "Retenção D30 > 50%", 420, 200, { depth: 2 }),
    n("o3kr3", "Reviews 4.8+", 420, 260, { depth: 2 }),
  ],
  edges: [
    e("e-r-o1", "root", "o1"), e("e-r-o2", "root", "o2"), e("e-r-o3", "root", "o3"),
    e("e-o1-kr1", "o1", "o1kr1"), e("e-o1-kr2", "o1", "o1kr2"), e("e-o1-kr3", "o1", "o1kr3"),
    e("e-o2-kr1", "o2", "o2kr1"), e("e-o2-kr2", "o2", "o2kr2"), e("e-o2-kr3", "o2", "o2kr3"),
    e("e-o3-kr1", "o3", "o3kr1"), e("e-o3-kr2", "o3", "o3kr2"), e("e-o3-kr3", "o3", "o3kr3"),
  ],
};

// ─── Template: Mapa de Empatia ────────────────────────────────────────────────

const empatiaMap: DiagramTemplate = {
  id: "mm-empatia",
  name: "Mapa de Empatia",
  description: "Entenda o seu usuário de forma profunda",
  icon: "👤",
  type: "mindmap",
  category: "mindmap",
  nodes: [
    n("root", "Usuário", 0, 0, { isRoot: true, depth: 0, icon: "👤" }),
    n("pensa", "Pensa e Sente", 200, -220, { depth: 1 }),
    n("ve", "Vê", 200, -80, { depth: 1 }),
    n("ouve", "Ouve", 200, 60, { depth: 1 }),
    n("faz", "Faz e Diz", 200, 200, { depth: 1 }),
    n("dores", "Dores", -200, -120, { depth: 1 }),
    n("ganhos", "Ganhos", -200, 80, { depth: 1 }),
    n("p1", "Preocupações", 420, -280, { depth: 2 }),
    n("p2", "Aspirações", 420, -220, { depth: 2 }),
    n("p3", "Frustrações internas", 420, -160, { depth: 2 }),
    n("v1", "Ambiente de trabalho", 420, -110, { depth: 2 }),
    n("v2", "Produtos que usa", 420, -50, { depth: 2 }),
    n("o1", "Colegas", 420, 10, { depth: 2 }),
    n("o2", "Influenciadores", 420, 70, { depth: 2 }),
    n("f1", "Comportamento público", 420, 140, { depth: 2 }),
    n("f2", "Aparência", 420, 200, { depth: 2 }),
    n("d1", "Obstáculos", -420, -180, { depth: 2 }),
    n("d2", "Medos", -420, -120, { depth: 2 }),
    n("d3", "Frustrações", -420, -60, { depth: 2 }),
    n("g1", "Desejo de sucesso", -420, 20, { depth: 2 }),
    n("g2", "Necessidade a suprir", -420, 80, { depth: 2 }),
    n("g3", "Medida de valor", -420, 140, { depth: 2 }),
  ],
  edges: [
    e("e-r-p", "root", "pensa"), e("e-r-v", "root", "ve"), e("e-r-o", "root", "ouve"),
    e("e-r-f", "root", "faz"), e("e-r-d", "root", "dores"), e("e-r-g", "root", "ganhos"),
    e("e-p-p1", "pensa", "p1"), e("e-p-p2", "pensa", "p2"), e("e-p-p3", "pensa", "p3"),
    e("e-v-v1", "ve", "v1"), e("e-v-v2", "ve", "v2"),
    e("e-o-o1", "ouve", "o1"), e("e-o-o2", "ouve", "o2"),
    e("e-f-f1", "faz", "f1"), e("e-f-f2", "faz", "f2"),
    e("e-d-d1", "dores", "d1"), e("e-d-d2", "dores", "d2"), e("e-d-d3", "dores", "d3"),
    e("e-g-g1", "ganhos", "g1"), e("e-g-g2", "ganhos", "g2"), e("e-g-g3", "ganhos", "g3"),
  ],
};

// ─── Template: Organograma ────────────────────────────────────────────────────

function orgNode(id: string, label: string, x: number, y: number, depth: number): Node {
  return {
    id,
    type: "mindmap",
    position: { x, y },
    data: { label, depth, shape: "rectangle", isRoot: depth === 0 },
    style: { background: "transparent", border: "none", padding: 0, boxShadow: "none" },
  };
}

function flowEdge(id: string, source: string, target: string): Edge {
  return { id, source, target, type: "flow", sourceHandle: "s-bottom", targetHandle: "t-top" };
}

const orgTemplate: DiagramTemplate = {
  id: "org-blank",
  name: "Organograma",
  description: "Hierarquia organizacional vertical.",
  icon: "🏢",
  type: "orgchart",
  category: "orgchart",
  nodes: [
    orgNode("ceo", "CEO", 0, 0, 0),
    orgNode("cto", "CTO", -300, 150, 1),
    orgNode("cfo", "CFO", 0, 150, 1),
    orgNode("cmo", "CMO", 300, 150, 1),
    orgNode("eng1", "Engenheiro Sr.", -400, 310, 2),
    orgNode("eng2", "Engenheiro Jr.", -200, 310, 2),
    orgNode("fin1", "Analista Financeiro", -100, 310, 2),
    orgNode("fin2", "Contador", 100, 310, 2),
    orgNode("mkt1", "Designer", 200, 310, 2),
    orgNode("mkt2", "Analista de Marketing", 400, 310, 2),
  ],
  edges: [
    flowEdge("e-ceo-cto", "ceo", "cto"),
    flowEdge("e-ceo-cfo", "ceo", "cfo"),
    flowEdge("e-ceo-cmo", "ceo", "cmo"),
    flowEdge("e-cto-eng1", "cto", "eng1"),
    flowEdge("e-cto-eng2", "cto", "eng2"),
    flowEdge("e-cfo-fin1", "cfo", "fin1"),
    flowEdge("e-cfo-fin2", "cfo", "fin2"),
    flowEdge("e-cmo-mkt1", "cmo", "mkt1"),
    flowEdge("e-cmo-mkt2", "cmo", "mkt2"),
  ],
};

// ─── Template: Fluxograma ─────────────────────────────────────────────────────

function flowNode(id: string, label: string, x: number, y: number, depth: number, shape: string): Node {
  return {
    id,
    type: "mindmap",
    position: { x, y },
    data: { label, depth, shape, isRoot: depth === 0 },
    style: { background: "transparent", border: "none", padding: 0, boxShadow: "none" },
  };
}

const flowTemplate: DiagramTemplate = {
  id: "flow-blank",
  name: "Fluxograma",
  description: "Processos e tomadas de decisão.",
  icon: "🔄",
  type: "flowchart",
  category: "flowchart",
  nodes: [
    flowNode("start", "Início", 0, 0, 0, "oval"),
    flowNode("process1", "Processar dados", 0, 130, 1, "rectangle"),
    flowNode("decision", "Válido?", 0, 260, 1, "diamond"),
    flowNode("yes-process", "Salvar resultado", -150, 390, 2, "rectangle"),
    flowNode("no-process", "Corrigir erro", 150, 390, 2, "rectangle"),
    flowNode("end", "Fim", 0, 520, 2, "oval"),
  ],
  edges: [
    flowEdge("e-start-p1", "start", "process1"),
    flowEdge("e-p1-dec", "process1", "decision"),
    flowEdge("e-dec-yes", "decision", "yes-process"),
    flowEdge("e-dec-no", "decision", "no-process"),
    flowEdge("e-yes-end", "yes-process", "end"),
    flowEdge("e-no-end", "no-process", "end"),
  ],
};

// ─── All templates ─────────────────────────────────────────────────────────────

export const allTemplates: DiagramTemplate[] = [
  blankMindmap,
  brainstorming,
  projetoPlano,
  swotAnalysis,
  okrTemplate,
  empatiaMap,
  orgTemplate,
  flowTemplate,
];

export function getTemplatesByType(type: string): DiagramTemplate[] {
  return allTemplates.filter((t) => t.type === type);
}

export const templateCategories = [
  { id: "all", name: "Todos", emoji: "📁" },
  { id: "mindmap", name: "Mapa Mental", emoji: "🧠" },
  { id: "orgchart", name: "Organograma", emoji: "🏢" },
  { id: "flowchart", name: "Fluxograma", emoji: "🔄" },
] as const;

export const diagramTypes = [
  { slug: "mindmap", name: "Mapa Mental", icon: "🧠", description: "Crie ideias que se organizam radialmente." },
  { slug: "orgchart", name: "Organograma", icon: "🏢", description: "Hierarquia organizacional vertical." },
  { slug: "flowchart", name: "Fluxograma", icon: "🔄", description: "Processos e tomadas de decisão." },
] as const;
