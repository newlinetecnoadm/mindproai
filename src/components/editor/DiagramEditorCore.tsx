import { useCallback, useRef, useState, useEffect } from "react";
import { toPng, toSvg } from "html-to-image";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import UpgradeModal from "@/components/UpgradeModal";
import {
  ReactFlow,
  addEdge,
  useReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  type Connection,
  type Node,
  type Edge,
  ReactFlowProvider,
} from "@xyflow/react";
import { useAutosave, type AutosaveStatus } from "@/hooks/useAutosave";
import "@xyflow/react/dist/style.css";

import MindMapNode from "@/components/mindmap/MindMapNode";
import GhostNode from "@/components/mindmap/GhostNode";
import { MindMapEdge, SketchEdge, FlowEdge } from "./edges/CustomEdges";

import EditorToolbar from "./EditorToolbar";
import EdgeFloatingToolbar from "./EdgeFloatingToolbar";
import NodeFloatingToolbar from "./NodeFloatingToolbar";
import NodeSearchBar from "./NodeSearchBar";
import NodeContextMenu from "./NodeContextMenu";
import { editorThemes, isColorDark, type EditorTheme } from "./editorThemes";
import { UserRoleProvider } from "./UserRoleContext";
import { OutlineView } from "./OutlineView";
import { ImportOutlineDialog } from "./ImportOutlineDialog";
import { MultiSelectBar } from "./MultiSelectBar";
import MobileNodeDrawer from "./MobileNodeDrawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { PlusCircle, Undo2, Redo2 } from "lucide-react";
import { cn } from "@/lib/utils";

import { useMindMapStore } from "@/store/useMindMapStore";
import { useElkLayout } from "@/hooks/useElkLayout";

/** Derive UI chrome colors from a theme */
function themeUI(t: EditorTheme) {
  const dark = isColorDark(t.bg);
  return {
    cardBg: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.92)",
    cardBorder: dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
    cardText: dark ? "#e2e8f0" : "#1f1f1f",
    minimapNode: t.edgeColor,
    accentColor: t.edgeColor,
  };
}

const nodeTypes = {
  mindmap: MindMapNode as any,
  ghost: GhostNode as any,
};

const edgeTypes = {
  mindmap: MindMapEdge as any,
  sketch: SketchEdge as any,
  flow: FlowEdge as any,
};

const PROXIMITY_THRESHOLD = 120;

interface DiagramEditorCoreProps {
  diagramType: string;
  initialLayoutDirection?: "DOWN" | "RIGHT";
  initialNodes?: Node[];
  initialEdges?: Edge[];
  initialThemeId?: string;
  onSave: (nodes: Node[], edges: Edge[], themeId: string, thumbnailDataUrl?: string, options?: { silent?: boolean }) => Promise<void>;
  saving: boolean;
  remoteNodes?: Node[];
  remoteEdges?: Edge[];
  remoteThemeId?: string;
  userRole?: "owner" | "editor" | "viewer";
}

// ─── Outline → Nodes/Edges parser ────────────────────────────────────────────
const BRANCH_PALETTE = ["#3B82F6","#8B5CF6","#EC4899","#F59E0B","#10B981","#EF4444","#06B6D4","#F97316"];

