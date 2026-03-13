import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRealtimeDiagram, type PresenceUser } from "@/hooks/useRealtimeDiagram";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import ShareDiagramDialog from "@/components/editor/ShareDiagramDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import DiagramEditorCore from "@/components/editor/DiagramEditorCore";
import type { Node, Edge } from "@xyflow/react";
import type { Json } from "@/integrations/supabase/types";
import { diagramTypes } from "@/data/templates";

const DiagramEditor = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState("Sem título");
  const [isPublic, setIsPublic] = useState(false);
  const [publicToken, setPublicToken] = useState<string | null>(null);
  const [diagramType, setDiagramType] = useState("mindmap");
  const [initialNodes, setInitialNodes] = useState<Node[] | undefined>();
  const [initialEdges, setInitialEdges] = useState<Edge[] | undefined>();
  const [initialThemeId, setInitialThemeId] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [savedRecently, setSavedRecently] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [loading, setLoading] = useState(true);

  // Remote sync state
  const [remoteNodes, setRemoteNodes] = useState<Node[] | undefined>();
  const [remoteEdges, setRemoteEdges] = useState<Edge[] | undefined>();
  const [remoteThemeId, setRemoteThemeId] = useState<string | undefined>();

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
      setIsPublic(data.is_public ?? false);
      setPublicToken(data.public_token ?? null);
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

  // Realtime: presence + sync
  const handleRemoteUpdate = useCallback(
    (nodes: Node[], edges: Edge[], theme: string | null) => {
      setRemoteNodes(nodes);
      setRemoteEdges(edges);
      setRemoteThemeId(theme || undefined);
    },
    []
  );

  const { onlineUsers } = useRealtimeDiagram({
    diagramId: id || "",
    userId: user?.id || "",
    userEmail: user?.email || "",
    userName: user?.user_metadata?.full_name,
    userAvatar: user?.user_metadata?.avatar_url,
    onRemoteUpdate: handleRemoteUpdate,
  });

  const handleSave = useCallback(
    async (nodes: Node[], edges: Edge[], themeId: string, thumbnailDataUrl?: string) => {
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
        // Upload thumbnail if available
        let thumbnailUrl: string | undefined;
        if (thumbnailDataUrl && id) {
          try {
            const res = await fetch(thumbnailDataUrl);
            const blob = await res.blob();
            const filePath = `${user.id}/${id}.png`;
            await supabase.storage
              .from("diagram-thumbnails")
              .upload(filePath, blob, { upsert: true, contentType: "image/png" });
            const { data: urlData } = supabase.storage
              .from("diagram-thumbnails")
              .getPublicUrl(filePath);
            thumbnailUrl = `${urlData.publicUrl}?t=${Date.now()}`;
          } catch {
            // thumbnail upload failed silently
          }
        }

        const { error } = await supabase
          .from("diagrams")
          .update({
            title,
            data: diagramData,
            theme: themeId,
            updated_at: new Date().toISOString(),
            ...(thumbnailUrl ? { thumbnail: thumbnailUrl } : {}),
          })
          .eq("id", id!);

        if (error) throw error;
        setSavedRecently(true);
        if (savedTimer.current) clearTimeout(savedTimer.current);
        savedTimer.current = setTimeout(() => setSavedRecently(false), 2000);
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

        {/* Online users presence */}
        <div className="flex items-center gap-1 ml-auto">
          {id && (
            <ShareDiagramDialog
              diagramId={id}
              diagramTitle={title}
              isPublic={isPublic}
              publicToken={publicToken}
            />
          )}
          {onlineUsers.length > 0 && (
            <TooltipProvider>
              <div className="flex -space-x-2 mr-3">
                {onlineUsers.slice(0, 5).map((u) => (
                  <Tooltip key={u.userId}>
                    <TooltipTrigger asChild>
                      <div
                        className="w-7 h-7 rounded-full border-2 border-card flex items-center justify-center text-[10px] font-bold text-white cursor-default"
                        style={{ backgroundColor: u.color }}
                      >
                        {u.avatarUrl ? (
                          <img
                            src={u.avatarUrl}
                            alt={u.fullName || u.email}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          (u.fullName || u.email).charAt(0).toUpperCase()
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p className="text-xs font-medium">{u.fullName || u.email}</p>
                      <p className="text-xs text-muted-foreground">Online agora</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                {onlineUsers.length > 5 && (
                  <div className="w-7 h-7 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                    +{onlineUsers.length - 5}
                  </div>
                )}
              </div>
            </TooltipProvider>
          )}
          <span className="text-xs text-muted-foreground">
            {saving ? "Salvando..." : "Ctrl+S para salvar"}
          </span>
        </div>
      </div>

      <div className="flex-1">
        <DiagramEditorCore
          diagramType={diagramType}
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          initialThemeId={initialThemeId}
          onSave={handleSave}
          saving={saving}
          remoteNodes={remoteNodes}
          remoteEdges={remoteEdges}
          remoteThemeId={remoteThemeId}
        />
      </div>
    </div>
  );
};

export default DiagramEditor;
