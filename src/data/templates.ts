import type { Node, Edge } from "@xyflow/react";

export interface DiagramTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  category?: string;
  nodes: Node[];
  edges: Edge[];
}

// ─── Helpers ────────────────────────────────────
const colors = ["blue", "green", "purple", "red", "orange", "yellow"];

function mmTemplate(
  id: string,
  name: string,
  desc: string,
  children: string[],
  category?: string,
  grandchildren?: Record<string, string[]>
): DiagramTemplate {
  const rootId = "root";
  const nodes: Node[] = [
    { id: rootId, type: "mindmap", position: { x: 0, y: 0 }, data: { label: name, isRoot: true, color: "orange" } },
  ];
  const edges: Edge[] = [];
  children.forEach((child, i) => {
    const cid = `child_${i}`;
    nodes.push({
      id: cid,
      type: "mindmap",
      position: { x: 250, y: -60 * (children.length / 2 - i) },
      data: { label: child, color: colors[i % colors.length] },
    });
    edges.push({ id: `e-${rootId}-${cid}`, source: rootId, target: cid, type: "smoothstep" });
    if (grandchildren?.[child]) {
      grandchildren[child].forEach((gc, j) => {
        const gcid = `child_${i}_${j}`;
        nodes.push({
          id: gcid,
          type: "mindmap",
          position: { x: 500, y: -60 * (children.length / 2 - i) + j * 50 },
          data: { label: gc, color: colors[i % colors.length], variant: "branch" },
        });
        edges.push({ id: `e-${cid}-${gcid}`, source: cid, target: gcid, type: "smoothstep" });
      });
    }
  });
  return { id, name, description: desc, type: "mindmap", category, nodes, edges };
}

function flowTemplate(
  id: string,
  name: string,
  desc: string,
  steps: { label: string; shape?: string }[],
  category?: string
): DiagramTemplate {
  const nodes: Node[] = steps.map((s, i) => ({
    id: `fc_${i}`,
    type: "flowchart",
    position: { x: 0, y: i * 120 },
    data: { label: s.label, shape: s.shape || "rectangle", color: i === 0 ? "green" : i === steps.length - 1 ? "red" : "blue" },
  }));
  const edges: Edge[] = steps.slice(0, -1).map((_, i) => ({
    id: `e-fc_${i}-fc_${i + 1}`,
    source: `fc_${i}`,
    target: `fc_${i + 1}`,
    type: "smoothstep",
  }));
  return { id, name, description: desc, type: "flowchart", category, nodes, edges };
}

function orgTemplate(
  id: string,
  name: string,
  desc: string,
  tree: { label: string; role: string; children?: { label: string; role: string }[] }[],
  category?: string
): DiagramTemplate {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  tree.forEach((person, i) => {
    const pid = `org_${i}`;
    nodes.push({
      id: pid,
      type: "org",
      position: { x: i * 220, y: 0 },
      data: { label: person.label, role: person.role, color: colors[i % colors.length] },
    });
    person.children?.forEach((child, j) => {
      const cid = `org_${i}_${j}`;
      nodes.push({
        id: cid,
        type: "org",
        position: { x: i * 220 + j * 200, y: 150 },
        data: { label: child.label, role: child.role, color: colors[(i + j) % colors.length] },
      });
      edges.push({ id: `e-${pid}-${cid}`, source: pid, target: cid, type: "smoothstep" });
    });
  });
  return { id, name, description: desc, type: "orgchart", category, nodes, edges };
}

function timelineTemplate(
  id: string,
  name: string,
  desc: string,
  events: { label: string; date: string }[],
  category?: string
): DiagramTemplate {
  const nodes: Node[] = events.map((e, i) => ({
    id: `tl_${i}`,
    type: "timeline",
    position: { x: i * 240, y: 0 },
    data: { label: e.label, date: e.date, color: colors[i % colors.length], isMilestone: i === 0 || i === events.length - 1 },
  }));
  const edges: Edge[] = events.slice(0, -1).map((_, i) => ({
    id: `e-tl_${i}-tl_${i + 1}`,
    source: `tl_${i}`,
    target: `tl_${i + 1}`,
    type: "smoothstep",
  }));
  return { id, name, description: desc, type: "timeline", category, nodes, edges };
}

