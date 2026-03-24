import { useState } from "react";
import { Filter, Search, X, Calendar, Tag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

export interface BoardFilterState {
  search: string;
  labelIds: string[];
  dueDateFilter: "all" | "overdue" | "has_date" | "no_date";
  memberIds: string[];
}

export const EMPTY_FILTERS: BoardFilterState = {
  search: "",
  labelIds: [],
  dueDateFilter: "all",
  memberIds: [],
};

interface BoardFiltersProps {
  filters: BoardFilterState;
  onChange: (filters: BoardFilterState) => void;
  labels: { id: string; name: string | null; color: string }[];
  members: { user_id: string; email?: string; full_name?: string | null }[];
  hideSearch?: boolean;
}

const DUE_OPTIONS: { value: BoardFilterState["dueDateFilter"]; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "overdue", label: "Atrasados" },
  { value: "has_date", label: "Com data" },
  { value: "no_date", label: "Sem data" },
];

const BoardFilters = ({ filters, onChange, labels, members, hideSearch }: BoardFiltersProps) => {
  const [open, setOpen] = useState(false);

  const activeCount =
    filters.labelIds.length +
    filters.memberIds.length +
    (filters.dueDateFilter !== "all" ? 1 : 0) +
    (filters.search ? 1 : 0);

  const update = (partial: Partial<BoardFilterState>) =>
    onChange({ ...filters, ...partial });

  const clearAll = () => onChange(EMPTY_FILTERS);

  return (
    <div className="flex items-center gap-2">
      {/* Search */}
      {!hideSearch && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => update({ search: e.target.value })}
            placeholder="Buscar cards..."
            className="h-8 w-48 pl-8 text-xs"
          />
          {filters.search && (
            <button
              onClick={() => update({ search: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Filter popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 relative">
            <Filter className="w-3.5 h-3.5" />
            Filtros
            {activeCount > 0 && (
              <Badge className="h-4 w-4 p-0 flex items-center justify-center text-[10px] ml-1">
                {activeCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-sm font-medium">Filtros</span>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={clearAll}>
                Limpar
              </Button>
            )}
          </div>

          {/* Labels */}
          {labels.length > 0 && (
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-1.5 mb-2">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Labels</span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {labels.map((l) => (
                  <label key={l.id} className="flex items-center gap-2 py-0.5 cursor-pointer text-xs hover:bg-muted/50 rounded px-1">
                    <Checkbox
                      checked={filters.labelIds.includes(l.id)}
                      onCheckedChange={(v) => {
                        const ids = v
                          ? [...filters.labelIds, l.id]
                          : filters.labelIds.filter((x) => x !== l.id);
                        update({ labelIds: ids });
                      }}
                    />
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: l.color }} />
                    <span className="truncate">{l.name || "Sem nome"}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Due date */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">Data de entrega</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {DUE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => update({ dueDateFilter: opt.value })}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs transition-colors",
                    filters.dueDateFilter === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Members */}
          {members.length > 0 && (
            <div className="p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">Membros</span>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {members.map((m) => (
                  <label key={m.user_id} className="flex items-center gap-2 py-0.5 cursor-pointer text-xs hover:bg-muted/50 rounded px-1">
                    <Checkbox
                      checked={filters.memberIds.includes(m.user_id)}
                      onCheckedChange={(v) => {
                        const ids = v
                          ? [...filters.memberIds, m.user_id]
                          : filters.memberIds.filter((x) => x !== m.user_id);
                        update({ memberIds: ids });
                      }}
                    />
                    <span className="truncate">{m.full_name || m.email || m.user_id.slice(0, 8)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Active filter badges */}
      {activeCount > 0 && (
        <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground gap-1" onClick={clearAll}>
          <X className="w-3 h-3" /> Limpar filtros
        </Button>
      )}
    </div>
  );
};

export default BoardFilters;
