import type { Node, Edge } from "@xyflow/react";

export interface DiagramTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  nodes: Node[];
  edges: Edge[];
}

// Helper
let _c = 0;
const nid = () => `tpl_${++_c}`;

// ─── Mindmap Templates ──────────────────────────
const mindmapBlank: DiagramTemplate = {
  id: "mm-blank",
  name: "Em branco",
  description: "Nó central vazio para começar do zero",
  type: "mindmap",
  nodes: [
    { id: "root", type: "mindmap", position: { x: 0, y: 0 }, data: { label: "Ideia Central", isRoot: true, color: "orange" } },
  ],
  edges: [],
};

function mmTemplate(id: string, name: string, desc: string, children: string[]): DiagramTemplate {
  const rootId = "root";
  const nodes: Node[] = [
    { id: rootId, type: "mindmap", position: { x: 0, y: 0 }, data: { label: name, isRoot: true, color: "orange" } },
  ];
  const edges: Edge[] = [];
  const colors = ["blue", "green", "purple", "red"];
  children.forEach((child, i) => {
    const cid = `child_${i}`;
    nodes.push({
      id: cid, type: "mindmap",
      position: { x: 250, y: -60 * (children.length / 2 - i) },
      data: { label: child, color: colors[i % colors.length] },
    });
    edges.push({ id: `e-${rootId}-${cid}`, source: rootId, target: cid, type: "smoothstep" });
  });
  return { id, name, description: desc, type: "mindmap", nodes, edges };
}

const mindmapTemplates: DiagramTemplate[] = [
  mindmapBlank,
  mmTemplate("mm-brainstorm", "Brainstorm de Produto", "Features, Problemas, Público, Concorrentes", ["Features", "Problemas", "Público-Alvo", "Concorrentes"]),
  mmTemplate("mm-project", "Planejamento de Projeto", "Objetivos, Tarefas, Riscos, Recursos", ["Objetivos", "Tarefas", "Riscos", "Recursos"]),
  mmTemplate("mm-study", "Estudo de Tema", "O Quê, Por Quê, Como, Exemplos", ["O Quê?", "Por Quê?", "Como?", "Exemplos"]),
  mmTemplate("mm-swot", "Análise SWOT", "Forças, Fraquezas, Oportunidades, Ameaças", ["Forças", "Fraquezas", "Oportunidades", "Ameaças"]),
];

// ─── Flowchart Templates ────────────────────────
function flowTemplate(id: string, name: string, desc: string, steps: { label: string; shape?: string }[]): DiagramTemplate {
  const nodes: Node[] = steps.map((s, i) => ({
    id: `fc_${i}`, type: "flowchart",
    position: { x: 0, y: i * 120 },
    data: { label: s.label, shape: s.shape || "rectangle", color: i === 0 ? "green" : i === steps.length - 1 ? "red" : "blue" },
  }));
  const edges: Edge[] = steps.slice(0, -1).map((_, i) => ({
    id: `e-fc_${i}-fc_${i + 1}`, source: `fc_${i}`, target: `fc_${i + 1}`, type: "smoothstep",
  }));
  return { id, name, description: desc, type: "flowchart", nodes, edges };
}

const flowchartTemplates: DiagramTemplate[] = [
  flowTemplate("fc-blank", "Em branco", "Início → Processo → Fim", [
    { label: "Início", shape: "oval" },
    { label: "Processo" },
    { label: "Fim", shape: "oval" },
  ]),
  flowTemplate("fc-sales", "Processo de Vendas", "Lead até Fechamento", [
    { label: "Lead", shape: "oval" },
    { label: "Qualificação" },
    { label: "Demo" },
    { label: "Proposta" },
    { label: "Fechamento", shape: "oval" },
  ]),
  flowTemplate("fc-decision", "Tomada de Decisão", "Problema → Decisão → Ações", [
    { label: "Problema", shape: "oval" },
    { label: "Analisar opções" },
    { label: "Decisão?", shape: "diamond" },
    { label: "Ação", shape: "oval" },
  ]),
  flowTemplate("fc-cicd", "CI/CD Pipeline", "Commit até Produção", [
    { label: "Commit", shape: "oval" },
    { label: "Build" },
    { label: "Testes" },
    { label: "Staging" },
    { label: "Produção", shape: "oval" },
  ]),
];