// ─── Blank Templates (single root node only) ───
const blankMindmap: DiagramTemplate = {
  id: "mm-blank",
  name: "Em branco",
  description: "Comece do zero com um nó central",
  type: "mindmap",
  nodes: [{ id: "root", type: "mindmap", position: { x: 0, y: 0 }, data: { label: "Ideia Central", isRoot: true, color: "orange" } }],
  edges: [],
};

const blankFlowchart: DiagramTemplate = {
  id: "fc-blank",
  name: "Em branco",
  description: "Comece do zero com o nó inicial",
  type: "flowchart",
  nodes: [{ id: "fc_0", type: "flowchart", position: { x: 0, y: 0 }, data: { label: "Início", shape: "oval", color: "green" } }],
  edges: [],
};

const blankOrgchart: DiagramTemplate = {
  id: "org-blank",
  name: "Em branco",
  description: "Comece do zero com o cargo principal",
  type: "orgchart",
  nodes: [{ id: "org_0", type: "org", position: { x: 0, y: 0 }, data: { label: "CEO", role: "Chief Executive Officer", color: "orange", isRoot: true } }],
  edges: [],
};

const blankTimeline: DiagramTemplate = {
  id: "tl-blank",
  name: "Em branco",
  description: "Comece do zero com o primeiro marco",
  type: "timeline",
  nodes: [{ id: "tl_0", type: "timeline", position: { x: 0, y: 0 }, data: { label: "Marco 1", date: "Hoje", color: "blue", isMilestone: true } }],
  edges: [],
};

const blankConceptMap: DiagramTemplate = {
  id: "cm-blank",
  name: "Em branco",
  description: "Comece do zero com um conceito",
  type: "concept_map",
  nodes: [{ id: "c1", type: "concept", position: { x: 0, y: 0 }, data: { label: "Conceito", color: "blue" } }],
  edges: [],
};

// ─── Mindmap Templates ──────────────────────────

const mindmapTemplates: DiagramTemplate[] = [
  blankMindmap,

  // Educação
  mmTemplate("mm-study", "Estudo de Tema", "O Quê, Por Quê, Como, Exemplos", ["O Quê?", "Por Quê?", "Como?", "Exemplos"], "educacao"),
  mmTemplate("mm-book-summary", "Resumo de Livro", "Capítulos, ideias-chave e citações", ["Autor & Contexto", "Capítulos", "Ideias Centrais", "Citações"], "educacao"),
  mmTemplate("mm-class-notes", "Anotações de Aula", "Tema principal com subtópicos da aula", ["Introdução", "Conceitos-Chave", "Exemplos Práticos", "Dúvidas"], "educacao"),
  mmTemplate("mm-exam-prep", "Preparação para Prova", "Organize matérias e tópicos para revisão", ["Matéria 1", "Matéria 2", "Fórmulas", "Exercícios"], "educacao"),
  mmTemplate("mm-research", "Pesquisa Acadêmica", "Estruture sua pesquisa", ["Problema", "Hipótese", "Metodologia", "Resultados"], "educacao", {
    "Problema": ["Contexto", "Justificativa"],
    "Metodologia": ["Qualitativa", "Quantitativa"],
  }),

  // Negócios
  mmTemplate("mm-brainstorm", "Brainstorm de Produto", "Features, Problemas, Público, Concorrentes", ["Features", "Problemas", "Público-Alvo", "Concorrentes"], "negocios"),
  mmTemplate("mm-project", "Planejamento de Projeto", "Objetivos, Tarefas, Riscos, Recursos", ["Objetivos", "Tarefas", "Riscos", "Recursos"], "negocios"),
  mmTemplate("mm-swot", "Análise SWOT", "Forças, Fraquezas, Oportunidades, Ameaças", ["Forças", "Fraquezas", "Oportunidades", "Ameaças"], "negocios"),
  mmTemplate("mm-business-model", "Modelo de Negócio", "Canvas simplificado", ["Proposta de Valor", "Segmentos", "Canais", "Receita"], "negocios", {
    "Proposta de Valor": ["Diferencial", "Benefícios"],
    "Canais": ["Online", "Offline"],
  }),
  mmTemplate("mm-okr", "OKRs", "Objetivos e Resultados-Chave", ["Objetivo 1", "Objetivo 2", "Objetivo 3"], "negocios", {
    "Objetivo 1": ["KR 1.1", "KR 1.2", "KR 1.3"],
    "Objetivo 2": ["KR 2.1", "KR 2.2"],
  }),
  mmTemplate("mm-marketing", "Plano de Marketing", "Estratégia de marketing digital", ["SEO", "Redes Sociais", "Email Marketing", "Ads"], "negocios"),
  mmTemplate("mm-competitor", "Análise de Concorrentes", "Mapeie o cenário competitivo", ["Concorrente A", "Concorrente B", "Nosso Diferencial", "Oportunidades"], "negocios"),

  // Produtividade
  mmTemplate("mm-weekly", "Planejamento Semanal", "Organize sua semana", ["Segunda", "Terça", "Quarta", "Quinta"], "produtividade"),
  mmTemplate("mm-goals", "Metas Pessoais", "Defina e acompanhe objetivos", ["Saúde", "Carreira", "Finanças", "Aprendizado"], "produtividade"),
  mmTemplate("mm-decision", "Tomada de Decisão", "Prós, contras e alternativas", ["Opção A", "Opção B", "Prós", "Contras"], "produtividade"),
  mmTemplate("mm-event-plan", "Planejamento de Evento", "Organize todos os detalhes", ["Local", "Convidados", "Orçamento", "Cronograma"], "produtividade"),
  mmTemplate("mm-habit-tracker", "Rastreador de Hábitos", "Hábitos por área da vida", ["Manhã", "Exercício", "Leitura", "Meditação"], "produtividade"),
];

