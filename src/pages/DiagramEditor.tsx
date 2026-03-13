import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import DiagramEditorCore from "@/components/editor/DiagramEditorCore";
import type { Node, Edge } from "@xyflow/react";
import type { Json } from "@/integrations/supabase/types";
import { diagramTypes } from "@/data/templates";

const DiagramEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("Sem título");
  const [diagramType, setDiagramType] = useState("mindmap");
  const [initialNodes, setInitialNodes] = useState<Node[] | undefined>();
  const [initialEdges, setInitialEdges] = useState<Edge[] | undefined>();
  const [initialThemeId, setInitialThemeId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
      setDiagramType(data.type);
      setInitialThemeId(data.theme || undefined);
      const diagramData = data.data as { nodes?: Node[]; edges?: Edge[] };
      if (diagramData?.nodes?.length) {
        setInitialNodes(diagramData.nodes);
        setInitialEdges(diagramData.edges || []);
      }
      setLoading(false);
    };

    loadDiagram();
  }, [id, navigate]);

  const handleSave = useCallback(
    async (nodes: Node[], edges: Edge[], themeId: string) => {
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
          ...(e.label ? { label: e.label } : {}),
        })) as unknown as Json,
        viewport: {},
      };

      try {
        const { error } = await supabase
          .from("diagrams")
          .update({ title, data: diagramData, theme: themeId, updated_at: new Date().toISOString() })
          .eq("id", id!);

        if (error) throw error;
        toast.success("Salvo!");
      } catch (err: any) {
        toast.error("Erro ao salvar: " + (err.message || "desconhecido"));
      } finally {
        setSaving(false);
      }
    },
    [user, title, id]
  );

  const typeInfo = diagramTypes.find((t) => t.slug === diagramType);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
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
        {typeInfo && (
          <Badge variant="secondary" className="text-xs gap-1">
            {typeInfo.icon} {typeInfo.name}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {saving ? "Salvando..." : "Ctrl+S para salvar"}
        </span>
      </div>

      <div className="flex-1">
        <DiagramEditorCore
          diagramType={diagramType}
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