function parseOutlineToNodes(text: string, diagramType = "mindmap") {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const nodes: any[] = [];
  const edges: any[] = [];
  const isFlowDiagram = diagramType === "orgchart" || diagramType === "flowchart";

  // ── Format detection ──────────────────────────────────────────────────────
  // Numbered outline: "1. label" (top-level with dot) or "1.1 label" (multi-level)
  // "5 a 25 computadores" must NOT match — it starts with a digit but has no dot before the text.
  const isNumberedOutline = lines.some(
    (l) => /^\d+\.\s/.test(l.trimStart()) || /^\d+\.\d/.test(l.trimStart())
  );

  // ── Per-line depth + label extraction ────────────────────────────────────
  let lastNumberedDepth = 0; // tracks the depth of the most recent numbered line

  const parseLine = (line: string, isFirst: boolean): { depth: number; label: string } => {
    // First line is always the root
    if (isFirst) {
      const label = line.trim().replace(/^#{1,6}\s+/, "").replace(/^\d+(?:\.\d+)*\s+/, "").trim();
      return { depth: 0, label };
    }

    const trimmed = line.trimStart();

    if (isNumberedOutline) {
      // Top-level "1. label" (single number + dot + space)
      const topMatch = trimmed.match(/^(\d+)\.\s+([\s\S]+)/);
      if (topMatch && !/^\d+\.\d/.test(trimmed)) {
        // Single-number top-level: depth = 1
        lastNumberedDepth = 1;
        return { depth: 1, label: topMatch[2].trim() };
      }
      // Multi-level "1.1 label", "1.1.2 label" (dots between numeric segments)
      const m = trimmed.match(/^(\d+\.\d+(?:\.\d+)*)\s+([\s\S]+)/);
      if (m) {
        // depth = number of numeric segments ("1" → 1, "1.1" → 2, "1.1.1" → 3)
        const depth = m[1].split(".").length;
        lastNumberedDepth = depth;
        return { depth, label: m[2].trim() };
      }
      // Unnumbered line inside a numbered outline → child of last numbered parent
      return { depth: lastNumberedDepth + 1, label: trimmed.trim() };
    }

    // Markdown headers: "# " → depth 0, "## " → depth 1, etc.
    const hMatch = trimmed.match(/^(#{1,6})\s+([\s\S]+)/);
    if (hMatch) return { depth: hMatch[1].length - 1, label: hMatch[2].trim() };

    // Indentation (spaces or tabs)
    const indentMatch = line.match(/^(\s*)/);
    const indent = indentMatch?.[1] ?? "";
    const depth = indent.includes("\t")
      ? indent.split("\t").length - 1
      : Math.floor(indent.length / 2);
    return { depth, label: trimmed.trim() };
  };

  // ── Build tree ────────────────────────────────────────────────────────────
  const depthStack: string[] = []; // node IDs indexed by depth

  lines.forEach((line, i) => {
    const { depth, label } = parseLine(line, nodes.length === 0);
    if (!label) return;

    const id = `imported_${i}_${Date.now()}`;
    const isRoot = depth === 0 && nodes.length === 0;

    // Branch color & side: determined at depth 1, inherited by descendants
    let side: "left" | "right" | undefined;
    let branchColor = BRANCH_PALETTE[0];
    let branchIndex = 0;

    if (!isRoot) {
      if (depth === 1) {
        // Count existing depth-1 nodes to alternate sides and pick color
        const d1Count = nodes.filter((n) => n.data?.depth === 1).length;
        side = isFlowDiagram ? undefined : (d1Count % 2 === 0 ? "right" : "left");
        branchIndex = d1Count;
        branchColor = BRANCH_PALETTE[d1Count % BRANCH_PALETTE.length];
      } else {
        // Inherit from depth-1 ancestor stored in the stack
        const ancestor1 = nodes.find((n) => n.id === depthStack[1]);
        side = isFlowDiagram ? undefined : (ancestor1?.data?.side ?? "right");
        branchIndex = ancestor1?.data?.branchIndex ?? 0;
        branchColor = ancestor1?.data?.branchColor ?? BRANCH_PALETTE[0];
      }
    }

    nodes.push({
      id,
      type: "mindmap",
      position: { x: 0, y: i * 60 },
      data: {
        label,
        depth,
        isRoot,
        side,
        branchColor,
        branchIndex,
        ...(isFlowDiagram ? { shape: depth === 0 ? "oval" : "rectangle" } : {}),
      },
      style: { background: "transparent", border: "none", padding: 0, boxShadow: "none" },
    });

    // Update stack: truncate to current depth, then record this node
    depthStack.length = depth;
    depthStack[depth] = id;

    // Connect to parent
    const parentId = depth > 0 ? depthStack[depth - 1] : null;
    if (parentId) {
      edges.push({
        id: `e-${parentId}-${id}`,
        source: parentId,
        target: id,
        type: isFlowDiagram ? "flow" : "mindmap",
        ...(isFlowDiagram ? { sourceHandle: "s-bottom", targetHandle: "t-top" } : {}),
        data: { branchColor, side },
      });
    }
  });

  return { nodes, edges };
}

// ─── Markdown export helper ───────────────────────────────────────────────────
function exportToMarkdown(nodes: Node[], edges: Edge[]): string {
  const root = nodes.find((n) => (n.data as any)?.isRoot);
  if (!root) return "";

  const childrenMap = new Map<string, string[]>();
  for (const edge of edges) {
    if ((edge.data as any)?.isCustom) continue;
    const children = childrenMap.get(edge.source) ?? [];
    children.push(edge.target);
    childrenMap.set(edge.source, children);
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  function buildMd(nodeId: string, level: number): string {
    const node = nodeMap.get(nodeId);
    if (!node) return "";
    const icon = (node.data as any)?.icon ?? "";
    const label = (node.data as any)?.label ?? "";
    const notes = (node.data as any)?.notes ?? "";
    const prefix = level === 0 ? "# " : "#".repeat(Math.min(level + 1, 6)) + " ";
    let line = `${prefix}${icon ? icon + " " : ""}${label}\n`;
    if (notes) line += `\n> ${notes}\n`;
    const children = childrenMap.get(nodeId) ?? [];
    for (const childId of children) {
      line += "\n" + buildMd(childId, level + 1);
    }
    return line;
  }

  return buildMd(root.id, 0);
}

// ─── Hierarchical text export helper ─────────────────────────────────────────
function exportToText(nodes: Node[], edges: Edge[]): string {
  const root = nodes.find((n) => (n.data as any)?.isRoot);
  if (!root) return "";

  const childrenMap = new Map<string, string[]>();
  for (const edge of edges) {
    if (edge.type === "sketch") continue;
    const children = childrenMap.get(edge.source) ?? [];
    children.push(edge.target);
    childrenMap.set(edge.source, children);
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  function buildText(nodeId: string, depth: number): string {
    const node = nodeMap.get(nodeId);
    if (!node) return "";
    const icon = (node.data as any)?.icon ?? "";
    const label = (node.data as any)?.label ?? "";
    const prefix = "  ".repeat(depth);
    let line = `${prefix}${icon ? icon + " " : ""}${label}\n`;
    const children = childrenMap.get(nodeId) ?? [];
    for (const childId of children) {
      line += buildText(childId, depth + 1);
    }
    return line;
  }

  return buildText(root.id, 0).trimEnd();
}

function DiagramEditorInner({
  diagramType, initialLayoutDirection, initialNodes = [], initialEdges = [], initialThemeId,
  onSave, saving, remoteNodes, remoteEdges, remoteThemeId, userRole = "viewer"
}: DiagramEditorCoreProps) {
  const [viewMode, setViewMode] = useState<"graph" | "outline">("graph");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: Node } | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [mobileDrawerNode, setMobileDrawerNode] = useState<Node | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const [theme, setTheme] = useState<EditorTheme>(
    editorThemes.find((t) => t.id === initialThemeId) || editorThemes[0]
  );

  const limits = usePlanLimits();
  const isMobile = useIsMobile();
  const { fitView, zoomIn, zoomOut, setCenter, getZoom, getNode } = useReactFlow();

  // ─── Zustand Store ────────────────────────────────────────────────────────
  const visibleNodes = useMindMapStore(s => s.visibleNodes);
  const visibleEdges = useMindMapStore(s => s.visibleEdges);
  const allNodes = useMindMapStore(s => s.allNodes);
  const allEdges = useMindMapStore(s => s.allEdges);
  const past = useMindMapStore(s => s.past);
  const future = useMindMapStore(s => s.future);

  const initDiagram = useMindMapStore(s => s.initDiagram);
  const setDiagramType = useMindMapStore(s => s.setDiagramType);
  const setLayoutDirection = useMindMapStore(s => s.setLayoutDirection);
  const updateNodeShape = useMindMapStore(s => s.updateNodeShape);
  const onNodesChange = useMindMapStore(s => s.onNodesChange);
  const onEdgesChange = useMindMapStore(s => s.onEdgesChange);
  const setNodesAndEdges = useMindMapStore(s => s.setNodesAndEdges);
  const addChild = useMindMapStore(s => s.addChild);
  const addSibling = useMindMapStore(s => s.addSibling);
  const deleteNode = useMindMapStore(s => s.deleteNode);
  const deleteNodes = useMindMapStore(s => s.deleteNodes);
  const updateNodeLabel = useMindMapStore(s => s.updateNodeLabel);
  const undo = useMindMapStore(s => s.undo);
  const redo = useMindMapStore(s => s.redo);
  const applyTheme = useMindMapStore(s => s.applyTheme);
  const copySelection = useMindMapStore(s => s.copySelection);
  const pasteSelection = useMindMapStore(s => s.pasteSelection);
  const pendingEditNodeId = useMindMapStore(s => s.pendingEditNodeId);
  const clearPendingEdit = useMindMapStore(s => s.clearPendingEdit);
  const updateEdgeData = useMindMapStore(s => s.updateEdgeData);
  const addSketchEdge = useMindMapStore(s => s.addSketchEdge);
  const swapSketchEdgeDirection = useMindMapStore(s => s.swapSketchEdgeDirection);
  const pendingSketchSource = useMindMapStore(s => s.pendingSketchSource);
  const setPendingSketchSource = useMindMapStore(s => s.setPendingSketchSource);

  useElkLayout();

  // Initialization
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current && initialNodes.length > 0) {
      initialized.current = true;
      // Aplica tema antes de inicializar para que as cores já sejam derivadas do tema
      const isDark = isColorDark(theme.bg);
      useMindMapStore.getState().applyTheme(theme.edgeColor, isDark);
      setDiagramType(diagramType);
      if (initialLayoutDirection) {
        // Set direction directly in store without bumping labelVersion (avoid extra relayout)
        useMindMapStore.setState({ layoutDirection: initialLayoutDirection });
      }
      initDiagram(initialNodes as any[], initialEdges);
      setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 100);
    }
  }, [initialNodes, initialEdges, initDiagram, fitView, theme, setDiagramType, diagramType, initialLayoutDirection]);

  // ─── Drag to Reparent ─────────────────────────────────────────────────────
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [draggingDescendantIds, setDraggingDescendantIds] = useState<Set<string>>(new Set());

  const getDescendants = useCallback((nodeId: string, edgesList: Edge[]): Set<string> => {
    const ids = new Set<string>();
    const walk = (id: string) => {
      edgesList.filter(e => e.source === id).forEach(e => {
        if (!ids.has(e.target)) { ids.add(e.target); walk(e.target); }
      });
    };
    walk(nodeId);
    return ids;
  }, []);

  const handleNodeDragStart = useCallback((_e: any, node: Node) => {
    if ((node.data as any)?.isRoot) return;
    setDraggingNodeId(node.id);
    setDraggingDescendantIds(getDescendants(node.id, allEdges));
  }, [allEdges, getDescendants]);

  const handleNodeDrag = useCallback((_e: any, node: Node) => {
    if (!draggingNodeId || (node.data as any)?.isRoot) return;
    const nW = (node as any).measured?.width ?? 150;
    const nH = (node as any).measured?.height ?? 40;
    const nCX = node.position.x + nW / 2;
    const nCY = node.position.y + nH / 2;
    const candidates = visibleNodes.filter(n => n.id !== node.id && !draggingDescendantIds.has(n.id));
    let closest: Node | null = null;
    let minDist = Infinity;
    for (const c of candidates) {
      const cW = (c as any).measured?.width ?? 150;
      const cH = (c as any).measured?.height ?? 40;
      const cCX = c.position.x + cW / 2;
      const cCY = c.position.y + cH / 2;
      const dist = Math.sqrt((cCX - nCX) ** 2 + (cCY - nCY) ** 2);
      if (dist < minDist) { minDist = dist; closest = c; }
    }
    setDropTargetId(minDist < PROXIMITY_THRESHOLD && closest ? closest.id : null);
  }, [draggingNodeId, draggingDescendantIds, visibleNodes]);

  const handleNodeDragStop = useCallback((_e: any, node: Node) => {
    const capturedDropTarget = dropTargetId;
    setDraggingNodeId(null);
    setDropTargetId(null);
    setDraggingDescendantIds(new Set());

    if ((node.data as any)?.isRoot) return;

    if (capturedDropTarget) {
      const currentParentId = allEdges.find(e => e.target === node.id)?.source;
      if (capturedDropTarget !== currentParentId) {
        useMindMapStore.getState().reparentNode(node.id, capturedDropTarget);
        toast.info("Nó movido para nova ramificação");
      }
    }
    // Free drag (no drop target): position already updated by onNodesChange — nothing extra needed
  }, [allEdges, dropTargetId]);

  // ─── Canvas container ref (for NodeFloatingToolbar coordinate correction) ──
  const canvasRef = useRef<HTMLDivElement>(null);

  // ─── Save & Sync ──────────────────────────────────────────────────────────
  const lastPersistedRef = useRef("");

  const { triggerSave } = useAutosave(
    { themeId: theme.id },
    {
      debounceMs: 1000,
      onSave: async (meta) => {
        if (userRole === "viewer") return;
        const { allNodes: currentNodes, allEdges: currentEdges } = useMindMapStore.getState();
        await onSave(currentNodes, currentEdges, meta.themeId, undefined, { silent: true });
        lastPersistedRef.current = JSON.stringify({ nodes: currentNodes, edges: currentEdges });
        setLastSavedAt(new Date());
      },
      onStatusChange: setAutosaveStatus
    }
  );

  useEffect(() => {
    if (userRole === "viewer") return;
    const unsub = useMindMapStore.subscribe(
      state => ({ nodes: state.allNodes, edges: state.allEdges }),
      () => triggerSave()
    );
    return unsub;
  }, [triggerSave, userRole]);

  useEffect(() => {
    if (remoteNodes && remoteNodes.length > 0) {
      const incomingStateStr = JSON.stringify({ nodes: remoteNodes, edges: remoteEdges });
      if (incomingStateStr === lastPersistedRef.current) return;

      const currentLocalId = useMindMapStore.getState().visibleNodes.find(n => n.selected)?.id;
      let mergedNodes = [...remoteNodes];
      if (currentLocalId) {
        const localEdited = useMindMapStore.getState().allNodes.find(n => n.id === currentLocalId);
        if (localEdited) mergedNodes = mergedNodes.map(rn => rn.id === currentLocalId ? localEdited : rn);
      }

      setNodesAndEdges(mergedNodes as any[], remoteEdges || []);
      lastPersistedRef.current = incomingStateStr;

      if (remoteThemeId) {
        const t = editorThemes.find(x => x.id === remoteThemeId);
        if (t) {
          setTheme(t);
          applyTheme(t.edgeColor, isColorDark(t.bg));
        }
      }
    }
  }, [remoteNodes, remoteEdges, remoteThemeId, setNodesAndEdges, applyTheme]);

  // ─── Theme change ─────────────────────────────────────────────────────────
  const handleThemeChange = useCallback((newTheme: EditorTheme) => {
    setTheme(newTheme);
    applyTheme(newTheme.edgeColor, isColorDark(newTheme.bg));
    triggerSave();
  }, [applyTheme, triggerSave]);

  // ─── Export PNG ───────────────────────────────────────────────────────────
  const handleExportPng = useCallback(async () => {
    const el = document.querySelector(".react-flow__viewport") as HTMLElement;
    if (!el) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: theme.bg,
        pixelRatio: 2,
        filter: (node) => !node.classList?.contains("react-flow__minimap"),
      });
      const link = document.createElement("a");
      link.download = "mapa-mental.png";
      link.href = dataUrl;
      link.click();
      toast.success("PNG exportado!");
    } catch {
      toast.error("Erro ao exportar PNG");
    } finally {
      setExporting(false);
    }
  }, [theme.bg]);

  // ─── Export SVG ───────────────────────────────────────────────────────────
  const handleExportSvg = useCallback(async () => {
    const el = document.querySelector(".react-flow__viewport") as HTMLElement;
    if (!el) return;
    setExporting(true);
    try {
      const dataUrl = await toSvg(el, {
        backgroundColor: theme.bg,
        filter: (node) => !node.classList?.contains("react-flow__minimap"),
      });
      const link = document.createElement("a");
      link.download = "mapa-mental.svg";
      link.href = dataUrl;
      link.click();
      toast.success("SVG exportado!");
    } catch {
      toast.error("Erro ao exportar SVG");
    } finally {
      setExporting(false);
    }
  }, [theme.bg]);

  // ─── Export PDF ───────────────────────────────────────────────────────────
  const handleExportPdf = useCallback(async () => {
    if (!limits.exportPdf) { setUpgradeOpen(true); return; }
    const el = document.querySelector(".react-flow__viewport") as HTMLElement;
    if (!el) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(el, { backgroundColor: theme.bg, pixelRatio: 2 });
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res) => { img.onload = res; });
      const pdf = new jsPDF({ orientation: img.width > img.height ? "landscape" : "portrait", unit: "px", format: [img.width, img.height] });
      pdf.addImage(dataUrl, "PNG", 0, 0, img.width, img.height);
      pdf.save("mapa-mental.pdf");
      toast.success("PDF exportado!");
    } catch {
      toast.error("Erro ao exportar PDF");
    } finally {
      setExporting(false);
    }
  }, [theme.bg, limits.exportPdf]);

  // ─── Export Markdown ──────────────────────────────────────────────────────
  const handleExportMarkdown = useCallback(() => {
    const { allNodes: nodes, allEdges: edges } = useMindMapStore.getState();
    const md = exportToMarkdown(nodes, edges);
    if (!md) { toast.error("Nada para exportar"); return; }
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = "mapa-mental.md";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Markdown exportado!");
  }, []);

  // ─── Export Text ──────────────────────────────────────────────────────────
  const handleExportText = useCallback(() => {
    const { allNodes: nodes, allEdges: edges } = useMindMapStore.getState();
    const txt = exportToText(nodes, edges);
    if (!txt) { toast.error("Nada para exportar"); return; }
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = "mapa-mental.txt";
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Texto hierárquico exportado!");
  }, []);

  // ─── Edge actions ─────────────────────────────────────────────────────────
  const onConnect = useCallback((params: Connection) => {
    // sk-* handles → create a sketch (draft arrow) edge
    if (params.sourceHandle?.startsWith("sk-") || params.targetHandle?.startsWith("sk-")) {
      addSketchEdge(
        params.source!,
        params.target!,
        params.sourceHandle ?? undefined,
        params.targetHandle ?? undefined,
      );
      triggerSave();
      return;
    }
    const { allNodes, allEdges, diagramType, layoutDirection } = useMindMapStore.getState();
    if (diagramType === "orgchart" || diagramType === "flowchart") {
      // Structural flow connection — allow multiple targets (for convergent flows like → Fim)
      const defaultSrc = layoutDirection === "RIGHT" ? "s-right" : "s-bottom";
      const defaultTgt = layoutDirection === "RIGHT" ? "t-left" : "t-top";
      const newEdge = {
        ...params,
        id: `e-${params.source}-${params.target}-${Date.now()}`,
        type: "flow",
        sourceHandle: params.sourceHandle ?? defaultSrc,
        targetHandle: params.targetHandle ?? defaultTgt,
        data: {},
      };
      setNodesAndEdges(allNodes, [...allEdges, newEdge as any]);
    } else {
      const nextEdges = addEdge({ ...params, type: "sketch", data: { isCustom: true } }, allEdges);
      setNodesAndEdges(allNodes, nextEdges);
    }
    triggerSave();
  }, [setNodesAndEdges, addSketchEdge, triggerSave]);

  const handleEdgeDelete = useCallback((edgeId: string) => {
    const { allNodes, allEdges } = useMindMapStore.getState();
    setNodesAndEdges(allNodes, allEdges.filter(e => e.id !== edgeId));
    setSelectedEdgeId(null);
  }, [setNodesAndEdges]);

  const handleNodeClick = useCallback((_e: React.MouseEvent, node: Node) => {
    if (pendingSketchSource && node.id !== pendingSketchSource) {
      addSketchEdge(pendingSketchSource, node.id);
      setPendingSketchSource(null);
      triggerSave();
    }
  }, [pendingSketchSource, addSketchEdge, setPendingSketchSource, triggerSave]);

  const handleEdgeDataChange = useCallback((edgeId: string, data: Record<string, unknown>) => {
    if (data._swapDirection) {
      swapSketchEdgeDirection(edgeId);
      return;
    }
    updateEdgeData(edgeId, data);
  }, [updateEdgeData, setNodesAndEdges]);

  // ─── Auto-edit on new node + scroll to keep it in view ────────────────────
  useEffect(() => {
    if (!pendingEditNodeId) return;
    const timer = setTimeout(() => {
      onNodesChange([{ type: "select", id: pendingEditNodeId, selected: true }]);
      const others = useMindMapStore.getState().visibleNodes
        .filter((n) => n.id !== pendingEditNodeId)
        .map((n) => ({ type: "select" as const, id: n.id, selected: false }));
      if (others.length) onNodesChange(others);
      window.dispatchEvent(new CustomEvent("mindmap-edit-node", { detail: { nodeId: pendingEditNodeId } }));
      clearPendingEdit();

      // Scroll suave para o novo nó se estiver fora da viewport
      const node = getNode(pendingEditNodeId)
        ?? useMindMapStore.getState().visibleNodes.find(n => n.id === pendingEditNodeId);
      if (node) {
        const w = (node as any).measured?.width ?? 150;
        const h = (node as any).measured?.height ?? 40;
        setCenter(
          node.position.x + w / 2,
          node.position.y + h / 2,
          { zoom: getZoom(), duration: 300 }
        );
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [pendingEditNodeId, clearPendingEdit, onNodesChange, setCenter, getZoom, getNode]);

  // ─── Keyboard Hotkeys ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) return;

      const state = useMindMapStore.getState();
      const selectedNodes = state.visibleNodes.filter((n) => n.selected);
      const selectedNode = selectedNodes[0];

      // ── Ctrl+Z: Undo ──────────────────────────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      // ── Ctrl+Shift+Z / Ctrl+Y: Redo ───────────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      // ── Ctrl+C: Copiar seleção ────────────────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.key === "c" && selectedNodes.length > 0) {
        const ids = selectedNodes.filter(n => !(n.data as any)?.isRoot).map(n => n.id);
        if (ids.length > 0) {
          copySelection(ids);
          toast.success(`${ids.length} nó${ids.length > 1 ? "s" : ""} copiado${ids.length > 1 ? "s" : ""}`, { duration: 1500 });
        }
        return;
      }

      // ── Ctrl+V: Colar ─────────────────────────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        pasteSelection();
        return;
      }

      // ── Ctrl+D: Duplicar nó selecionado ──────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.key === "d" && selectedNode) {
        e.preventDefault();
        if (!(selectedNode.data as any)?.isRoot) {
          copySelection([selectedNode.id]);
          pasteSelection();
        }
        return;
      }

      // ── Tab: adicionar filho ──────────────────────────────────────────────
      if (e.key === "Tab" && !e.shiftKey && selectedNode) {
        e.preventDefault();
        addChild(selectedNode.id);
        return;
      }

      // ── Enter: adicionar irmão ────────────────────────────────────────────
      if (e.key === "Enter" && !e.ctrlKey && !e.metaKey && selectedNode) {
        e.preventDefault();
        addSibling(selectedNode.id);
        return;
      }

      // ── Delete/Backspace: excluir selecionados ────────────────────────────
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNodes.length > 0) {
        const toDelete = selectedNodes.filter(n => !(n.data as any)?.isRoot);
        if (toDelete.length > 0) {
          const parentEdge = state.allEdges.find(ed => ed.target === toDelete[0].id && ed.type === "mindmap");
          if (toDelete.length === 1) {
            deleteNode(toDelete[0].id);
          } else {
            deleteNodes(toDelete.map(n => n.id));
          }
          if (parentEdge) onNodesChange([{ type: "select", id: parentEdge.source, selected: true }]);
        }
        return;
      }

      // ── F2: entrar em edição ──────────────────────────────────────────────
      if (e.key === "F2" && selectedNode) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("mindmap-edit-node", { detail: { nodeId: selectedNode.id } }));
        return;
      }

      // ── Tecla imprimível: substituir texto e editar ───────────────────────
      if (selectedNode && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        window.dispatchEvent(new CustomEvent("mindmap-edit-node", { detail: { nodeId: selectedNode.id, replaceText: true, char: e.key } }));
        return;
      }

      // ── Arrow Keys: navegar ───────────────────────────────────────────────
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key) && selectedNode) {
        e.preventDefault();
        const { visibleNodes, visibleEdges } = state;
        const selectedId = selectedNode.id;
        const side = (selectedNode.data as any)?.side as "left" | "right" | undefined;
        const depth = (selectedNode.data as any)?.depth ?? 0;
        let targetId: string | null = null;

        if (e.key === "ArrowRight") {
          if (side === "left" && depth > 0) {
            targetId = visibleEdges.find((ed) => ed.target === selectedId)?.source ?? null;
          } else {
            const children = visibleEdges.filter(ed => ed.source === selectedId)
              .map(ed => visibleNodes.find(n => n.id === ed.target)).filter(Boolean)
              .filter(n => side !== "left" ? true : (n!.data as any)?.side === "left");
            targetId = children[0]?.id ?? null;
          }
        }
        if (e.key === "ArrowLeft") {
          if (side === "right" && depth > 0) {
            targetId = visibleEdges.find((ed) => ed.target === selectedId)?.source ?? null;
          } else {
            const children = visibleEdges.filter(ed => ed.source === selectedId)
              .map(ed => visibleNodes.find(n => n.id === ed.target)).filter(Boolean)
              .filter(n => side !== "right" ? true : (n!.data as any)?.side === "right");
            targetId = children[0]?.id ?? null;
          }
        }
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          const parentEdge = visibleEdges.find((ed) => ed.target === selectedId);
          if (parentEdge) {
            const siblings = visibleEdges
              .filter(ed => ed.source === parentEdge.source)
              .map(ed => visibleNodes.find(n => n.id === ed.target)).filter(Boolean)
              .sort((a, b) => (a!.position?.y ?? 0) - (b!.position?.y ?? 0));
            const idx = siblings.findIndex(n => n!.id === selectedId);
            if (e.key === "ArrowUp" && idx > 0) targetId = siblings[idx - 1]!.id;
            else if (e.key === "ArrowDown" && idx < siblings.length - 1) targetId = siblings[idx + 1]!.id;
          }
        }
        if (targetId) {
          onNodesChange([
            { type: "select", id: selectedId, selected: false },
            { type: "select", id: targetId, selected: true },
          ]);
        }
        return;
      }

      // ── Ctrl+S: salvar ────────────────────────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        triggerSave();
        return;
      }

      // ── Escape: cancelar modo rascunho / desselecionar ───────────────────
      if (e.key === "Escape") {
        const { pendingSketchSource } = useMindMapStore.getState();
        if (pendingSketchSource) {
          useMindMapStore.getState().setPendingSketchSource(null);
          return;
        }
        if (selectedNode) {
          onNodesChange([{ type: "select", id: selectedNode.id, selected: false }]);
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [addChild, addSibling, deleteNode, deleteNodes, undo, redo, copySelection, pasteSelection, triggerSave, onNodesChange]);

  const selectedNodes = visibleNodes.filter(n => n.selected);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: theme.bg, transition: "background-color 0.3s" }}>
      {/* Header centralizado com toolbar */}
      <div className="flex-none flex items-center justify-center px-3 py-1.5 border-b border-border/30 bg-card/80 backdrop-blur-sm z-10">
        <EditorToolbar
          onAddNode={() => selectedNodes.length > 0 && addChild(selectedNodes[0].id)}
          onAddSpecialNode={() => {}}
          onDelete={() => {
            const toDelete = selectedNodes.filter(n => !(n.data as any)?.isRoot);
            if (toDelete.length === 1) deleteNode(toDelete[0].id);
            else if (toDelete.length > 1) deleteNodes(toDelete.map(n => n.id));
          }}
          onSave={() => userRole !== "viewer" && triggerSave({ force: true } as any)}
          onZoomIn={() => zoomIn()}
          onZoomOut={() => zoomOut()}
          onFitView={() => fitView({ padding: 0.2, duration: 300 })}
          onUndo={undo}
          onRedo={redo}
          onExportPng={handleExportPng}
          onExportPdf={handleExportPdf}
          onExportSvg={handleExportSvg}
          onExportMarkdown={handleExportMarkdown}
          onExportText={handleExportText}
          canExportPdf={limits.exportPdf}
          onThemeChange={handleThemeChange}
          onReLayout={() => {}}
          currentThemeId={theme.id}
          canUndo={past.length > 0}
          canRedo={future.length > 0}
          saving={saving}
          exporting={exporting}
          hasSelection={selectedNodes.length > 0 && userRole !== "viewer"}
          diagramType={diagramType}
          userRole={userRole}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          // onImportSketch={() => setImportDialogOpen(true)}
        />
      </div>

      {/* Canvas — ocupa o restante */}
      <div ref={canvasRef} className="relative flex-1 overflow-hidden">
        {(() => {
          const ui = themeUI(theme);
          return (
            <>
              {!isMobile && (saving || autosaveStatus === "saving") && (
                <div
                  className="absolute top-4 right-4 z-10 flex items-center gap-1.5 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-md text-xs"
                  style={{ backgroundColor: ui.cardBg, borderColor: ui.cardBorder, color: ui.cardText, border: `1px solid ${ui.cardBorder}` }}
                >
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: ui.accentColor }} />
                  Salvando...
                </div>
              )}
              {pendingSketchSource && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-green-500 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none select-none">
                  <span className="w-2 h-2 rounded-full bg-white/60 animate-pulse" />
                  Clique em outro nó para conectar a seta rascunho · Esc para cancelar
                </div>
              )}
            </>
          );
        })()}

        {/* Floating toolbar de nó selecionado — apenas para flowchart/orgchart (mindmap tem botões próprios no nó) */}
        {viewMode === "graph" && userRole !== "viewer" && selectedNodes.length === 1 && diagramType !== "mindmap" && (
          <NodeFloatingToolbar
            containerRef={canvasRef}
            selectedNodes={selectedNodes.filter(n => !(n.data as any)?.isRoot || diagramType !== "mindmap")}
            diagramType={diagramType}
            onShapeChange={(shape) => selectedNodes.forEach(n => updateNodeShape(n.id, shape as any))}
            onDuplicate={() => {
              const ids = selectedNodes.filter(n => !(n.data as any)?.isRoot).map(n => n.id);
              if (ids.length > 0) { copySelection(ids); pasteSelection(); }
            }}
            onDelete={() => {
              const toDelete = selectedNodes.filter(n => !(n.data as any)?.isRoot);
              if (toDelete.length === 1) deleteNode(toDelete[0].id);
              else if (toDelete.length > 1) deleteNodes(toDelete.map(n => n.id));
            }}
            onAddChild={() => selectedNodes.length > 0 && addChild(selectedNodes[0].id)}
            onAddSibling={() => selectedNodes.length > 0 && addSibling(selectedNodes[0].id)}
            onToggleConnectors={() => selectedNodes.length > 0 && setPendingSketchSource(selectedNodes[0].id)}
          />
        )}

        <EdgeFloatingToolbar
          selectedEdge={visibleEdges.find(e => e.id === selectedEdgeId) || null}
          onDelete={handleEdgeDelete}
          onColorChange={(edgeId, color) => {
            const { allNodes, allEdges } = useMindMapStore.getState();
            setNodesAndEdges(allNodes, allEdges.map(e =>
              e.id === edgeId ? { ...e, style: { ...e.style, stroke: color } } : e
            ));
          }}
          onEdgeDataChange={handleEdgeDataChange}
        />

      {/* ── Painel flutuante direito estilo MindMeister (apenas mindmap) ── */}
      {diagramType === "mindmap" && viewMode === "graph" && !isMobile && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 pointer-events-auto">
          {/* Card superior: adicionar tópico */}
          <div
            className="flex flex-col items-center gap-0.5 rounded-xl shadow-md border p-1"
            style={{ background: themeUI(theme).cardBg, borderColor: themeUI(theme).cardBorder }}
          >
            <button
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                selectedNodes.length > 0
                  ? "hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 cursor-pointer"
                  : "text-zinc-300 dark:text-zinc-600 cursor-default"
              )}
              onClick={() => selectedNodes.length > 0 && addChild(selectedNodes[0].id)}
              title="Adicionar tópico filho"
            >
              <PlusCircle className="w-5 h-5" />
            </button>
          </div>

          {/* Card inferior: undo / redo */}
          <div
            className="flex flex-col items-center gap-0.5 rounded-xl shadow-md border p-1"
            style={{ background: themeUI(theme).cardBg, borderColor: themeUI(theme).cardBorder }}
          >
            <button
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                past.length > 0
                  ? "hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-pointer"
                  : "text-zinc-300 dark:text-zinc-600 cursor-default"
              )}
              onClick={undo}
              disabled={past.length === 0}
              title="Desfazer (Ctrl+Z)"
            >
              <Redo2 className="w-4 h-4 scale-x-[-1]" />
            </button>
            <button
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-colors",
                future.length > 0
                  ? "hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 cursor-pointer"
                  : "text-zinc-300 dark:text-zinc-600 cursor-default"
              )}
              onClick={redo}
              disabled={future.length === 0}
              title="Refazer (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {viewMode === "graph" ? (
        <ReactFlow
          nodes={visibleNodes.map(n => {
            const isDiamond = (n.data as any)?.shape === "diamond";
            const baseStyle = isDiamond
              ? { ...n.style, background: "transparent", border: "none", boxShadow: "none" }
              : n.style;
            if (!draggingNodeId) return { ...n, style: baseStyle };
            const isDragged = n.id === draggingNodeId || draggingDescendantIds.has(n.id);
            return {
              ...n,
              style: {
                ...baseStyle,
                opacity: isDragged ? 0.45 : 1,
                ...(n.id === dropTargetId ? { outline: "2px dashed #E9853A", outlineOffset: "4px", borderRadius: 8 } : {})
              }
            };
          })}
          edges={visibleEdges.map(e => {
            if (draggingNodeId && dropTargetId && e.id === `e-${dropTargetId}-${draggingNodeId}`) {
              return { ...e, style: { stroke: "#E9853A", strokeDasharray: "5 5" } };
            }
            return e;
          })}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onPaneClick={() => { setSelectedEdgeId(null); setPendingSketchSource(null); }}
          onEdgeClick={(_e, edge) => { if (edge.data?.isCustom || edge.type === "sketch") setSelectedEdgeId(edge.id); }}
          onNodeClick={userRole !== "viewer" ? handleNodeClick : undefined}
          onConnect={userRole === "viewer" ? undefined : onConnect}
          onNodeDragStart={userRole === "viewer" ? undefined : handleNodeDragStart}
          onNodeDrag={userRole === "viewer" ? undefined : handleNodeDrag}
          onNodeDragStop={userRole === "viewer" ? undefined : handleNodeDragStop}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          minZoom={0.1}
          multiSelectionKeyCode="Shift"
          selectionKeyCode="Shift"
          defaultEdgeOptions={{
            type: "mindmap",
            style: { stroke: theme.edgeColor, strokeWidth: theme.edgeStrokeWidth, opacity: theme.edgeOpacity ?? 1, _animation: theme.edgeAnimation, _dashArray: theme.edgeDashArray } as any
          }}
          proOptions={{ hideAttribution: true }}
          style={{ backgroundColor: theme.bg, cursor: pendingSketchSource ? "crosshair" : undefined }}
          deleteKeyCode={null}
          nodesDraggable={userRole !== "viewer"}
          nodesConnectable={userRole !== "viewer"}
          elementsSelectable={true}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color={theme.dotColor} />
          <Controls showInteractive={false} className="!rounded-xl !shadow-md [&>button]:!border-0" />
          <MiniMap position="bottom-right" className="!rounded-xl !shadow-md" maskColor={theme.minimapMask} nodeColor={themeUI(theme).minimapNode} />
          <MultiSelectBar />
        </ReactFlow>
      ) : (
        <OutlineView
          nodes={allNodes as any}
          edges={allEdges}
          onNodeChange={(id, label) => updateNodeLabel(id, label)}
          readOnly={userRole === "viewer"}
        />
      )}

      </div>{/* fim canvas */}

      {/* ImportOutlineDialog disabled
      <ImportOutlineDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={(text) => {
          const parsed = parseOutlineToNodes(text, diagramType);
          setNodesAndEdges(parsed.nodes as any[], parsed.edges);
        }}
      />
      */}
      <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} resource="feature" planName="Free" />
    </div>
  );
}

export default function DiagramEditorCore(props: DiagramEditorCoreProps) {
  return (
    <ReactFlowProvider>
      <UserRoleProvider value={props.userRole || "viewer"}>
        <div className="relative w-full h-full overflow-hidden flex flex-col bg-background">
          <DiagramEditorInner {...props} />
        </div>
      </UserRoleProvider>
    </ReactFlowProvider>
  );
}