// ─── Flowchart Templates ────────────────────────

const flowchartTemplates: DiagramTemplate[] = [
  blankFlowchart,

  // Negócios
  flowTemplate("fc-sales", "Processo de Vendas", "Lead até Fechamento", [
    { label: "Lead", shape: "oval" },
    { label: "Qualificação" },
    { label: "Demo" },
    { label: "Proposta" },
    { label: "Negociação" },
    { label: "Fechamento", shape: "oval" },
  ], "negocios"),
  flowTemplate("fc-onboarding", "Onboarding de Cliente", "Do cadastro ao primeiro sucesso", [
    { label: "Cadastro", shape: "oval" },
    { label: "Email de Boas-vindas" },
    { label: "Setup da Conta" },
    { label: "Tutorial Guiado" },
    { label: "Primeiro Uso", shape: "oval" },
  ], "negocios"),
  flowTemplate("fc-hiring", "Processo Seletivo", "Vaga até contratação", [
    { label: "Vaga Aberta", shape: "oval" },
    { label: "Triagem de CVs" },
    { label: "Entrevista RH" },
    { label: "Teste Técnico" },
    { label: "Entrevista Final" },
    { label: "Contratação", shape: "oval" },
  ], "negocios"),
  flowTemplate("fc-support", "Atendimento ao Cliente", "Ticket até resolução", [
    { label: "Ticket Aberto", shape: "oval" },
    { label: "Classificação" },
    { label: "Análise", shape: "diamond" },
    { label: "Resolução" },
    { label: "Feedback", shape: "oval" },
  ], "negocios"),

  // Tecnologia
  flowTemplate("fc-cicd", "CI/CD Pipeline", "Commit até Produção", [
    { label: "Commit", shape: "oval" },
    { label: "Build" },
    { label: "Testes" },
    { label: "Code Review" },
    { label: "Staging" },
    { label: "Produção", shape: "oval" },
  ], "negocios"),
  flowTemplate("fc-bug", "Bug Report Flow", "Do bug à correção", [
    { label: "Bug Reportado", shape: "oval" },
    { label: "Reproduzir" },
    { label: "Priorizar", shape: "diamond" },
    { label: "Desenvolver Fix" },
    { label: "QA Testing" },
    { label: "Deploy", shape: "oval" },
  ], "negocios"),

  // Produtividade
  flowTemplate("fc-decision", "Tomada de Decisão", "Problema → Decisão → Ações", [
    { label: "Problema", shape: "oval" },
    { label: "Analisar opções" },
    { label: "Decisão?", shape: "diamond" },
    { label: "Ação", shape: "oval" },
  ], "produtividade"),
  flowTemplate("fc-morning", "Rotina Matinal", "Organize sua manhã passo a passo", [
    { label: "Acordar", shape: "oval" },
    { label: "Meditação" },
    { label: "Exercício" },
    { label: "Café da manhã" },
    { label: "Planejamento do dia", shape: "oval" },
  ], "produtividade"),

  // Educação
  flowTemplate("fc-scientific", "Método Científico", "Da hipótese à conclusão", [
    { label: "Observação", shape: "oval" },
    { label: "Pergunta" },
    { label: "Hipótese" },
    { label: "Experimento" },
    { label: "Análise", shape: "diamond" },
    { label: "Conclusão", shape: "oval" },
  ], "educacao"),
  flowTemplate("fc-essay", "Estrutura de Redação", "Planeje sua redação", [
    { label: "Tema", shape: "oval" },
    { label: "Tese" },
    { label: "Argumento 1" },
    { label: "Argumento 2" },
    { label: "Contra-argumento" },
    { label: "Conclusão", shape: "oval" },
  ], "educacao"),
];