// ─── Orgchart Templates ─────────────────────────
function orgTemplate(id: string, name: string, desc: string, tree: { label: string; role: string; children?: { label: string; role: string }[] }[]): DiagramTemplate {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const colors = ["blue", "green", "purple", "red"];

  tree.forEach((person, i) => {
    const pid = `org_${i}`;
    nodes.push({
      id: pid, type: "org",
      position: { x: i * 220, y: 0 },
      data: { label: person.label, role: person.role, color: colors[i % colors.length] },
    });
    person.children?.forEach((child, j) => {
      const cid = `org_${i}_${j}`;
      nodes.push({
        id: cid, type: "org",
        position: { x: i * 220 + j * 200, y: 150 },
        data: { label: child.label, role: child.role, color: colors[i % colors.length] },
      });
      edges.push({ id: `e-${pid}-${cid}`, source: pid, target: cid, type: "smoothstep" });
    });
  });
  return { id, name, description: desc, type: "orgchart", nodes, edges };
}

const orgchartTemplates: DiagramTemplate[] = [
  orgTemplate("org-blank", "Em branco", "CEO → Departamentos", [
    { label: "CEO", role: "Chief Executive Officer", children: [
      { label: "VP Produto", role: "Vice-Presidente" },
      { label: "VP Engenharia", role: "Vice-Presidente" },
    ] },
  ]),
  orgTemplate("org-startup", "Startup 3 Níveis", "CEO → C-Level → Times", [
    { label: "CEO", role: "Chief Executive Officer", children: [
      { label: "CTO", role: "Chief Technology Officer" },
      { label: "CMO", role: "Chief Marketing Officer" },
    ] },
  ]),
];

// ─── Timeline Templates ─────────────────────────
function timelineTemplate(id: string, name: string, desc: string, events: { label: string; date: string }[]): DiagramTemplate {
  const colors = ["blue", "green", "purple", "orange"];
  const nodes: Node[] = events.map((e, i) => ({
    id: `tl_${i}`, type: "timeline",
    position: { x: i * 240, y: 0 },
    data: { label: e.label, date: e.date, color: colors[i % colors.length], isMilestone: i === 0 || i === events.length - 1 },
  }));
  const edges: Edge[] = events.slice(0, -1).map((_, i) => ({
    id: `e-tl_${i}-tl_${i + 1}`, source: `tl_${i}`, target: `tl_${i + 1}`, type: "smoothstep",
  }));
  return { id, name, description: desc, type: "timeline", nodes, edges };
}

const timelineTemplates: DiagramTemplate[] = [
  timelineTemplate("tl-blank", "Em branco", "3 marcos sequenciais", [
    { label: "Marco 1", date: "Jan" },
    { label: "Marco 2", date: "Fev" },
    { label: "Marco 3", date: "Mar" },
  ]),
  timelineTemplate("tl-roadmap", "Roadmap de Produto", "Q1 a Q4 com épicos", [
    { label: "Planejamento", date: "Q1" },
    { label: "MVP", date: "Q2" },
    { label: "Beta", date: "Q3" },
    { label: "Lançamento", date: "Q4" },
  ]),
];

// ─── Concept Map Templates ──────────────────────
const conceptTemplates: DiagramTemplate[] = [
  {
    id: "cm-blank",
    name: "Em branco",
    description: "2 conceitos com relação",
    type: "concept_map",
    nodes: [
      { id: "c1", type: "concept", position: { x: 0, y: 0 }, data: { label: "Conceito A", color: "blue" } },
      { id: "c2", type: "concept", position: { x: 300, y: 0 }, data: { label: "Conceito B", color: "green" } },
    ],
    edges: [
      { id: "e-c1-c2", source: "c1", target: "c2", type: "smoothstep", label: "relaciona-se com" },
    ],
  },
  {
    id: "cm-ecosystem",
    name: "Ecossistema de Produto",
    description: "Produto central com stakeholders ao redor",
    type: "concept_map",
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

export const diagramTypes = [
  { slug: "mindmap", name: "Mapa Mental", icon: "🧠", description: "Hierárquico radial, nós orgânicos" },
  { slug: "flowchart", name: "Fluxograma", icon: "📊", description: "Sequencial top-down, formas padrão" },
  { slug: "orgchart", name: "Organograma", icon: "🏢", description: "Hierárquico vertical com cargos" },
  { slug: "timeline", name: "Linha do Tempo", icon: "⏱️", description: "Horizontal, eventos sequenciais" },
  { slug: "concept_map", name: "Mapa Conceitual", icon: "🔗", description: "Grafo livre, relações nomeadas" },
] as const;
