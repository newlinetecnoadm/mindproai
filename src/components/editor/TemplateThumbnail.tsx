import type { DiagramTemplate } from "@/data/templates";

interface TemplateThumbnailProps {
  template: DiagramTemplate;
}

const typeColorMap: Record<string, string> = {
  orange: "#f97316",
  blue: "#3b82f6",
  green: "#22c55e",
  purple: "#8b5cf6",
  red: "#ef4444",
};

const shapeColorMap: Record<string, string> = {
  green: "#22c55e",
  blue: "#3b82f6",
  red: "#ef4444",
  purple: "#8b5cf6",
  orange: "#f97316",
};

const TemplateThumbnail = ({ template }: TemplateThumbnailProps) => {
  const { nodes, edges } = template;

  if (nodes.length === 0) return null;

  // Calculate bounds
  const xs = nodes.map((n) => n.position.x);
  const ys = nodes.map((n) => n.position.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const padding = 30;
  const nodeW = 80;
  const nodeH = 28;
  const svgW = 280;
  const svgH = 96;

  const rangeX = maxX - minX + nodeW || 1;
  const rangeY = maxY - minY + nodeH || 1;

  const scaleX = (svgW - padding * 2) / rangeX;
  const scaleY = (svgH - padding * 2) / rangeY;
  const scale = Math.min(scaleX, scaleY, 1.2);

  const offsetX = (svgW - rangeX * scale) / 2;
  const offsetY = (svgH - rangeY * scale) / 2;

  const tx = (x: number) => (x - minX) * scale + offsetX;
  const ty = (y: number) => (y - minY) * scale + offsetY;

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const getNodeColor = (n: any): string => {
    const c = n.data?.color as string;
    return typeColorMap[c] || shapeColorMap[c] || "#6b7280";
  };

  const isBlank = template.name === "Em branco";

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Edges */}
      {edges.map((edge) => {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);
        if (!src || !tgt) return null;

        const x1 = tx(src.position.x) + (nodeW * scale) / 2;
        const y1 = ty(src.position.y) + (nodeH * scale) / 2;
        const x2 = tx(tgt.position.x) + (nodeW * scale) / 2;
        const y2 = ty(tgt.position.y) + (nodeH * scale) / 2;

        // Curved path
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const dx = x2 - x1;
        const dy = y2 - y1;
        const isHorizontal = Math.abs(dx) > Math.abs(dy);
        const cx = isHorizontal ? midX : midX + (dx === 0 ? 0 : dx * 0.3);
        const cy = isHorizontal ? midY + dy * 0.3 : midY;

        return (
          <path
            key={edge.id}
            d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            className="text-muted-foreground/40"
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => {
        const x = tx(node.position.x);
        const y = ty(node.position.y);
        const w = nodeW * scale;
        const h = nodeH * scale;
        const color = getNodeColor(node);
        const label = (node.data?.label as string) || "";
        const isRoot = node.data?.isRoot;
        const shape = node.data?.shape as string;

        // Font size scaled
        const fontSize = Math.max(5, Math.min(8, 7 * scale));
        const truncated = label.length > 12 ? label.slice(0, 11) + "…" : label;

        if (shape === "diamond") {
          const cx = x + w / 2;
          const cy = y + h / 2;
          const rw = w / 2;
          const rh = h / 2;
          return (
            <g key={node.id}>
              <polygon
                points={`${cx},${cy - rh} ${cx + rw},${cy} ${cx},${cy + rh} ${cx - rw},${cy}`}
                fill={color}
                opacity={0.15}
                stroke={color}
                strokeWidth={1}
              />
              <text x={cx} y={cy + fontSize / 3} textAnchor="middle" fontSize={fontSize} fill={color} fontWeight={500}>
                {truncated}
              </text>
            </g>
          );
        }

        if (shape === "oval") {
          return (
            <g key={node.id}>
              <ellipse
                cx={x + w / 2}
                cy={y + h / 2}
                rx={w / 2}
                ry={h / 2}
                fill={color}
                opacity={0.15}
                stroke={color}
                strokeWidth={1}
              />
              <text x={x + w / 2} y={y + h / 2 + fontSize / 3} textAnchor="middle" fontSize={fontSize} fill={color} fontWeight={500}>
                {truncated}
              </text>
            </g>
          );
        }

        return (
          <g key={node.id}>
            <rect
              x={x}
              y={y}
              width={w}
              height={h}
              rx={isRoot ? h / 2 : 4}
              fill={color}
              opacity={isRoot ? 0.2 : 0.12}
              stroke={color}
              strokeWidth={isRoot ? 1.5 : 1}
            />
            <text
              x={x + w / 2}
              y={y + h / 2 + fontSize / 3}
              textAnchor="middle"
              fontSize={fontSize}
              fill={color}
              fontWeight={isRoot ? 700 : 500}
            >
              {truncated}
            </text>
          </g>
        );
      })}

      {/* Blank overlay hint */}
      {isBlank && nodes.length <= 1 && (
        <text
          x={svgW / 2}
          y={svgH - 8}
          textAnchor="middle"
          fontSize={6}
          className="fill-muted-foreground/50"
        >
          Comece do zero
        </text>
      )}
    </svg>
  );
};

export default TemplateThumbnail;