// ─── Orgchart Templates ─────────────────────────

const orgchartTemplates: DiagramTemplate[] = [
  blankOrgchart,

  orgTemplate("org-startup", "Startup", "CEO → C-Level → Times", [
    {
      label: "CEO", role: "Chief Executive Officer",
      children: [
        { label: "CTO", role: "Chief Technology Officer" },
        { label: "CMO", role: "Chief Marketing Officer" },
        { label: "CFO", role: "Chief Financial Officer" },
      ],
    },
  ], "negocios"),
  orgTemplate("org-dept", "Departamentos", "Diretor com gerentes por área", [
    {
      label: "Diretor Geral", role: "Direção",
      children: [
        { label: "Ger. Vendas", role: "Vendas" },
        { label: "Ger. TI", role: "Tecnologia" },
        { label: "Ger. RH", role: "Recursos Humanos" },
        { label: "Ger. Financeiro", role: "Finanças" },
      ],
    },
  ], "negocios"),
  orgTemplate("org-product-team", "Time de Produto", "PM → Design + Dev + QA", [
    {
      label: "Product Manager", role: "PM",
      children: [
        { label: "UX Designer", role: "Design" },
        { label: "Tech Lead", role: "Engenharia" },
        { label: "QA Lead", role: "Qualidade" },
      ],
    },
  ], "negocios"),
  orgTemplate("org-school", "Estrutura Escolar", "Diretor → Coordenação → Professores", [
    {
      label: "Diretor", role: "Direção Escolar",
      children: [
        { label: "Coord. Pedagógico", role: "Coordenação" },
        { label: "Coord. Administrativo", role: "Administração" },
      ],
    },
  ], "educacao"),
];

// ─── Timeline Templates ─────────────────────────

const timelineTemplates: DiagramTemplate[] = [
  blankTimeline,

  timelineTemplate("tl-roadmap", "Roadmap de Produto", "Q1 a Q4 com épicos", [
    { label: "Discovery", date: "Q1" },
    { label: "MVP", date: "Q2" },
    { label: "Beta", date: "Q3" },
    { label: "Lançamento", date: "Q4" },
  ], "negocios"),
  timelineTemplate("tl-project", "Cronograma de Projeto", "Fases do projeto", [
    { label: "Kick-off", date: "Semana 1" },
    { label: "Pesquisa", date: "Semana 2-3" },
    { label: "Design", date: "Semana 4-5" },
    { label: "Desenvolvimento", date: "Semana 6-10" },
    { label: "Testes", date: "Semana 11" },
    { label: "Go Live", date: "Semana 12" },
  ], "negocios"),
  timelineTemplate("tl-history", "Linha do Tempo Histórica", "Eventos históricos sequenciais", [
    { label: "Evento 1", date: "1900" },
    { label: "Evento 2", date: "1950" },
    { label: "Evento 3", date: "2000" },
    { label: "Evento 4", date: "2025" },
  ], "educacao"),
  timelineTemplate("tl-career", "Trajetória Profissional", "Marcos da carreira", [
    { label: "Graduação", date: "2018" },
    { label: "Primeiro Emprego", date: "2019" },
    { label: "Promoção", date: "2021" },
    { label: "Liderança", date: "2023" },
    { label: "Objetivo Atual", date: "2025" },
  ], "produtividade"),
  timelineTemplate("tl-semester", "Planejamento Semestral", "Organize o semestre acadêmico", [
    { label: "Matrícula", date: "Fev" },
    { label: "Provas P1", date: "Abr" },
    { label: "Trabalhos", date: "Mai" },
    { label: "Provas P2", date: "Jun" },
    { label: "Recuperação", date: "Jul" },
  ], "educacao"),
  timelineTemplate("tl-sprint", "Sprint Planning", "Planejamento de sprint ágil", [
    { label: "Sprint Planning", date: "Dia 1" },
    { label: "Daily Standup", date: "Diário" },
    { label: "Code Review", date: "Dia 8" },
    { label: "Sprint Review", date: "Dia 14" },
    { label: "Retrospectiva", date: "Dia 14" },
  ], "negocios"),
];

