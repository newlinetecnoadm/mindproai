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
import MobileNodeDrawer from "./MobileNodeDrawer";
import { useIsMobile } from "@/hooks/use-mobile";

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

  // Detect indentation: spaces or tabs
  const getDepth = (line: string) => {
    const match = line.match(/^(\s*)/);
    const indent = match?.[1] ?? "";
    if (indent.includes("\t")) return indent.split("\t").length - 1;
    // Markdown headers: # = 0, ## = 1, etc.
    const hMatch = line.trimStart().match(/^(#{1,6})\s/);
    if (hMatch) return hMatch[1].length - 1;
    return Math.floor(indent.length / 2);
  };

  const getLabel = (line: string) => line.trimStart().replace(/^#{1,6}\s/, "").trim();

  const isFlowDiagram = diagramType === "orgchart" || diagramType === "flowchart";
  const depthStack: string[] = []; // stack of node IDs by depth level

  lines.forEach((line, i) => {
    const depth = getDepth(line);
    const label = getLabel(line);
    if (!label) return;

    const id = `imported_${i}_${Date.now()}`;
    const isRoot = depth === 0 && nodes.length === 0;
    const branchColor = BRANCH_PALETTE[depth === 0 ? 0 : (Math.floor((depthStack[1] ? depthStack.indexOf(depthStack[1]) : i) % BRANCH_PALETTE.length))];
    const side = !isFlowDiagram && depth > 0 ? (i % 2 === 0 ? "right" : "left") : undefined;

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
        ...(isFlowDiagram ? { shape: depth === 0 ? "oval" : "rectangle" } : {}),
      },
      style: { background: "transparent", border: "none", padding: 0, boxShadow: "none" },
    });

    // Trim stack to current depth and push
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
    const candidates = visibleNodes.filter(n => n.id !== node.id && !draggingDescendantIds.has(n.id));
    let closest: Node | null = null;
    let minDist = Infinity;
    for (const c of candidates) {
      const dx = c.position.x - node.position.x;
      const dy = c.position.y - node.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) { minDist = dist; closest = c; }
    }
    setDropTargetId(minDist < PROXIMITY_THRESHOLD && closest ? closest.id : null);
  }, [draggingNodeId, draggingDescendantIds, visibleNodes]);

  const handleNodeDragStop = useCallback((_e: any, node: Node) => {
    setDraggingNodeId(null);
    setDropTargetId(null);
    setDraggingDescendantIds(new Set());

    if ((node.data as any)?.isRoot) return;
    const { diagramType } = useMindMapStore.getState();
    const isFlow = diagramType === "orgchart" || diagramType === "flowchart";
    const edgeType = isFlow ? "flow" : "mindmap";
    const currentEdge = allEdges.find(e => e.target === node.id && e.type === edgeType);

    const newParentId = dropTargetId;
    if (!newParentId) {
      setNodesAndEdges([...allNodes], [...allEdges]);
      return;
    }

    if (newParentId !== currentEdge?.source) {
      const nextEdges = allEdges.filter(e => e.id !== currentEdge?.id);
      const newEdge: any = {
        id: `e-${newParentId}-${node.id}`,
        source: newParentId,
        target: node.id,
        type: edgeType,
        ...(isFlow ? { sourceHandle: "s-bottom", targetHandle: "t-top" } : {}),
      };
      nextEdges.push(newEdge);
      setNodesAndEdges([...allNodes], nextEdges);
      toast.info("Nó conectado a nova ramificação");
    }
  }, [allEdges, allNodes, dropTargetId, setNodesAndEdges]);

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
      const { allNodes, allEdges } = useMindMapStore.getState();
      setNodesAndEdges(
        allNodes,
        allEdges.map(e => e.id === edgeId ? { ...e, source: e.target, target: e.source } : e)
      );
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
          onImportSketch={() => setImportDialogOpen(true)}
        />
      </div>

      {/* Canvas — ocupa o restante */}
      <div className="relative flex-1 overflow-hidden">
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

        {/* Floating toolbar de nó selecionado */}
        {viewMode === "graph" && userRole !== "viewer" && (
          <NodeFloatingToolbar
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

      <ImportOutlineDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={(text) => {
          const parsed = parseOutlineToNodes(text, diagramType);
          setNodesAndEdges(parsed.nodes as any[], parsed.edges);
        }}
      />
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
