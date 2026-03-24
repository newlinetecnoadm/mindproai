import { describe, it, expect } from "vitest";
import { assignDepthColors } from "../components/mindmap/depthColors";
import type { Node, Edge } from "@xyflow/react";

describe("Style Synchronization", () => {
  const mockNodes: Node[] = [
    { id: "root", position: { x: 0, y: 0 }, data: { label: "Root", isRoot: true } },
    { id: "child-1", position: { x: 100, y: 0 }, data: { label: "Child 1" } },
    { id: "grandchild-1", position: { x: 200, y: 0 }, data: { label: "Grandchild 1" } },
  ];

  const mockEdges: Edge[] = [
    { id: "e1", source: "root", target: "child-1" },
    { id: "e2", source: "child-1", target: "grandchild-1" },
  ];

  it("should update node style when hierarchy colors are assigned", () => {
    // 1. Initial assignment with default theme
    const nodes = assignDepthColors(mockNodes, mockEdges, { isDefault: true, diagramType: "mindmap" });
    
    const child1 = nodes.find(n => n.id === "child-1");
    const grandchild1 = nodes.find(n => n.id === "grandchild-1");

    expect(child1?.data?.branchHex).toBeDefined();
    expect(child1?.style?.background).toBe(child1?.data?.branchHex);
    expect(child1?.style?.color).toBe("#ffffff"); // Mindmap L1 is filled

    expect(grandchild1?.data?.branchHex).toBe(child1?.data?.branchHex);
    expect(grandchild1?.style?.background).toBe("transparent"); // Mindmap L2+ is transparent
    expect(grandchild1?.style?.color).toBe(grandchild1?.data?.branchHex);

    // 2. Switch to a custom theme with a specific edge color
    const customThemeOpts = {
      edgeColor: "#ff0000",
      isDefault: false,
      diagramType: "mindmap"
    };
    
    const updatedNodes = assignDepthColors(nodes, mockEdges, customThemeOpts);
    
    const updatedChild1 = updatedNodes.find(n => n.id === "child-1");
    const updatedGrandchild1 = updatedNodes.find(n => n.id === "grandchild-1");

    // The color should have changed from default to theme-derived
    expect(updatedChild1?.data?.branchHex).not.toBe(child1?.data?.branchHex);
    
    // CRITICAL: The NEW style object must reflect the NEW branch color
    expect(updatedChild1?.style?.background).toBe(updatedChild1?.data?.branchHex);
    expect(updatedGrandchild1?.style?.color).toBe(updatedGrandchild1?.data?.branchHex);
  });

  it("should handle Org Chart styling correctly", () => {
    const nodes = assignDepthColors(mockNodes, mockEdges, { isDefault: true, diagramType: "orgchart" });
    
    const child1 = nodes.find(n => n.id === "child-1");
    const grandchild1 = nodes.find(n => n.id === "grandchild-1");

    // Org Chart Level 1 should be filled
    expect(child1?.style?.background).toBe(child1?.data?.branchHex);
    expect(child1?.style?.color).toBe("#ffffff");

    // Org Chart Level 2+ should be transparent with colored text
    expect(grandchild1?.style?.background).toBe("transparent");
    expect(grandchild1?.style?.color).toBe(grandchild1?.data?.branchHex);
  });
});