// ─── Concept Map Templates ──────────────────────

const conceptTemplates: DiagramTemplate[] = [
  blankConceptMap,

  {
    id: "cm-ecosystem",
    name: "Ecossistema de Produto",
    description: "Produto central com stakeholders ao redor",
    type: "concept_map",
    category: "negocios",
    nodes: [
      { id: "center", type: "concept", position: { x: 200, y: 200 }, data: { label: "Produto", color: "orange" } },
      { id: "s1", type: "concept", position: { x: 0, y: 0 }, data: { label: "Usuários", color: "blue" } },
      { id: "s2", type: "concept", position: { x: 400, y: 0 }, data: { label: "Parceiros", color: "green" } },
      { id: "s3", type: "concept", position: { x: 0, y: 400 }, data: { label: "Investidores", color: "purple" } },
      { id: "s4", type: "concept", position: { x: 400, y: 400 }, data: { label: "Concorrentes", color: "red" } },
    ],
    edges: [
      { id: "e1", source: "center", target: "s1", type: "smoothstep", label: "serve" },
      { id: "e2", source: "center", target: "s2", type: "smoothstep", label: "integra com" },
      { id: "e3", source: "center", target: "s3", type: "smoothstep", label: "gera valor para" },
      { id: "e4", source: "center", target: "s4", type: "smoothstep", label: "compete com" },
    ],
  },
  {
    id: "cm-cause-effect",
    name: "Causa e Efeito",
    description: "Mapeie causas e efeitos de um problema",
    type: "concept_map",
    category: "educacao",
    nodes: [
      { id: "problem", type: "concept", position: { x: 300, y: 200 }, data: { label: "Problema Central", color: "red" } },
      { id: "c1", type: "concept", position: { x: 0, y: 0 }, data: { label: "Causa 1", color: "orange" } },
      { id: "c2", type: "concept", position: { x: 0, y: 200 }, data: { label: "Causa 2", color: "orange" } },
      { id: "c3", type: "concept", position: { x: 0, y: 400 }, data: { label: "Causa 3", color: "orange" } },
      { id: "e1", type: "concept", position: { x: 600, y: 0 }, data: { label: "Efeito 1", color: "blue" } },
      { id: "e2", type: "concept", position: { x: 600, y: 200 }, data: { label: "Efeito 2", color: "blue" } },
      { id: "e3", type: "concept", position: { x: 600, y: 400 }, data: { label: "Efeito 3", color: "blue" } },
    ],
    edges: [
      { id: "ec1", source: "c1", target: "problem", type: "smoothstep", label: "causa" },
      { id: "ec2", source: "c2", target: "problem", type: "smoothstep", label: "causa" },
      { id: "ec3", source: "c3", target: "problem", type: "smoothstep", label: "causa" },
      { id: "ee1", source: "problem", target: "e1", type: "smoothstep", label: "provoca" },
      { id: "ee2", source: "problem", target: "e2", type: "smoothstep", label: "provoca" },
      { id: "ee3", source: "problem", target: "e3", type: "smoothstep", label: "provoca" },
    ],
  },
  {
    id: "cm-tech-stack",
    name: "Stack Tecnológica",
    description: "Mapeie tecnologias e suas relações",
    type: "concept_map",
    category: "negocios",
    nodes: [
      { id: "app", type: "concept", position: { x: 250, y: 0 }, data: { label: "Aplicação", color: "orange" } },
      { id: "frontend", type: "concept", position: { x: 0, y: 150 }, data: { label: "Frontend", color: "blue" } },
      { id: "backend", type: "concept", position: { x: 250, y: 150 }, data: { label: "Backend", color: "green" } },
      { id: "db", type: "concept", position: { x: 500, y: 150 }, data: { label: "Banco de Dados", color: "purple" } },
      { id: "infra", type: "concept", position: { x: 250, y: 300 }, data: { label: "Infraestrutura", color: "red" } },
    ],
    edges: [
      { id: "e1", source: "app", target: "frontend", type: "smoothstep", label: "usa" },
      { id: "e2", source: "app", target: "backend", type: "smoothstep", label: "usa" },
      { id: "e3", source: "backend", target: "db", type: "smoothstep", label: "conecta" },
      { id: "e4", source: "backend", target: "infra", type: "smoothstep", label: "roda em" },
      { id: "e5", source: "frontend", target: "backend", type: "smoothstep", label: "consome API" },
    ],
  },
  {
    id: "cm-learning-path",
    name: "Trilha de Aprendizado",
    description: "Organize uma trilha de estudos com pré-requisitos",
    type: "concept_map",
    category: "educacao",
    nodes: [
      { id: "goal", type: "concept", position: { x: 250, y: 0 }, data: { label: "Objetivo Final", color: "orange" } },
      { id: "mod1", type: "concept", position: { x: 0, y: 150 }, data: { label: "Módulo 1", color: "blue" } },
      { id: "mod2", type: "concept", position: { x: 250, y: 150 }, data: { label: "Módulo 2", color: "green" } },
      { id: "mod3", type: "concept", position: { x: 500, y: 150 }, data: { label: "Módulo 3", color: "purple" } },
      { id: "base", type: "concept", position: { x: 250, y: 300 }, data: { label: "Fundamentos", color: "red" } },
    ],
    edges: [
      { id: "e1", source: "base", target: "mod1", type: "smoothstep", label: "pré-requisito" },
      { id: "e2", source: "base", target: "mod2", type: "smoothstep", label: "pré-requisito" },
      { id: "e3", source: "mod1", target: "mod3", type: "smoothstep", label: "habilita" },
      { id: "e4", source: "mod2", target: "mod3", type: "smoothstep", label: "habilita" },
      { id: "e5", source: "mod3", target: "goal", type: "smoothstep", label: "leva a" },
    ],
  },
];

