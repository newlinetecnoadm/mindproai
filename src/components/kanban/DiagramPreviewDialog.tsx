import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, FileText } from "lucide-react";

interface DiagramPreviewDialogProps {
  diagramId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DiagramPreviewDialog = ({ diagramId, open, onOpenChange }: DiagramPreviewDialogProps) => {
  const navigate = useNavigate();

  const { data: diagram } = useQuery({
    queryKey: ["diagram-preview", diagramId],
    enabled: !!diagramId && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diagrams")
        .select("id, title, type, thumbnail, updated_at")
        .eq("id", diagramId!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const typeLabels: Record<string, string> = {
    mindmap: "Mapa Mental",
    flowchart: "Fluxograma",
    orgchart: "Organograma",
    timeline: "Timeline",
    concept_map: "Mapa Conceitual",
    swimlane: "Swimlane",
    wireframe: "Wireframe",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            {diagram?.title || "Diagrama"}
          </DialogTitle>
        </DialogHeader>

        {diagram && (
          <div className="space-y-4">
            <div className="text-xs text-muted-foreground">
              {typeLabels[diagram.type] || diagram.type}
              {diagram.updated_at && (
                <> · Atualizado em {new Date(diagram.updated_at).toLocaleDateString("pt-BR")}</>
              )}
            </div>

            {/* Thumbnail preview */}
            <div className="rounded-lg border border-border bg-muted/30 overflow-hidden flex items-center justify-center min-h-[200px]">
              {diagram.thumbnail ? (
                <img
                  src={diagram.thumbnail}
                  alt={diagram.title}
                  className="w-full h-auto max-h-[300px] object-contain"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                  <FileText className="w-10 h-10" />
                  <span className="text-sm">Sem pré-visualização</span>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                variant="hero"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/diagram/${diagram.id}`);
                }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Editar diagrama
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DiagramPreviewDialog;
