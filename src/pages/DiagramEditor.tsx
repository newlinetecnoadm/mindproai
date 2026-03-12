import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MindMapEditor from "@/components/mindmap/MindMapEditor";
import type { Node, Edge } from "@xyflow/react";
import type { Json } from "@/integrations/supabase/types";

const DiagramEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("Sem título");
  const [initialNodes, setInitialNodes] = useState<Node[] | undefined>();
  const [initialEdges, setInitialEdges] = useState<Edge[] | undefined>();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const isNew = id === "novo";

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }

    const loadDiagram = async () => {
      const { data, error } = await supabase
        .from("diagrams")
        .select("*")
        .eq("id", id!)
        .single();

      if (error || !data) {
        toast.error("Diagrama não encontrado");
        navigate("/diagramas");
        return;
      }

      setTitle(data.title);
      const diagramData = data.data as { nodes?: Node[]; edges?: Edge[] };
      if (diagramData?.nodes?.length) {
        setInitialNodes(diagramData.nodes);
        setInitialEdges(diagramData.edges || []);
      }
      setLoading(false);
    };

    loadDiagram();
  }, [id, isNew, navigate]);

  const handleSave = useCallback(
    async (nodes: Node[], edges: Edge[]) => {
      if (!user) return;
      setSaving(true);

      const diagramData: Json = {
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data as Record<string, unknown>,
        })) as unknown as Json,
        edges: edges.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          type: e.type,
        })) as unknown as Json,
        viewport: {},
      };

      try {
        if (isNew) {
          const { data, error } = await supabase
            .from("diagrams")
            .insert({
              title,
              type: "mindmap" as const,
              data: diagramData,
              user_id: user.id,
            })
            .select("id")
            .single();

          if (error) throw error;
          toast.success("Diagrama criado!");
          navigate(`/diagramas/${data.id}`, { replace: true });
        } else {
          const { error } = await supabase
            .from("diagrams")
            .update({ title, data: diagramData, updated_at: new Date().toISOString() })
            .eq("id", id!);

          if (error) throw error;
          toast.success("Salvo!");
        }
      } catch (err: any) {
        toast.error("Erro ao salvar: " + (err.message || "desconhecido"));
      } finally {
        setSaving(false);
      }
    },
    [user, title, id, isNew, navigate]
  );

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/diagramas")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-8 w-64 text-sm font-medium border-none bg-transparent hover:bg-muted focus-visible:bg-muted"
          placeholder="Nome do diagrama"
        />
        <span className="text-xs text-muted-foreground ml-auto">
          {saving ? "Salvando..." : "Ctrl+S para salvar"}
        </span>
      </div>

      {/* Editor */}
      <div className="flex-1">
        <MindMapEditor
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          onSave={handleSave}
          saving={saving}
        />
      </div>
    </div>
  );
};

export default DiagramEditor;