// ─── All templates ──────────────────────────────
export const allTemplates: DiagramTemplate[] = [
  ...mindmapTemplates,
  ...flowchartTemplates,
  ...orgchartTemplates,
  ...timelineTemplates,
  ...conceptTemplates,
];

export function getTemplatesByType(type: string): DiagramTemplate[] {
  return allTemplates.filter((t) => t.type === type);
}

export const templateCategories = [
  { id: "all", name: "Todos", emoji: "📁" },
  { id: "educacao", name: "Educação", emoji: "📚" },
  { id: "negocios", name: "Negócios", emoji: "💼" },
  { id: "produtividade", name: "Produtividade", emoji: "⚡" },
] as const;

export const diagramTypes = [
  { slug: "mindmap", name: "Mapa Mental", icon: "🧠", description: "Hierárquico radial, nós orgânicos" },
  { slug: "flowchart", name: "Fluxograma", icon: "📊", description: "Sequencial top-down, formas padrão" },
  { slug: "orgchart", name: "Organograma", icon: "🏢", description: "Hierárquico vertical com cargos" },
  { slug: "timeline", name: "Linha do Tempo", icon: "⏱️", description: "Horizontal, eventos sequenciais" },
  { slug: "concept_map", name: "Mapa Conceitual", icon: "🔗", description: "Grafo livre, relações nomeadas" },
] as const;
