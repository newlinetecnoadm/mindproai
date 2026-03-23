import type { Node, Edge } from "@xyflow/react";
import { buildNodeStyle } from "@/lib/nodeStyles";

export interface DiagramTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  category?: string;
  nodes: Node[];
  edges: Edge[];
}

// --- Blank Mindmap Template ---
const blankMindmap: DiagramTemplate = {
  id: "mm-blank",
  name: "Em branco",
  description: "Comece do zero com um mapa mental",
  type: "mindmap",
  nodes: [{
    id: "root",
    type: "mindmap",
    position: { x: 0, y: 0 },
    data: { label: "Ideia Central", isRoot: true, color: "orange" },
    style: buildNodeStyle("mindmap", true, 0),
  }],
  edges: [],
};

// --- All templates ------------------------------
export const allTemplates: DiagramTemplate[] = [
  blankMindmap,
];

export function getTemplatesByType(type: string): DiagramTemplate[] {
  return allTemplates.filter((t) => t.type === type);
}

export const templateCategories = [
  { id: "all", name: "Todos", emoji: "📁" },
] as const;

export const diagramTypes = [
  { slug: "mindmap", name: "Mapa Mental", icon: "🧠", description: "Hierárquico radial, nós orgânicos" },
] as const;
