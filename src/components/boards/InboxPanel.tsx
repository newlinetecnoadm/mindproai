import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Inbox, X, Plus, GripVertical, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface InboxPanelProps {
  onClose: () => void;
  boardId?: string;
}

const InboxPanel = ({ onClose, boardId }: InboxPanelProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [quickAdd, setQuickAdd] = useState("");

  const { data: items = [] } = useQuery({
    queryKey: ["inbox-items", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbox_items")
        .select("*")
        .eq("user_id", user!.id)
        .order("position");
      if (error) throw error;
      return data || [];
    },
  });

  const addItem = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase.from("inbox_items").insert({
        user_id: user!.id,
        title,
        position: items.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setQuickAdd("");
      queryClient.invalidateQueries({ queryKey: ["inbox-items"] });
    },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inbox_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox-items"] }),
  });

  const handleDragStart = (e: React.DragEvent, item: any) => {
    e.dataTransfer.setData("application/inbox-item", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="h-full border-r border-border bg-card flex flex-col shrink-0 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 h-12 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Inbox</span>
          {items.length > 0 && (
            <span className="text-xs text-muted-foreground">({items.length})</span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Quick add */}
      <div className="p-3 border-b border-border">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (quickAdd.trim()) addItem.mutate(quickAdd.trim());
          }}
          className="flex gap-1.5"
        >
          <Input
            placeholder="Nova tarefa..."
            value={quickAdd}
            onChange={(e) => setQuickAdd(e.target.value)}
            className="h-8 text-sm bg-muted/50 border-border flex-1"
          />
          <Button type="submit" variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={!quickAdd.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </form>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {items.length === 0 ? (
          <div className="text-center py-8 px-3">
            <Inbox className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-medium mb-1">Inbox vazio</p>
            <p className="text-xs text-muted-foreground">
              Adicione tarefas e arraste-as para o board.
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {items.map((item: any, i: number) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: i * 0.02 }}
                draggable
                onDragStart={(e) => handleDragStart(e as any, item)}
                className="flex items-center gap-1.5 p-2 rounded-lg hover:bg-muted/50 cursor-grab active:cursor-grabbing transition-colors group border border-transparent hover:border-border"
              >
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                <span className="text-xs font-medium flex-1 truncate">{item.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteItem.mutate(item.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-all"
                >
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-border">
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          🔒 Inbox é visível apenas para você
        </p>
      </div>
    </motion.div>
  );
};

export default InboxPanel;
