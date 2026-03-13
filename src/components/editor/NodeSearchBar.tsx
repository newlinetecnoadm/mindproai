import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Node } from "@xyflow/react";
import { motion, AnimatePresence } from "framer-motion";

interface NodeSearchBarProps {
  open: boolean;
  onClose: () => void;
  nodes: Node[];
  onSelectNode: (nodeId: string) => void;
  themeCardBg?: string;
  themeCardBorder?: string;
  themeCardText?: string;
}

export default function NodeSearchBar({
  open,
  onClose,
  nodes,
  onSelectNode,
  themeCardBg,
  themeCardBorder,
  themeCardText,
}: NodeSearchBarProps) {
  const [query, setQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const matches = query.trim()
    ? nodes.filter((n) => {
        const label = (n.data as any)?.label || "";
        const role = (n.data as any)?.role || "";
        const text = `${label} ${role}`.toLowerCase();
        return text.includes(query.toLowerCase());
      })
    : [];

  useEffect(() => {
    if (open) {
      setQuery("");
      setMatchIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Navigate to current match
  useEffect(() => {
    if (matches.length > 0 && matchIndex < matches.length) {
      onSelectNode(matches[matchIndex].id);
    }
  }, [matchIndex, matches.length, query]);

  const goNext = useCallback(() => {
    if (matches.length === 0) return;
    setMatchIndex((i) => (i + 1) % matches.length);
  }, [matches.length]);

  const goPrev = useCallback(() => {
    if (matches.length === 0) return;
    setMatchIndex((i) => (i - 1 + matches.length) % matches.length);
  }, [matches.length]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); goNext(); }
    if (e.key === "Enter" && e.shiftKey) { e.preventDefault(); goPrev(); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="absolute top-14 right-4 z-20 flex items-center gap-1.5 rounded-xl px-2 py-1.5 shadow-lg border backdrop-blur-sm"
          style={{
            backgroundColor: themeCardBg || "hsl(var(--card))",
            borderColor: themeCardBorder || "hsl(var(--border))",
            color: themeCardText || "hsl(var(--foreground))",
          }}
        >
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setMatchIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Buscar nó..."
            className="h-7 w-44 text-xs border-0 bg-transparent shadow-none focus-visible:ring-0 px-1"
          />
          {query.trim() && (
            <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0">
              {matches.length > 0 ? `${matchIndex + 1}/${matches.length}` : "0/0"}
            </span>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={goPrev} disabled={matches.length === 0}>
            <ChevronUp className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={goNext} disabled={matches.length === 0}>
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
