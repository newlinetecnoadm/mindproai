import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Node, Edge } from "@xyflow/react";

interface NodeContextMenuProps {
  x: number;
  y: number;
  node: Node;
  diagramType: string;
  onClose: () => void;
  onExpandComplete: (
    parentId: string,
    newNodes: { id: string; label: string }[],
    newEdges: { source: string; target: string }[]
  ) => void;
  userRole?: "owner" | "editor" | "viewer";
}

export default function NodeContextMenu({
  x,
  y,
  node,
  diagramType,
  onClose,
  onExpandComplete,
  userRole = "viewer",
}: NodeContextMenuProps) {
  const [loading, setLoading] = useState(false);

  const handleExpand = async () => {
    setLoading(true);
    try {
      const label = (node.data as any)?.label || "Tópico";
      const { data, error } = await supabase.functions.invoke("ai-map-assist", {
        body: {
          mode: "expand",
          topic: label,
          diagramType,
          parentId: node.id,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const nodes = data.nodes || [];
      const edges = data.edges || [];

      if (nodes.length === 0) {
        toast.info("A IA não gerou sub-nós para este tópico.");
        onClose();
        return;
      }

      onExpandComplete(node.id, nodes, edges);
      toast.success(`${nodes.length} sub-nós gerados!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao expandir com IA");
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 min-w-[180px] rounded-lg border bg-popover p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
        style={{ left: x, top: y }}
      >
        <button
          onClick={handleExpand}
          disabled={loading || userRole === "viewer"}
          className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {loading ? "Gerando..." : "Expandir com IA"}
        </button>
      </div>
    </>
  );
}
