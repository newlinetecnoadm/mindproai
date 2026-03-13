import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { usePlan } from "./usePlan";

export interface PlanLimits {
  maxDiagrams: number;
  maxBoards: number;
  maxCollaborators: number;
  exportPdf: boolean;
  aiSuggestions: boolean;
  currentDiagrams: number;
  currentBoards: number;
  canCreateDiagram: boolean;
  canCreateBoard: boolean;
  planName: string;
  displayName: string;
}

export function usePlanLimits() {
  const { user } = useAuth();
  const { data: planInfo } = usePlan();

  const { data: diagramCount = 0 } = useQuery({
    queryKey: ["diagram-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("diagrams")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: boardCount = 0 } = useQuery({
    queryKey: ["board-count", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("boards")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_closed", false);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const features = planInfo?.features ?? {};
  const maxDiagrams = (features.max_diagrams as number) ?? 3;
  const maxBoards = (features.max_boards as number) ?? 2;
  const maxCollaborators = (features.max_collaborators as number) ?? 0;
  const exportPdf = (features.export_pdf as boolean) ?? false;
  const aiSuggestions = (features.ai_suggestions as boolean) ?? false;

  const canCreateDiagram = maxDiagrams === -1 || diagramCount < maxDiagrams;
  const canCreateBoard = maxBoards === -1 || boardCount < maxBoards;

  const limits: PlanLimits = {
    maxDiagrams,
    maxBoards,
    maxCollaborators,
    exportPdf,
    aiSuggestions,
    currentDiagrams: diagramCount,
    currentBoards: boardCount,
    canCreateDiagram,
    canCreateBoard,
    planName: planInfo?.planName ?? "free",
    displayName: planInfo?.displayName ?? "Gratuito",
  };

  return limits;
}
