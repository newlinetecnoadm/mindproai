import { useMemo } from "react";
import { Node, Edge } from "@xyflow/react";
import { ChevronRight, ChevronDown, Circle } from "lucide-react";

interface OutlineViewProps {
  nodes: Node[];
  edges: Edge[];
  onNodeClick?: (nodeId: string) => void;
  onNodeChange?: (nodeId: string, label: string) => void;
  readOnly?: boolean;
}

export function OutlineView({ nodes, edges, onNodeClick, onNodeChange, readOnly }: OutlineViewProps) {
  const rootNode = useMemo(() => nodes.find((n) => (n.data as any).isRoot), [nodes]);

  const buildTree = (parentId: string): any[] => {
    const children = edges
      .filter((e) => e.source === parentId)
      .map((e) => {
        const node = nodes.find((n) => n.id === e.target);
        if (!node) return null;
        return {
          ...node,
          children: buildTree(node.id),
        };
      })
      .filter(Boolean);
    return children;
  };

  const tree = useMemo(() => {
    if (!rootNode) return [];
    return [
      {
        ...rootNode,
        children: buildTree(rootNode.id),
      },
    ];
  }, [rootNode, nodes, edges]);

  const renderItem = (item: any, depth: number = 0) => {
    return (
      <div key={item.id} className="flex flex-col">
        <div 
          className="flex items-center gap-2 py-1 px-2 hover:bg-accent/50 rounded-md cursor-pointer group"
          onClick={() => onNodeClick?.(item.id)}
          style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
        >
          <div className="w-4 h-4 flex items-center justify-center text-muted-foreground/60">
            {item.children.length > 0 ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <Circle className="w-1.5 h-1.5 fill-current" />
            )}
          </div>
          
          {readOnly ? (
            <span className="text-sm py-0.5">{item.data.label}</span>
          ) : (
            <input
              className="text-sm bg-transparent border-none outline-none focus:ring-1 focus:ring-primary/30 rounded px-1 flex-1 py-0.5"
              value={item.data.label}
              onChange={(e) => onNodeChange?.(item.id, e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {item.data.subLabel && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded ml-2">
              {item.data.subLabel}
            </span>
          )}
        </div>
        
        {item.children.map((child: any) => renderItem(child, depth + 1))}
      </div>
    );
  };

  if (!rootNode) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center">
        <p>Nenhum nó raiz encontrado.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 max-w-4xl mx-auto w-full">
      <div className="bg-card border rounded-xl p-4 shadow-sm min-h-[400px]">
        <div className="mb-6 pb-4 border-b">
          <h2 className="text-lg font-semibold">Esboço do Diagrama</h2>
          <p className="text-sm text-muted-foreground">Visualize e edite a hierarquia em formato de lista.</p>
        </div>
        <div className="space-y-1">
          {tree.map((item) => renderItem(item))}
        </div>
      </div>
    </div>
  );
}
