# React Flow — Base de Conhecimento Completa

> Fonte: [reactflow.dev](https://reactflow.dev) | Versão: React Flow v12 | Última atualização: 2026-03-19

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Instalação e Setup](#instalação-e-setup)
3. [Conceitos Core](#conceitos-core)
4. [Exemplos — Nodes](#exemplos--nodes)
5. [Exemplos — Edges](#exemplos--edges)
6. [Exemplos — Interaction](#exemplos--interaction)
7. [Exemplos — Subflows & Grouping](#exemplos--subflows--grouping)
8. [Exemplos — Layout](#exemplos--layout)
9. [Exemplos — Styling](#exemplos--styling)
10. [Exemplos — Whiteboard](#exemplos--whiteboard)
11. [Exemplos — Misc](#exemplos--misc)
12. [API Reference — Componentes Principais](#api-reference--componentes-principais)
13. [API Reference — Hooks](#api-reference--hooks)
14. [API Reference — Utils](#api-reference--utils)
15. [API Reference — Types](#api-reference--types)
16. [UI Components (React Flow UI)](#ui-components-react-flow-ui)

---

## Visão Geral

React Flow é uma biblioteca para construir interfaces baseadas em nós (node-based UIs), fluxos, diagramas interativos e editores de workflow. É altamente customizável e construída para React.

**Pacote:** `@xyflow/react`  
**Repositório:** https://github.com/xyflow/xyflow  
**Playground:** https://play.reactflow.dev

### Características principais

- Nodes e Edges totalmente customizáveis
- Zoom, pan e fit view nativos
- Seleção múltipla
- Conexão via drag
- MiniMap, Controls e Background built-in
- Suporte a TypeScript
- SSR/SSG compatível
- Acessibilidade (ARIA)

---

## Instalação e Setup

```bash
npm install @xyflow/react
# ou
yarn add @xyflow/react
# ou
pnpm add @xyflow/react
```

### Setup mínimo obrigatório

```jsx
import { ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css'; // OBRIGATÓRIO importar o CSS
```

### Exemplo mínimo funcional

```jsx
import { ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const nodes = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Node 1' } },
  { id: '2', position: { x: 0, y: 100 }, data: { label: 'Node 2' } },
];

const edges = [{ id: 'e1-2', source: '1', target: '2' }];

export default function Flow() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ReactFlow nodes={nodes} edges={edges} />
    </div>
  );
}
```

> ⚠️ O container pai do `<ReactFlow />` **precisa ter width e height definidos**.

---

## Conceitos Core

### Estrutura de um Node

```ts
type Node = {
  id: string;                          // único, obrigatório
  position: { x: number; y: number }; // obrigatório
  data: Record<string, unknown>;       // dados customizados
  type?: string;                       // 'input' | 'output' | 'default' | custom
  sourcePosition?: Position;           // 'top' | 'right' | 'bottom' | 'left'
  targetPosition?: Position;
  draggable?: boolean;
  selectable?: boolean;
  connectable?: boolean;
  deletable?: boolean;
  hidden?: boolean;
  selected?: boolean;
  style?: CSSProperties;
  className?: string;
  parentId?: string;                   // para subflows
  expandParent?: boolean;
  extent?: 'parent' | CoordinateExtent;
  zIndex?: number;
  origin?: NodeOrigin;                 // [0,0] a [1,1], padrão [0,0]
};
```

### Estrutura de um Edge

```ts
type Edge = {
  id: string;           // único, obrigatório
  source: string;       // id do node de origem, obrigatório
  target: string;       // id do node de destino, obrigatório
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;        // 'default' | 'straight' | 'step' | 'smoothstep' | custom
  animated?: boolean;
  hidden?: boolean;
  selected?: boolean;
  label?: string | ReactNode;
  labelStyle?: CSSProperties;
  labelShowBg?: boolean;
  labelBgStyle?: CSSProperties;
  markerStart?: EdgeMarker;
  markerEnd?: EdgeMarker;
  style?: CSSProperties;
  className?: string;
  deletable?: boolean;
  reconnectable?: boolean | 'source' | 'target';
  zIndex?: number;
  data?: Record<string, unknown>;
};
```

### Tipos de Node Built-in

| Tipo      | Descrição                              |
|-----------|----------------------------------------|
| `default` | Node padrão com handle source e target |
| `input`   | Apenas source handle (saída)           |
| `output`  | Apenas target handle (entrada)         |
| `group`   | Container para subflows                |

### Tipos de Edge Built-in

| Tipo         | Descrição                    |
|--------------|------------------------------|
| `default`    | Bezier curve (padrão)        |
| `straight`   | Linha reta                   |
| `step`       | Passos em ângulo reto        |
| `smoothstep` | Passos suavizados            |

### Props principais do `<ReactFlow />`

```tsx
<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodesChange={onNodesChange}
  onEdgesChange={onEdgesChange}
  onConnect={onConnect}
  nodeTypes={nodeTypes}          // { myNode: MyNodeComponent }
  edgeTypes={edgeTypes}          // { myEdge: MyEdgeComponent }
  defaultViewport={{ x: 0, y: 0, zoom: 1 }}
  fitView                        // ajusta viewport para conter todos os nodes
  fitViewOptions={{ padding: 0.2 }}
  snapToGrid={true}
  snapGrid={[15, 15]}
  connectionMode={ConnectionMode.Loose}
  connectionLineType={ConnectionLineType.Bezier}
  deleteKeyCode="Delete"
  selectionKeyCode="Shift"
  multiSelectionKeyCode="Meta"
  panOnDrag={true}
  panOnScroll={false}
  zoomOnScroll={true}
  zoomOnPinch={true}
  minZoom={0.1}
  maxZoom={4}
  attributionPosition="bottom-right"
  proOptions={{ hideAttribution: true }}
  colorMode="light"              // 'light' | 'dark' | 'system'
  onInit={(instance) => {}}
  onNodeClick={(event, node) => {}}
  onNodeDoubleClick={(event, node) => {}}
  onNodeMouseEnter={(event, node) => {}}
  onNodeMouseLeave={(event, node) => {}}
  onNodeContextMenu={(event, node) => {}}
  onNodeDragStart={(event, node) => {}}
  onNodeDrag={(event, node) => {}}
  onNodeDragStop={(event, node) => {}}
  onNodesDelete={(nodes) => {}}
  onEdgeClick={(event, edge) => {}}
  onEdgeDoubleClick={(event, edge) => {}}
  onEdgesDelete={(edges) => {}}
  onSelectionChange={({ nodes, edges }) => {}}
  onMoveStart={(event, viewport) => {}}
  onMove={(event, viewport) => {}}
  onMoveEnd={(event, viewport) => {}}
  onBeforeDelete={async ({ nodes, edges }) => boolean}
/>
```

---

## Exemplos — Nodes

### 1. Add Node on Edge Drop

**URL:** https://reactflow.dev/examples/nodes/add-node-on-edge-drop  
**Conceito:** Criar um novo node quando o usuário solta uma conexão em área vazia.

```jsx
import React, { useRef, useCallback } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

let id = 1;
const getId = () => `${id++}`;

const initialNodes = [
  { id: '0', type: 'input', data: { label: 'Node' }, position: { x: 0, y: 50 } },
];

function AddNodeOnEdgeDrop() {
  const { screenToFlowPosition } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [],
  );

  const onConnectEnd = useCallback(
    (event, connectionState) => {
      // Só cria node se a conexão não terminou em outro node
      if (!connectionState.isValid) {
        const id = getId();
        const { clientX, clientY } =
          'changedTouches' in event ? event.changedTouches[0] : event;

        const newNode = {
          id,
          position: screenToFlowPosition({ x: clientX, y: clientY }),
          data: { label: `Node ${id}` },
          origin: [0.5, 0.0],
        };

        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) =>
          eds.concat({
            id,
            source: connectionState.fromNode.id,
            target: id,
          }),
        );
      }
    },
    [screenToFlowPosition],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onConnectEnd={onConnectEnd}
      fitView
      fitViewOptions={{ padding: 2 }}
    />
  );
}

export default () => (
  <ReactFlowProvider>
    <AddNodeOnEdgeDrop />
  </ReactFlowProvider>
);
```

---

### 2. Custom Node

**URL:** https://reactflow.dev/examples/nodes/custom-node  
**Conceito:** Criar nodes com componentes React customizados e registrá-los via `nodeTypes`.

```jsx
// ColorSelectorNode.jsx
import { Handle, Position } from '@xyflow/react';

function ColorSelectorNode({ data }) {
  return (
    <div style={{ padding: 10, border: '1px solid #ddd', borderRadius: 8 }}>
      <Handle type="target" position={Position.Left} />
      <div>
        <label>Cor: </label>
        <input
          type="color"
          defaultValue={data.color}
          onChange={data.onChange}
        />
      </div>
      <Handle type="source" position={Position.Right} id="a" />
      <Handle type="source" position={Position.Right} id="b" style={{ top: '75%' }} />
    </div>
  );
}

export default ColorSelectorNode;
```

```jsx
// App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { ReactFlow, useNodesState, useEdgesState, addEdge, MiniMap, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ColorSelectorNode from './ColorSelectorNode';

const nodeTypes = {
  selectorNode: ColorSelectorNode,
};

const defaultViewport = { x: 0, y: 0, zoom: 1.5 };
const snapGrid = [20, 20];

export default function CustomNodeFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [bgColor, setBgColor] = useState('#c9f1dd');

  useEffect(() => {
    const onChange = (event) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id !== '2') return node;
          const color = event.target.value;
          setBgColor(color);
          return { ...node, data: { ...node.data, color } };
        }),
      );
    };

    setNodes([
      { id: '1', type: 'input', data: { label: 'An input node' }, position: { x: 0, y: 50 }, sourcePosition: 'right' },
      { id: '2', type: 'selectorNode', data: { onChange, color: '#c9f1dd' }, position: { x: 300, y: 50 } },
      { id: '3', type: 'output', data: { label: 'Output A' }, position: { x: 650, y: 25 }, targetPosition: 'left' },
      { id: '4', type: 'output', data: { label: 'Output B' }, position: { x: 650, y: 100 }, targetPosition: 'left' },
    ]);

    setEdges([
      { id: 'e1-2', source: '1', target: '2', animated: true },
      { id: 'e2a-3', source: '2', target: '3', animated: true },
      { id: 'e2b-4', source: '2', target: '4', animated: true },
    ]);
  }, []);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      style={{ background: bgColor }}
      nodeTypes={nodeTypes}
      snapToGrid={true}
      snapGrid={snapGrid}
      defaultViewport={defaultViewport}
      fitView
    >
      <MiniMap
        nodeStrokeColor={(n) => {
          if (n.type === 'input') return '#0041d0';
          if (n.type === 'selectorNode') return bgColor;
          if (n.type === 'output') return '#ff0072';
        }}
        nodeColor={(n) => {
          if (n.type === 'selectorNode') return bgColor;
          return '#fff';
        }}
      />
      <Controls />
    </ReactFlow>
  );
}
```

**Padrão chave:** Sempre defina `nodeTypes` **fora** do componente ou com `useMemo` para evitar re-renders desnecessários.

---

### 3. Delete Middle Node

**URL:** https://reactflow.dev/examples/nodes/delete-middle-node  
**Conceito:** Ao deletar um node do meio de uma cadeia `a→b→c`, reconectar automaticamente `a→c`.

**APIs utilizadas:**
- `onNodesDelete` — callback chamado quando nodes são deletados
- `getConnectedEdges(nodes, edges)` — retorna todas as edges conectadas aos nodes
- `getIncomers(node, nodes, edges)` — retorna nodes que chegam no node
- `getOutgoers(node, nodes, edges)` — retorna nodes que saem do node

```jsx
import React, { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  getIncomers,
  getOutgoers,
  getConnectedEdges,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  { id: '1', type: 'input', data: { label: 'Start here...' }, position: { x: -150, y: 0 } },
  { id: '2', type: 'input', data: { label: '...or here!' }, position: { x: 150, y: 0 } },
  { id: '3', data: { label: 'Delete me.' }, position: { x: 0, y: 100 } },
  { id: '4', data: { label: 'Then me!' }, position: { x: 0, y: 200 } },
  { id: '5', type: 'output', data: { label: 'End here!' }, position: { x: 0, y: 300 } },
];

const initialEdges = [
  { id: '1->3', source: '1', target: '3' },
  { id: '2->3', source: '2', target: '3' },
  { id: '3->4', source: '3', target: '4' },
  { id: '4->5', source: '4', target: '5' },
];

export default function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params) => setEdges(addEdge(params, edges)), [edges]);

  const onNodesDelete = useCallback(
    (deleted) => {
      let remainingNodes = [...nodes];
      setEdges(
        deleted.reduce((acc, node) => {
          const incomers = getIncomers(node, remainingNodes, acc);
          const outgoers = getOutgoers(node, remainingNodes, acc);
          const connectedEdges = getConnectedEdges([node], acc);

          // Remove as edges que estavam conectadas ao node deletado
          const remainingEdges = acc.filter((edge) => !connectedEdges.includes(edge));

          // Cria novas edges conectando incomers diretamente aos outgoers
          const createdEdges = incomers.flatMap(({ id: source }) =>
            outgoers.map(({ id: target }) => ({
              id: `${source}->${target}`,
              source,
              target,
            })),
          );

          remainingNodes = remainingNodes.filter((rn) => rn.id !== node.id);

          return [...remainingEdges, ...createdEdges];
        }, edges),
      );
    },
    [nodes, edges],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onNodesDelete={onNodesDelete}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
    >
      <Background />
    </ReactFlow>
  );
}
```

**Lógica da reconexão:**
1. `deleted` é um array de todos os nodes deletados simultaneamente
2. Para cada node deletado, busca seus `incomers` (quem chega) e `outgoers` (quem sai)
3. Remove as edges conectadas ao node deletado
4. Cria novas edges conectando cada incomer a cada outgoer (`flatMap`)

---

### 4. Node Resizer

**URL:** https://reactflow.dev/examples/nodes/node-resizer  
**Conceito:** Adicionar handles de redimensionamento a nodes customizados.

```jsx
// ResizableNode.jsx
import { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';

const ResizableNode = ({ data, selected }) => {
  return (
    <>
      <NodeResizer
        color="#ff0071"
        isVisible={selected}
        minWidth={100}
        minHeight={30}
      />
      <Handle type="target" position={Position.Left} />
      <div style={{ padding: 10 }}>{data.label}</div>
      <Handle type="source" position={Position.Right} />
    </>
  );
};

export default memo(ResizableNode);
```

```jsx
// ResizableNodeSelected.jsx — com NodeResizeControl customizado
import { memo } from 'react';
import { Handle, Position, NodeResizeControl } from '@xyflow/react';

const ResizableNodeSelected = ({ data, selected }) => {
  return (
    <>
      <NodeResizeControl
        style={{ background: 'transparent', border: 'none' }}
        minWidth={100}
        minHeight={50}
      >
        {/* Ícone customizado no handle de resize */}
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20">
          <path d="M5 15 L15 5 M13 5 L15 5 L15 7" stroke="#ff0071" strokeWidth="2" fill="none" />
        </svg>
      </NodeResizeControl>
      <Handle type="target" position={Position.Left} />
      <div style={{ padding: 10 }}>{data.label}</div>
      <Handle type="source" position={Position.Right} />
    </>
  );
};

export default memo(ResizableNodeSelected);
```

**Props do `<NodeResizer />`:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| `isVisible` | boolean | Controla visibilidade dos handles |
| `color` | string | Cor dos handles de resize |
| `handleStyle` | CSSProperties | Estilo dos handles |
| `lineStyle` | CSSProperties | Estilo das linhas da borda |
| `minWidth` | number | Largura mínima |
| `minHeight` | number | Altura mínima |
| `maxWidth` | number | Largura máxima |
| `maxHeight` | number | Altura máxima |
| `onResize` | function | Callback durante resize |
| `onResizeStart` | function | Callback início do resize |
| `onResizeEnd` | function | Callback fim do resize |

---

### 5. Node Toolbar

**URL:** https://reactflow.dev/examples/nodes/node-toolbar  
**Conceito:** Barra de ferramentas flutuante que aparece acima de um node selecionado.

```jsx
import { memo } from 'react';
import { Handle, Position, NodeToolbar } from '@xyflow/react';

const CustomNode = ({ data }) => {
  return (
    <>
      <NodeToolbar
        isVisible={data.toolbarVisible}
        position={data.toolbarPosition}
      >
        <button onClick={() => alert('deletar')}>🗑️ Deletar</button>
        <button onClick={() => alert('copiar')}>📋 Copiar</button>
        <button onClick={() => alert('editar')}>✏️ Editar</button>
      </NodeToolbar>

      <Handle type="target" position={Position.Left} />
      <div className="custom-node">
        {data.label}
      </div>
      <Handle type="source" position={Position.Right} />
    </>
  );
};

export default memo(CustomNode);
```

**Props do `<NodeToolbar />`:**

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `isVisible` | boolean | — | Força visibilidade (ignora seleção) |
| `position` | Position | `Position.Top` | Posição relativa ao node |
| `offset` | number | `10` | Distância do node em pixels |
| `align` | `'start'` \| `'center'` \| `'end'` | `'center'` | Alinhamento |
| `nodeId` | string | — | ID do node alvo (quando usado fora) |

---

### 6. Proximity Connect

**URL:** https://reactflow.dev/examples/nodes/proximity-connect  
**Conceito:** Conectar nodes automaticamente quando se aproximam durante o drag.

```jsx
import { useCallback } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
} from '@xyflow/react';

const MIN_DISTANCE = 150;

export default function ProximityFlow() {
  const { getNodes } = useReactFlow();
  const [nodes, , onNodesChange] = useNodesState(defaultNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  const getClosestEdge = useCallback((node) => {
    const { nodeLookup } = getNodes();
    const internalNode = nodeLookup.get(node.id);

    const closestNode = Array.from(nodeLookup.values()).reduce(
      (res, n) => {
        if (n.id !== internalNode.id) {
          const dx = n.internals.positionAbsolute.x - internalNode.internals.positionAbsolute.x;
          const dy = n.internals.positionAbsolute.y - internalNode.internals.positionAbsolute.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < res.distance && d < MIN_DISTANCE) {
            return { distance: d, node: n };
          }
        }
        return res;
      },
      { distance: Number.MAX_VALUE, node: null },
    );

    if (!closestNode.node) return null;

    const closeNodeIsSource = closestNode.node.internals.positionAbsolute.x < internalNode.internals.positionAbsolute.x;

    return {
      id: closeNodeIsSource
        ? `${closestNode.node.id}-${node.id}`
        : `${node.id}-${closestNode.node.id}`,
      source: closeNodeIsSource ? closestNode.node.id : node.id,
      target: closeNodeIsSource ? node.id : closestNode.node.id,
    };
  }, []);

  const onNodeDrag = useCallback(
    (_, node) => {
      const closeEdge = getClosestEdge(node);

      setEdges((es) => {
        const nextEdges = es.filter((e) => e.className !== 'temp');

        if (closeEdge && !nextEdges.find((e) => e.id === closeEdge.id)) {
          closeEdge.className = 'temp';
          nextEdges.push(closeEdge);
        }

        return nextEdges;
      });
    },
    [getClosestEdge],
  );

  const onNodeDragStop = useCallback(
    (_, node) => {
      const closeEdge = getClosestEdge(node);

      setEdges((es) => {
        const nextEdges = es.filter((e) => e.className !== 'temp');
        if (closeEdge) nextEdges.push(closeEdge);
        return nextEdges;
      });
    },
    [getClosestEdge],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onNodeDrag={onNodeDrag}
      onNodeDragStop={onNodeDragStop}
      fitView
    />
  );
}
```

---

### 7. Update Node

**URL:** https://reactflow.dev/examples/nodes/update-node  
**Conceito:** Atualizar dados de um node programaticamente usando o padrão `setNodes`.

```jsx
import { useCallback, useState } from 'react';
import { ReactFlow, useNodesState, useEdgesState } from '@xyflow/react';

export default function UpdateNode() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [nodeName, setNodeName] = useState('Node 1');

  // Atualizar label do node selecionado
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              label: nodeName,
            },
          };
        }
        return node;
      }),
    );
  }, [nodeName, selectedNodeId, setNodes]);

  const onNodeClick = useCallback((_, node) => {
    setSelectedNodeId(node.id);
    setNodeName(node.data.label);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          fitView
        />
      </div>
      {selectedNodeId && (
        <div style={{ padding: 20 }}>
          <label>Label: </label>
          <input
            value={nodeName}
            onChange={(e) => setNodeName(e.target.value)}
          />
        </div>
      )}
    </div>
  );
}
```

---

### 8. Drag Handle

**URL:** https://reactflow.dev/examples/nodes/drag-handle  
**Conceito:** Definir uma área específica dentro do node como handle de drag (arrastar).

```jsx
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

const DragHandleNode = ({ data }) => {
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8 }}>
      {/* Classe 'drag-handle' é reconhecida pelo React Flow */}
      <div
        className="drag-handle"
        style={{ padding: 8, background: '#eee', cursor: 'grab', borderRadius: '8px 8px 0 0' }}
      >
        ⠿ Arraste aqui
      </div>
      <div style={{ padding: 10 }}>{data.label}</div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
};

export default memo(DragHandleNode);
```

```jsx
// No componente <ReactFlow />, passe o seletor CSS do drag handle:
<ReactFlow
  nodes={nodes}
  edges={edges}
  nodesDraggable={true}
  nodeDragThreshold={1}
  // Usando prop dragHandle no node:
  // node.dragHandle = '.drag-handle'
/>
```

No node, defina a propriedade `dragHandle`:

```js
const node = {
  id: '1',
  type: 'dragHandleNode',
  dragHandle: '.drag-handle', // seletor CSS da área de drag
  data: { label: 'Drag Handle Node' },
  position: { x: 0, y: 0 },
};
```

---

### 9. Connection Limit

**URL:** https://reactflow.dev/examples/nodes/connection-limit  
**Conceito:** Limitar quantas conexões um handle pode ter usando `isValidConnection`.

```jsx
import { Handle, Position, useHandleConnections } from '@xyflow/react';

function CustomNode({ id }) {
  // Monitora conexões existentes no handle
  const connections = useHandleConnections({
    type: 'target',
    nodeId: id,
  });

  return (
    <div>
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={connections.length < 1} // máximo 1 conexão
      />
      <div>Node com limite de 1 conexão de entrada</div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
```

**Alternativa com `isValidConnection`:**

```jsx
<ReactFlow
  nodes={nodes}
  edges={edges}
  isValidConnection={(connection) => {
    // Verifica quantas edges o target já tem
    const targetEdges = edges.filter((e) => e.target === connection.target);
    return targetEdges.length < 2; // máximo 2 entradas
  }}
/>
```

---

### 10. Easy Connect

**URL:** https://reactflow.dev/examples/nodes/easy-connect  
**Conceito:** Conectar nodes clicando neles (sem precisar arrastar do handle).

```jsx
import { useCallback, useState } from 'react';
import { ReactFlow, addEdge, useNodesState, useEdgesState } from '@xyflow/react';

export default function EasyConnect() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [connectingNodeId, setConnectingNodeId] = useState(null);

  const onConnectStart = useCallback((_, { nodeId }) => {
    setConnectingNodeId(nodeId);
  }, []);

  const onConnectEnd = useCallback(
    (event, connectionState) => {
      if (!connectionState.isValid && connectingNodeId) {
        // Criação de node ao soltar em área vazia (combo com Add Node on Edge Drop)
      }
    },
    [connectingNodeId],
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onConnectStart={onConnectStart}
      onConnectEnd={onConnectEnd}
      connectionMode="loose" // permite conectar em qualquer lugar do node
      fitView
    />
  );
}
```

---

## Exemplos — Edges

### 1. Custom Edges

**URL:** https://reactflow.dev/examples/edges/custom-edges  
**Conceito:** Criar edges customizadas com botões, bidirecionalidade e self-connection.

```jsx
// ButtonEdge.jsx — Edge com botão de deletar
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow } from '@xyflow/react';

export default function ButtonEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}) {
  const { setEdges } = useReactFlow();

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const onEdgeClick = () => {
    setEdges((edges) => edges.filter((e) => e.id !== id));
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            fontSize: 12,
            pointerEvents: 'all', // necessário para o botão ser clicável
          }}
          className="nodrag nopan" // evita interferir no drag/pan do canvas
        >
          <button onClick={onEdgeClick} style={{ borderRadius: '50%', width: 20, height: 20 }}>
            ×
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
```

```jsx
// SelfConnectingEdge.jsx — Edge que conecta o node a si mesmo
import { BaseEdge, useInternalNode, getStraightPath } from '@xyflow/react';

export default function SelfConnectingEdge({ id, source, markerEnd, style }) {
  const sourceNode = useInternalNode(source);

  if (!sourceNode) return null;

  const { positionAbsolute, width, height } = sourceNode.internals;

  // Cria um arco SVG customizado
  const edgePath = `M ${positionAbsolute.x - 5} ${positionAbsolute.y + height / 2}
    A 35 35 0 1 0 ${positionAbsolute.x + width / 2} ${positionAbsolute.y - 5}`;

  return (
    <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
  );
}
```

```jsx
// App.jsx — Registrando os tipos de edge
const edgeTypes = {
  bidirectional: BiDirectionalEdge,
  selfconnecting: SelfConnectingEdge,
  buttonedge: ButtonEdge,
};

const nodeTypes = {
  bidirectional: BiDirectionalNode,
};

<ReactFlow
  edgeTypes={edgeTypes}
  nodeTypes={nodeTypes}
  connectionMode={ConnectionMode.Loose}
  ...
/>
```

**Funções de path disponíveis:**

```js
import {
  getBezierPath,         // curva Bezier
  getStraightPath,       // linha reta
  getSmoothStepPath,     // passos suavizados
  getSimpleBezierPath,   // Bezier simples
} from '@xyflow/react';

// Todas retornam: [edgePath, labelX, labelY, offsetX, offsetY]
const [edgePath, labelX, labelY] = getBezierPath({
  sourceX, sourceY, sourcePosition,
  targetX, targetY, targetPosition,
  curvature: 0.25, // apenas getBezierPath
});
```

---

### 2. Animating Edges

**URL:** https://reactflow.dev/examples/edges/animating-edges  
**Conceito:** Animar edges com CSS e SVG.

```jsx
// Edge animada com CSS keyframes
const animatedEdgeStyle = {
  strokeDasharray: 5,
  animation: 'dashdraw 0.5s linear infinite',
};

// Via prop animated (usa animação built-in)
const edges = [
  { id: 'e1-2', source: '1', target: '2', animated: true },
];

// Edge com animação customizada via CSS
export default function AnimatedEdge({ sourceX, sourceY, targetX, targetY, ...props }) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY });

  return (
    <path
      d={edgePath}
      style={{
        strokeDasharray: 5,
        animation: 'dashdraw 0.5s linear infinite',
        stroke: '#ff0071',
        strokeWidth: 2,
        fill: 'none',
      }}
    />
  );
}
```

```css
/* CSS para animação de dash */
@keyframes dashdraw {
  from { stroke-dashoffset: 10; }
  to { stroke-dashoffset: 0; }
}
```

---

### 3. Edge Label Renderer

**URL:** https://reactflow.dev/examples/edges/edge-label-renderer  
**Conceito:** Renderizar HTML customizado no meio de uma edge usando portal React.

```jsx
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';

export default function CustomEdgeWithLabel({
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  data,
}) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  return (
    <>
      <BaseEdge path={edgePath} />
      <EdgeLabelRenderer>
        {/* Este div é renderizado fora do SVG, em HTML puro */}
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            background: '#ffcc00',
            padding: '4px 8px',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 700,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          {data?.label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
```

---

### 4. Edge Toolbar

**URL:** https://reactflow.dev/examples/edges/edge-toolbar  
**Conceito:** Toolbar flutuante posicionada junto a uma edge.

```jsx
import { BaseEdge, EdgeToolbar, getBezierPath, Position } from '@xyflow/react';

export default function EdgeWithToolbar({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
}) {
  const [edgePath] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <EdgeToolbar
        edgeId={id}
        position={Position.Top}
      >
        <button>Editar</button>
        <button>Deletar</button>
      </EdgeToolbar>
    </>
  );
}
```

---

### 5. Floating Edges

**URL:** https://reactflow.dev/examples/edges/floating-edges  
**Conceito:** Edges que sempre conectam pelo ponto mais próximo da borda do node.

```jsx
// utils.js — calcular ponto de interseção na borda do node
import { Position } from '@xyflow/react';

function getNodeIntersection(intersectionNode, targetNode) {
  const { width: intersectionNodeWidth, height: intersectionNodeHeight, internals: { positionAbsolute: intersectionNodePosition } } = intersectionNode;
  const targetPosition = targetNode.internals.positionAbsolute;

  const w = intersectionNodeWidth / 2;
  const h = intersectionNodeHeight / 2;
  const x2 = intersectionNodePosition.x + w;
  const y2 = intersectionNodePosition.y + h;
  const x1 = targetPosition.x + targetNode.width / 2;
  const y1 = targetPosition.y + targetNode.height / 2;

  const xx1 = (x1 - x2) / (2 * w) - (y1 - y2) / (2 * h);
  const yy1 = (x1 - x2) / (2 * w) + (y1 - y2) / (2 * h);
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1));

  const xx3 = a * xx1;
  const yy3 = a * yy1;
  const x = w * (xx3 + yy3) + x2;
  const y = h * (-xx3 + yy3) + y2;

  return { x, y };
}

function getEdgePosition(node, intersectionPoint) {
  const n = { ...node.internals.positionAbsolute, ...node };
  const nx = Math.round(n.x);
  const ny = Math.round(n.y);
  const px = Math.round(intersectionPoint.x);
  const py = Math.round(intersectionPoint.y);

  if (px <= nx + 1) return Position.Left;
  if (px >= nx + n.width - 1) return Position.Right;
  if (py <= ny + 1) return Position.Top;
  if (py >= ny + n.height - 1) return Position.Bottom;
  return Position.Top;
}

export function getEdgeParams(source, target) {
  const sourceIntersectionPoint = getNodeIntersection(source, target);
  const targetIntersectionPoint = getNodeIntersection(target, source);
  const sourcePos = getEdgePosition(source, sourceIntersectionPoint);
  const targetPos = getEdgePosition(target, targetIntersectionPoint);

  return {
    sx: sourceIntersectionPoint.x,
    sy: sourceIntersectionPoint.y,
    tx: targetIntersectionPoint.x,
    ty: targetIntersectionPoint.y,
    sourcePos,
    targetPos,
  };
}
```

```jsx
// FloatingEdge.jsx
import { useInternalNode, getStraightPath } from '@xyflow/react';
import { getEdgeParams } from './utils';

export default function FloatingEdge({ id, source, target, markerEnd, style }) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  if (!sourceNode || !targetNode) return null;

  const { sx, sy, tx, ty } = getEdgeParams(sourceNode, targetNode);
  const [edgePath] = getStraightPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty });

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      markerEnd={markerEnd}
      style={style}
    />
  );
}
```

---

### 6. Delete Edge on Drop

**URL:** https://reactflow.dev/examples/edges/delete-edge-on-drop  
**Conceito:** Deletar uma edge quando o usuário a solta em área vazia durante reconexão.

```jsx
import { useCallback } from 'react';
import { ReactFlow, useNodesState, useEdgesState, addEdge, reconnectEdge } from '@xyflow/react';
import { useRef } from 'react';

export default function DeleteEdgeOnDrop() {
  const edgeReconnectSuccessful = useRef(true);
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((els) => addEdge(params, els)),
    [],
  );

  const onReconnectStart = useCallback(() => {
    edgeReconnectSuccessful.current = false;
  }, []);

  const onReconnect = useCallback((oldEdge, newConnection) => {
    edgeReconnectSuccessful.current = true;
    setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
  }, []);

  const onReconnectEnd = useCallback((_, edge) => {
    if (!edgeReconnectSuccessful.current) {
      // Reconexão não ocorreu — deleta a edge
      setEdges((eds) => eds.filter((e) => e.id !== edge.id));
    }
    edgeReconnectSuccessful.current = true;
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onReconnect={onReconnect}
      onReconnectStart={onReconnectStart}
      onReconnectEnd={onReconnectEnd}
      fitView
    />
  );
}
```

---

### 7. Markers

**URL:** https://reactflow.dev/examples/edges/markers  
**Conceito:** Personalizar setas e marcadores nas pontas das edges.

```jsx
import { MarkerType } from '@xyflow/react';

const edges = [
  // Seta padrão no final
  {
    id: '1',
    source: 'a',
    target: 'b',
    markerEnd: { type: MarkerType.Arrow },
  },
  // Seta fechada (sólida)
  {
    id: '2',
    source: 'a',
    target: 'c',
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  // Seta em ambas as pontas
  {
    id: '3',
    source: 'b',
    target: 'c',
    markerStart: { type: MarkerType.Arrow },
    markerEnd: { type: MarkerType.ArrowClosed },
  },
  // Seta customizada com cor e tamanho
  {
    id: '4',
    source: 'a',
    target: 'd',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#ff0071',
      width: 20,
      height: 20,
    },
  },
];
```

**Tipos de MarkerType:**

| Valor | Descrição |
|-------|-----------|
| `MarkerType.Arrow` | Seta aberta |
| `MarkerType.ArrowClosed` | Seta fechada/sólida |

---

### 8. Reconnect Edge

**URL:** https://reactflow.dev/examples/edges/reconnect-edge  
**Conceito:** Permitir ao usuário arrastar as pontas de uma edge para reconectá-la.

```jsx
import { useCallback } from 'react';
import { ReactFlow, useNodesState, useEdgesState, addEdge, reconnectEdge } from '@xyflow/react';

export default function ReconnectEdge() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((els) => addEdge(params, els)),
    [],
  );

  // Chamado quando a reconexão é bem-sucedida
  const onReconnect = useCallback(
    (oldEdge, newConnection) =>
      setEdges((els) => reconnectEdge(oldEdge, newConnection, els)),
    [],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onReconnect={onReconnect}
      fitView
    />
  );
}
```

A prop `reconnectable` pode ser usada no nível do edge:

```js
const edge = {
  id: 'e1-2',
  source: '1',
  target: '2',
  reconnectable: 'source', // 'source' | 'target' | true (ambos)
};
```

---

## Exemplos — Interaction

### 1. Drag and Drop

**URL:** https://reactflow.dev/examples/interaction/drag-and-drop  
**Conceito:** Implementar uma sidebar com nodes que podem ser arrastados para o canvas.

#### Versão com HTML Drag and Drop API

```jsx
// DnDContext.jsx
import { createContext, useContext, useState } from 'react';

const DnDContext = createContext([null, (_) => {}]);

export const DnDProvider = ({ children }) => {
  const [type, setType] = useState(null);
  return (
    <DnDContext.Provider value={[type, setType]}>
      {children}
    </DnDContext.Provider>
  );
};

export const useDnD = () => useContext(DnDContext);
```

```jsx
// Sidebar.jsx
import { useDnD } from './DnDContext';

export default function Sidebar() {
  const [, setType] = useDnD();

  const onDragStart = (event, nodeType) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside>
      <p>Arraste os nodes para o canvas:</p>
      <div draggable onDragStart={(e) => onDragStart(e, 'input')}>
        Input Node
      </div>
      <div draggable onDragStart={(e) => onDragStart(e, 'default')}>
        Default Node
      </div>
      <div draggable onDragStart={(e) => onDragStart(e, 'output')}>
        Output Node
      </div>
    </aside>
  );
}
```

```jsx
// App.jsx
import React, { useRef, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  useReactFlow,
  Background,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Sidebar from './Sidebar';
import { DnDProvider, useDnD } from './DnDContext';

const initialNodes = [
  { id: '1', type: 'input', data: { label: 'input node' }, position: { x: 250, y: 5 } },
];

let id = 0;
const getId = () => `dndnode_${id++}`;

const DnDFlow = () => {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { screenToFlowPosition } = useReactFlow();
  const [type] = useDnD();

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type,
        position,
        data: { label: `${type} node` },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, type],
  );

  return (
    <div className="dndflow">
      <div className="reactflow-wrapper" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>
      <Sidebar />
    </div>
  );
};

export default () => (
  <ReactFlowProvider>
    <DnDProvider>
      <DnDFlow />
    </DnDProvider>
  </ReactFlowProvider>
);
```

> **Nota:** A função `screenToFlowPosition` converte coordenadas de tela para coordenadas do canvas do React Flow (substitui o antigo `project()`).

---

### 2. Save and Restore

**URL:** https://reactflow.dev/examples/interaction/save-and-restore  
**Conceito:** Salvar e restaurar o estado completo do flow (nodes, edges, viewport).

```jsx
import { useCallback } from 'react';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  Panel,
} from '@xyflow/react';

const FLOW_KEY = 'my-flow-key';

function Flow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { setViewport, toObject } = useReactFlow();

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  const onSave = useCallback(() => {
    const flow = toObject(); // { nodes, edges, viewport }
    localStorage.setItem(FLOW_KEY, JSON.stringify(flow));
  }, [toObject]);

  const onRestore = useCallback(() => {
    const restoreFlow = async () => {
      const flowStr = localStorage.getItem(FLOW_KEY);
      if (!flowStr) return;

      const flow = JSON.parse(flowStr);
      const { x = 0, y = 0, zoom = 1 } = flow.viewport;

      setNodes(flow.nodes || []);
      setEdges(flow.edges || []);
      setViewport({ x, y, zoom });
    };

    restoreFlow();
  }, [setNodes, setEdges, setViewport]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      fitView
    >
      <Panel position="top-right">
        <button onClick={onSave}>Salvar</button>
        <button onClick={onRestore}>Restaurar</button>
      </Panel>
    </ReactFlow>
  );
}

export default () => (
  <ReactFlowProvider>
    <Flow />
  </ReactFlowProvider>
);
```

---

### 3. Context Menu

**URL:** https://reactflow.dev/examples/interaction/context-menu  
**Conceito:** Menu de contexto (clique direito) em nodes e no canvas.

```jsx
import { useCallback, useRef, useState } from 'react';
import { ReactFlow, useNodesState, useEdgesState, addEdge, Background } from '@xyflow/react';

// ContextMenu.jsx
function ContextMenu({ id, top, left, right, bottom, onClick }) {
  const { getNode, setNodes, addNodes, setEdges } = useReactFlow();

  const duplicateNode = useCallback(() => {
    const node = getNode(id);
    const position = {
      x: node.position.x + 50,
      y: node.position.y + 50,
    };

    addNodes({ ...node, selected: false, dragging: false, id: `${node.id}-copy`, position });
    onClick();
  }, [id, getNode, addNodes, onClick]);

  const deleteNode = useCallback(() => {
    setNodes((nodes) => nodes.filter((node) => node.id !== id));
    setEdges((edges) => edges.filter((edge) => edge.source !== id && edge.target !== id));
    onClick();
  }, [id, setNodes, setEdges, onClick]);

  return (
    <div
      style={{
        position: 'absolute',
        top,
        left,
        right,
        bottom,
        zIndex: 10,
        background: 'white',
        border: '1px solid #ccc',
        borderRadius: 8,
        padding: 8,
      }}
      className="context-menu"
      onClick={onClick}
    >
      <p style={{ margin: 0, fontWeight: 'bold' }}>Node {id}</p>
      <button onClick={duplicateNode}>Duplicar</button>
      <button onClick={deleteNode}>Deletar</button>
    </div>
  );
}

// App.jsx
export default function ContextMenuFlow() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [menu, setMenu] = useState(null);
  const ref = useRef(null);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  const onNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault();

      const pane = ref.current.getBoundingClientRect();

      setMenu({
        id: node.id,
        top: event.clientY < pane.height - 200 && event.clientY - pane.top,
        left: event.clientX < pane.width - 200 && event.clientX - pane.left,
        right: event.clientX >= pane.width - 200 && pane.width - event.clientX + pane.left,
        bottom: event.clientY >= pane.height - 200 && pane.height - event.clientY + pane.top,
      });
    },
    [],
  );

  const onPaneClick = useCallback(() => setMenu(null), []);

  return (
    <ReactFlow
      ref={ref}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onPaneClick={onPaneClick}
      onNodeContextMenu={onNodeContextMenu}
      fitView
    >
      <Background />
      {menu && <ContextMenu onClick={onPaneClick} {...menu} />}
    </ReactFlow>
  );
}
```

---

### 4. Prevent Cycles

**URL:** https://reactflow.dev/examples/interaction/prevent-cycles  
**Conceito:** Impedir criação de ciclos no grafo usando `isValidConnection`.

```jsx
import { useCallback } from 'react';
import { ReactFlow, useNodesState, useEdgesState, addEdge, useReactFlow } from '@xyflow/react';

// BFS/DFS para detectar se há caminho de target para source (ciclo)
function hasCycle(target, source, edges) {
  const visited = new Set();
  const queue = [target];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === source) return true; // ciclo detectado!
    if (visited.has(current)) continue;
    visited.add(current);

    // Encontrar todos os nós que o current conecta
    edges
      .filter((e) => e.source === current)
      .forEach((e) => queue.push(e.target));
  }

  return false;
}

export default function PreventCycles() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { getEdges } = useReactFlow();

  const isValidConnection = useCallback(
    (connection) => {
      const { source, target } = connection;

      // Impede self-connection
      if (source === target) return false;

      // Impede ciclos
      return !hasCycle(target, source, getEdges());
    },
    [getEdges],
  );

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      isValidConnection={isValidConnection}
      fitView
    />
  );
}
```

---

### 5. Undo/Redo

**URL:** https://reactflow.dev/examples/interaction/undo-redo  
**Conceito:** Implementar undo/redo usando um histórico de estados do flow.

```jsx
import { useCallback, useEffect } from 'react';
import { useNodesState, useEdgesState } from '@xyflow/react';

// Hook customizado para histórico
function useUndoRedo({ maxHistorySize = 100 } = {}) {
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);
  const [nodes, setNodes] = useNodesState([]);
  const [edges, setEdges] = useEdgesState([]);

  const takeSnapshot = useCallback(() => {
    setHistory((prev) => [
      ...prev.slice(-maxHistorySize + 1),
      { nodes, edges },
    ]);
    setFuture([]);
  }, [nodes, edges, maxHistorySize]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setFuture((prev) => [{ nodes, edges }, ...prev]);
    setNodes(previous.nodes);
    setEdges(previous.edges);
  }, [history, nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, { nodes, edges }]);
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [future, nodes, edges, setNodes, setEdges]);

  return { nodes, edges, setNodes, setEdges, takeSnapshot, undo, redo, canUndo: history.length > 0, canRedo: future.length > 0 };
}
```

---

### 6. Copy/Paste

**URL:** https://reactflow.dev/examples/interaction/copy-paste  
**Conceito:** Copiar e colar nodes com `Ctrl+C` / `Ctrl+V`.

```jsx
import { useCallback, useEffect, useRef } from 'react';
import { useReactFlow, getNodesBounds } from '@xyflow/react';

function useCopyPaste() {
  const { getNodes, setNodes, getEdges, setEdges, screenToFlowPosition, getViewport } = useReactFlow();
  const bufferedNodes = useRef([]);
  const bufferedEdges = useRef([]);

  const copy = useCallback(() => {
    const selectedNodes = getNodes().filter((n) => n.selected);
    const selectedEdges = getEdges().filter(
      (e) =>
        e.selected ||
        (selectedNodes.some((n) => n.id === e.source) &&
          selectedNodes.some((n) => n.id === e.target)),
    );

    bufferedNodes.current = selectedNodes;
    bufferedEdges.current = selectedEdges;
  }, [getNodes, getEdges]);

  const paste = useCallback(
    (position) => {
      const nodes = bufferedNodes.current;
      const edges = bufferedEdges.current;

      if (!nodes.length) return;

      const bounds = getNodesBounds(nodes);
      const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };

      const idMap = {};
      const pastedNodes = nodes.map((n) => {
        const newId = `${n.id}-${Date.now()}`;
        idMap[n.id] = newId;
        return {
          ...n,
          id: newId,
          selected: true,
          position: {
            x: n.position.x - center.x + (position?.x ?? 0),
            y: n.position.y - center.y + (position?.y ?? 0),
          },
        };
      });

      const pastedEdges = edges.map((e) => ({
        ...e,
        id: `${e.id}-copy`,
        source: idMap[e.source] ?? e.source,
        target: idMap[e.target] ?? e.target,
      }));

      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), ...pastedNodes]);
      setEdges((eds) => [...eds.map((e) => ({ ...e, selected: false })), ...pastedEdges]);
    },
    [setNodes, setEdges],
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isCopy = (e.ctrlKey || e.metaKey) && e.key === 'c';
      const isPaste = (e.ctrlKey || e.metaKey) && e.key === 'v';
      if (isCopy) copy();
      if (isPaste) paste();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [copy, paste]);

  return { copy, paste };
}
```

---

### 7. Validation

**URL:** https://reactflow.dev/examples/interaction/validation  
**Conceito:** Validar conexões e dar feedback visual durante a conexão.

```jsx
import { Handle, Position } from '@xyflow/react';

// Node com handles que validam o tipo de conexão
function ValidatedNode({ data }) {
  const isValidConnection = useCallback(
    (connection) => connection.source !== connection.target,
    [],
  );

  return (
    <div>
      <Handle
        type="target"
        position={Position.Left}
        isValidConnection={isValidConnection}
        // Aceita apenas handles com tipo 'number'
        onConnect={(params) => console.log('conectado', params)}
      />
      <div>{data.label}</div>
      <Handle
        type="source"
        position={Position.Right}
        id="a"
        isValidConnection={(connection) => {
          // Lógica customizada por handle
          return connection.targetHandle === 'b';
        }}
      />
    </div>
  );
}
```

---

## Exemplos — Subflows & Grouping

### 1. Sub Flows

**URL:** https://reactflow.dev/examples/grouping/sub-flows  
**Conceito:** Nodes filhos contidos dentro de um node pai.

```jsx
// Node pai (group node)
const groupNode = {
  id: 'group-1',
  type: 'group',
  position: { x: 50, y: 50 },
  style: {
    width: 400,
    height: 200,
    backgroundColor: 'rgba(208, 192, 247, 0.2)',
    border: '1px solid #9747ff',
    borderRadius: 8,
  },
  data: {},
};

// Node filho — usa parentId para ser contido no grupo
const childNode = {
  id: 'child-1',
  parentId: 'group-1',
  extent: 'parent', // impede arrastar para fora do pai
  position: { x: 50, y: 50 }, // posição RELATIVA ao pai
  data: { label: 'Node filho' },
};
```

```jsx
// App.jsx
const initialNodes = [
  {
    id: 'group-1',
    type: 'group',
    position: { x: 50, y: 50 },
    style: { width: 400, height: 200, backgroundColor: 'rgba(208, 192, 247, 0.2)' },
    data: {},
  },
  {
    id: '1',
    parentId: 'group-1',
    position: { x: 50, y: 50 },
    extent: 'parent',
    data: { label: 'Child Node' },
  },
  {
    id: '2',
    parentId: 'group-1',
    position: { x: 220, y: 50 },
    extent: 'parent',
    data: { label: 'Another Child' },
  },
];
```

---

### 2. Selection Grouping

**URL:** https://reactflow.dev/examples/grouping/selection-grouping  
**Conceito:** Agrupar nodes selecionados dinamicamente.

```jsx
import { useReactFlow, getNodesBounds, useNodesState } from '@xyflow/react';

function useGroupNodes() {
  const { getNodes, setNodes } = useReactFlow();
  const padding = 25;

  const groupSelectedNodes = useCallback(() => {
    const selectedNodes = getNodes().filter((n) => n.selected && !n.parentId);
    if (selectedNodes.length < 2) return;

    const bounds = getNodesBounds(selectedNodes);
    const groupId = `group-${Date.now()}`;

    const groupNode = {
      id: groupId,
      type: 'group',
      position: { x: bounds.x - padding, y: bounds.y - padding },
      style: {
        width: bounds.width + padding * 2,
        height: bounds.height + padding * 2,
        backgroundColor: 'rgba(0, 0, 255, 0.05)',
        border: '1px dashed #0000ff',
      },
      data: {},
    };

    const updatedNodes = selectedNodes.map((node) => ({
      ...node,
      parentId: groupId,
      extent: 'parent',
      position: {
        x: node.position.x - bounds.x + padding,
        y: node.position.y - bounds.y + padding,
      },
    }));

    setNodes((nds) => {
      const nonSelected = nds.filter((n) => !n.selected || n.parentId);
      return [groupNode, ...nonSelected, ...updatedNodes];
    });
  }, [getNodes, setNodes]);

  return { groupSelectedNodes };
}
```

---

## Exemplos — Layout

### 1. Dagre (Auto Layout)

**URL:** https://reactflow.dev/examples/layout/dagre  
**Conceito:** Layout automático usando a biblioteca `dagre`.

```bash
npm install dagre
```

```jsx
import dagre from 'dagre';
import { Position } from '@xyflow/react';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 172;
const nodeHeight = 36;

const getLayoutedElements = (nodes, edges, direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

// Uso
const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
  initialNodes,
  initialEdges,
  'TB', // Top-Bottom | 'LR' = Left-Right
);
```

```jsx
export default function LayoutFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  const onLayout = useCallback(
    (direction) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, direction);
      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
    },
    [nodes, edges],
  );

  return (
    <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} fitView>
      <Panel position="top-right">
        <button onClick={() => onLayout('TB')}>Vertical</button>
        <button onClick={() => onLayout('LR')}>Horizontal</button>
      </Panel>
    </ReactFlow>
  );
}
```

---

### 2. ELK.js

**URL:** https://reactflow.dev/examples/layout/elkjs  
**Conceito:** Layout mais sofisticado com ELK.js (Eclipse Layout Kernel).

```bash
npm install elkjs web-worker
```

```jsx
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

const elkOptions = {
  'elk.algorithm': 'layered',
  'elk.layered.spacing.nodeNodeBetweenLayers': '100',
  'elk.spacing.nodeNode': '80',
};

async function getLayoutedElements(nodes, edges, options = {}) {
  const isHorizontal = options?.['elk.direction'] === 'RIGHT';

  const graph = {
    id: 'root',
    layoutOptions: options,
    children: nodes.map((node) => ({
      ...node,
      targetPosition: isHorizontal ? 'left' : 'top',
      sourcePosition: isHorizontal ? 'right' : 'bottom',
      width: 150,
      height: 50,
    })),
    edges: edges.map((edge) => ({
      ...edge,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const layoutedGraph = await elk.layout(graph);

  return {
    nodes: layoutedGraph.children.map((node) => ({
      ...node,
      position: { x: node.x, y: node.y },
    })),
    edges: layoutedGraph.edges,
  };
}
```

---

### 3. Expand/Collapse

**URL:** https://reactflow.dev/examples/layout/expand-collapse  
**Conceito:** Expandir e colapsar subgrafos clicando em nodes.

```jsx
// Node com botão de toggle
function CollapsibleNode({ id, data }) {
  const { setNodes, setEdges } = useReactFlow();

  const toggleCollapse = useCallback(() => {
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id === id) {
          return { ...n, data: { ...n.data, collapsed: !n.data.collapsed } };
        }
        // Esconder/mostrar filhos
        if (n.data.parentNode === id) {
          return { ...n, hidden: !n.data.collapsed };
        }
        return n;
      }),
    );
    setEdges((eds) =>
      eds.map((e) => {
        if (e.source === id || e.target === id) {
          // Lógica para esconder edges dos filhos
        }
        return e;
      }),
    );
  }, [id, setNodes, setEdges]);

  return (
    <div>
      <Handle type="target" position={Position.Top} />
      <div>{data.label}</div>
      <button onClick={toggleCollapse}>
        {data.collapsed ? '▶ Expandir' : '▼ Colapsar'}
      </button>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

---

## Exemplos — Styling

### 1. Dark Mode

**URL:** https://reactflow.dev/examples/styling/dark-mode

```jsx
// Via prop colorMode
<ReactFlow colorMode="dark" />
<ReactFlow colorMode="light" />
<ReactFlow colorMode="system" /> // segue preferência do sistema
```

```jsx
// Toggle programático
const [colorMode, setColorMode] = useState('light');

<ReactFlow colorMode={colorMode}>
  <Panel>
    <button onClick={() => setColorMode(colorMode === 'light' ? 'dark' : 'light')}>
      {colorMode === 'light' ? '🌙 Dark' : '☀️ Light'}
    </button>
  </Panel>
</ReactFlow>
```

```css
/* CSS Variables do React Flow para customização */
.react-flow {
  --xy-background-color: #1a1a2e;
  --xy-node-background-color: #16213e;
  --xy-node-border-color: #0f3460;
  --xy-node-color: #eaeaea;
  --xy-edge-stroke: #a0a0a0;
  --xy-minimap-background-color: #0f3460;
  --xy-controls-button-background-color: #16213e;
  --xy-controls-button-color: #eaeaea;
}
```

---

### 2. Tailwind

**URL:** https://reactflow.dev/examples/styling/tailwind

```bash
npm install tailwindcss
```

```jsx
// Node com Tailwind
function TailwindNode({ data }) {
  return (
    <div className="rounded-xl border-2 border-blue-500 bg-white p-4 shadow-lg">
      <Handle type="target" position={Position.Left} className="!bg-blue-500" />
      <p className="text-sm font-semibold text-gray-700">{data.label}</p>
      <Handle type="source" position={Position.Right} className="!bg-blue-500" />
    </div>
  );
}
```

```js
// tailwind.config.js — importante incluir os arquivos do React Flow
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/@xyflow/react/dist/**/*.{js,jsx}',
  ],
};
```

---

### 3. Base Style / Utility Classes

O React Flow fornece classes CSS utilitárias que podem ser aplicadas a elementos dentro dos nodes:

| Classe | Descrição |
|--------|-----------|
| `nodrag` | Impede que o elemento inicie drag no node |
| `nopan` | Impede que o elemento inicie pan no canvas |
| `nowheel` | Impede que scroll do mouse no elemento afete o zoom |

```jsx
// Exemplos de uso
<div className="nodrag">Não arrasta o node</div>
<input className="nodrag nopan" />
<div className="nowheel" style={{ overflow: 'auto', height: 200 }}>
  Scroll interno sem afetar zoom
</div>
```

---

## Exemplos — Whiteboard

### 1. Freehand Draw

**URL:** https://reactflow.dev/examples/whiteboard/freehand-draw

```jsx
// Usar SVG path para desenho livre
import { useCallback, useRef, useState } from 'react';
import { useReactFlow, Panel } from '@xyflow/react';

function useDrawing() {
  const { screenToFlowPosition } = useReactFlow();
  const [paths, setPaths] = useState([]);
  const currentPath = useRef([]);
  const isDrawing = useRef(false);

  const startDrawing = useCallback((event) => {
    isDrawing.current = true;
    const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    currentPath.current = [pos];
  }, [screenToFlowPosition]);

  const draw = useCallback((event) => {
    if (!isDrawing.current) return;
    const pos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
    currentPath.current.push(pos);

    // Atualizar o path sendo desenhado (preview)
    setPaths((prev) => {
      const withoutLast = prev.slice(0, -1);
      return [...withoutLast, currentPath.current];
    });
  }, [screenToFlowPosition]);

  const stopDrawing = useCallback(() => {
    if (isDrawing.current && currentPath.current.length > 1) {
      setPaths((prev) => [...prev, currentPath.current]);
    }
    isDrawing.current = false;
    currentPath.current = [];
  }, []);

  return { paths, startDrawing, draw, stopDrawing };
}
```

---

## Exemplos — Misc

### 1. Download Image

**URL:** https://reactflow.dev/examples/misc/download-image

```jsx
import { getNodesBounds, getViewportForBounds, useReactFlow } from '@xyflow/react';
import { toPng } from 'html-to-image';

function downloadImage(dataUrl) {
  const a = document.createElement('a');
  a.setAttribute('download', 'reactflow.png');
  a.setAttribute('href', dataUrl);
  a.click();
}

const imageWidth = 1024;
const imageHeight = 768;

export default function DownloadButton() {
  const { getNodes } = useReactFlow();

  const onClick = () => {
    const nodesBounds = getNodesBounds(getNodes());
    const viewport = getViewportForBounds(
      nodesBounds,
      imageWidth,
      imageHeight,
      0.5,
      2,
      0.1,
    );

    toPng(document.querySelector('.react-flow__viewport'), {
      backgroundColor: '#ffffff',
      width: imageWidth,
      height: imageHeight,
      style: {
        width: imageWidth,
        height: imageHeight,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    }).then(downloadImage);
  };

  return <button onClick={onClick}>📥 Download PNG</button>;
}
```

---

## API Reference — Componentes Principais

### `<ReactFlow />`

Componente principal que renderiza o canvas.

### `<Background />`

```jsx
import { Background, BackgroundVariant } from '@xyflow/react';

<Background
  variant={BackgroundVariant.Dots}   // 'dots' | 'lines' | 'cross'
  gap={16}                            // espaço entre elementos
  size={1}                            // tamanho dos elementos
  color="#e0e0e0"                     // cor
  style={{}}
/>
```

### `<Controls />`

```jsx
import { Controls, ControlButton } from '@xyflow/react';

<Controls
  position="bottom-left"
  showZoom={true}
  showFitView={true}
  showInteractive={true}
  onZoomIn={() => {}}
  onZoomOut={() => {}}
  onFitView={() => {}}
>
  {/* Botões customizados */}
  <ControlButton onClick={() => alert('ação')} title="Ação customizada">
    ⭐
  </ControlButton>
</Controls>
```

### `<MiniMap />`

```jsx
import { MiniMap } from '@xyflow/react';

<MiniMap
  position="bottom-right"
  nodeColor={(node) => {
    if (node.type === 'input') return '#0041d0';
    if (node.type === 'output') return '#ff0072';
    return '#ffffff';
  }}
  nodeStrokeColor="#555"
  nodeStrokeWidth={3}
  nodeBorderRadius={2}
  maskColor="rgba(0,0,0,0.1)"
  pannable={true}   // permite pan no minimap
  zoomable={true}   // permite zoom no minimap
  inversePan={false}
/>
```

### `<Panel />`

```jsx
import { Panel } from '@xyflow/react';

// Posições: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
<Panel position="top-right">
  <button>Ação</button>
</Panel>
```

### `<Handle />`

```jsx
import { Handle, Position } from '@xyflow/react';

<Handle
  type="source"                    // 'source' | 'target'
  position={Position.Right}        // 'top' | 'right' | 'bottom' | 'left'
  id="handle-a"                    // ID para múltiplos handles no mesmo node
  style={{ background: '#555' }}
  isConnectable={true}
  isConnectableStart={true}        // pode iniciar conexão
  isConnectableEnd={true}          // pode receber conexão
  isValidConnection={(connection) => true}
  onConnect={(params) => {}}
/>
```

### `<NodeResizer />`

```jsx
import { NodeResizer } from '@xyflow/react';

// Dentro de um custom node
<NodeResizer
  color="#ff0071"
  isVisible={selected}
  minWidth={100}
  minHeight={30}
  maxWidth={500}
  maxHeight={400}
  onResize={(event, { width, height }) => {}}
  onResizeStart={(event, params) => {}}
  onResizeEnd={(event, params) => {}}
  handleStyle={{ background: '#ff0071' }}
  lineStyle={{ border: '2px solid #ff0071' }}
/>
```

### `<NodeToolbar />`

```jsx
import { NodeToolbar, Position } from '@xyflow/react';

// Dentro de um custom node
<NodeToolbar
  isVisible={selected}          // ou força sempre visível
  position={Position.Top}
  offset={10}
  align="center"               // 'start' | 'center' | 'end'
>
  <button>Editar</button>
  <button>Deletar</button>
</NodeToolbar>
```

### `<EdgeLabelRenderer />`

Permite renderizar HTML dentro de edges usando portal.

```jsx
import { EdgeLabelRenderer } from '@xyflow/react';

// Dentro de um componente de edge customizado
<EdgeLabelRenderer>
  <div
    style={{
      position: 'absolute',
      transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
      pointerEvents: 'all',
    }}
    className="nodrag nopan"
  >
    Conteúdo HTML aqui
  </div>
</EdgeLabelRenderer>
```

### `<BaseEdge />`

Componente base para edges customizadas.

```jsx
import { BaseEdge } from '@xyflow/react';

// Dentro de um componente de edge customizado
<BaseEdge
  id={id}
  path={edgePath}          // string do SVG path
  markerStart={markerStart}
  markerEnd={markerEnd}
  style={style}
  label={label}
  labelX={labelX}
  labelY={labelY}
  interactionWidth={20}    // área de clique
/>
```

### `<ReactFlowProvider />`

Necessário quando se usa hooks do React Flow fora do componente `<ReactFlow />`.

```jsx
import { ReactFlowProvider } from '@xyflow/react';

export default function App() {
  return (
    <ReactFlowProvider>
      <MyFlowComponent />
      <AnotherComponentUsingHooks /> {/* pode usar hooks aqui */}
    </ReactFlowProvider>
  );
}
```

---

## API Reference — Hooks

### `useReactFlow()`

Hook principal que retorna a instância do React Flow com todos os métodos.

```js
const {
  // Getters
  getNodes,          // () => Node[]
  getNode,           // (id: string) => Node | undefined
  getEdges,          // () => Edge[]
  getEdge,           // (id: string) => Edge | undefined
  getIntersectingNodes, // (node, partially?) => Node[]
  isNodeIntersecting,   // (node, area, partially?) => boolean

  // Setters de nodes
  setNodes,          // (nodes | updater) => void
  addNodes,          // (nodes) => void
  updateNode,        // (id, data | updater, options?) => void
  updateNodeData,    // (id, data | updater, options?) => void
  deleteElements,    // ({ nodes?, edges? }) => { deletedNodes, deletedEdges }

  // Setters de edges
  setEdges,          // (edges | updater) => void
  addEdges,          // (edges) => void
  updateEdge,        // DEPRECATED, use reconnectEdge util
  updateEdgeData,    // (id, data | updater, options?) => void

  // Viewport
  setViewport,       // (viewport, options?) => void
  getViewport,       // () => Viewport
  fitView,           // (options?) => Promise<boolean>
  fitBounds,         // (bounds, options?) => void
  zoomIn,            // (options?) => void
  zoomOut,           // (options?) => void
  zoomTo,            // (zoomLevel, options?) => void

  // Coordenadas
  screenToFlowPosition, // ({ x, y }) => { x, y }  (canvas coords)
  flowToScreenPosition, // ({ x, y }) => { x, y }  (screen coords)

  // Outros
  toObject,          // () => { nodes, edges, viewport }
  viewportInitialized, // boolean
} = useReactFlow();
```

---

### `useNodesState(initialNodes)`

```js
const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

// setNodes aceita array ou função updater
setNodes([...newNodes]);
setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));

// onNodesChange — passa para o prop onNodesChange do ReactFlow
<ReactFlow onNodesChange={onNodesChange} />
```

---

### `useEdgesState(initialEdges)`

```js
const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
```

---

### `useNodes()`

Retorna os nodes do store (somente leitura, reativo).

```js
const nodes = useNodes();
```

---

### `useEdges()`

```js
const edges = useEdges();
```

---

### `useViewport()`

```js
const { x, y, zoom } = useViewport();
```

---

### `useConnection()`

Retorna o estado da conexão ativa (durante drag de handle).

```js
const connection = useConnection();
// connection.isConnecting — boolean
// connection.fromNode — Node
// connection.fromHandle — Handle
// connection.toNode — Node | null
// connection.toHandle — Handle | null
```

---

### `useHandleConnections({ type, id?, nodeId? })`

```js
// Dentro de um custom node
const connections = useHandleConnections({
  type: 'target',       // 'source' | 'target'
  id: 'handle-a',       // opcional, ID do handle
});
// connections: HandleConnection[]
```

---

### `useNodeConnections({ type?, handleType?, handleId? })`

```js
const connections = useNodeConnections({ type: 'target' });
```

---

### `useNodesData(nodeId | nodeIds)`

Subscreve apenas aos dados de nodes específicos (mais performático que `useNodes`).

```js
// Um node
const nodeData = useNodesData('node-1');

// Múltiplos nodes
const nodesData = useNodesData(['node-1', 'node-2']);
```

---

### `useKeyPress(keyCode, options?)`

```js
const spacePressed = useKeyPress('Space');
const ctrlZ = useKeyPress(['Meta+z', 'Control+z']);
const deletePressed = useKeyPress(['Delete', 'Backspace']);
```

---

### `useOnSelectionChange({ onChange })`

```js
useOnSelectionChange({
  onChange: ({ nodes, edges }) => {
    console.log('selecionados:', nodes, edges);
  },
});
```

---

### `useOnViewportChange({ onStart?, onChange?, onEnd? })`

```js
useOnViewportChange({
  onStart: (viewport) => console.log('viewport mudou', viewport),
  onChange: (viewport) => console.log('mudando', viewport),
  onEnd: (viewport) => console.log('fim da mudança', viewport),
});
```

---

### `useUpdateNodeInternals()`

Necessário após mudanças nos handles de um node customizado.

```js
const updateNodeInternals = useUpdateNodeInternals();

// Após adicionar/remover handles dinamicamente
updateNodeInternals('node-id');
// ou múltiplos
updateNodeInternals(['node-1', 'node-2']);
```

---

### `useNodeId()`

Retorna o ID do node atual (apenas dentro de custom nodes).

```js
function CustomNode() {
  const nodeId = useNodeId(); // ID deste node
}
```

---

### `useNodesInitialized(options?)`

```js
const initialized = useNodesInitialized({
  includeHiddenNodes: false, // padrão false
});
```

---

### `useStore(selector)` / `useStoreApi()`

Acesso direto ao store interno do React Flow (uso avançado).

```js
// useStore — subscreve a estado específico
const nodeCount = useStore((state) => state.nodes.length);

// useStoreApi — acesso ao store sem re-render
const { getState, setState, subscribe } = useStoreApi();
const nodes = getState().nodes;
```

---

## API Reference — Utils

### `addEdge(connection, edges)`

```js
import { addEdge } from '@xyflow/react';

const onConnect = (params) => {
  setEdges((eds) => addEdge(params, eds));
};

// Com opções adicionais
setEdges((eds) => addEdge({ ...params, animated: true, type: 'smoothstep' }, eds));
```

---

### `reconnectEdge(oldEdge, newConnection, edges)`

```js
import { reconnectEdge } from '@xyflow/react';

const onReconnect = (oldEdge, newConnection) => {
  setEdges((els) => reconnectEdge(oldEdge, newConnection, els));
};
```

---

### `applyNodeChanges(changes, nodes)`

```js
import { applyNodeChanges } from '@xyflow/react';

const onNodesChange = (changes) => {
  setNodes((nds) => applyNodeChanges(changes, nds));
};
```

---

### `applyEdgeChanges(changes, edges)`

```js
import { applyEdgeChanges } from '@xyflow/react';

const onEdgesChange = (changes) => {
  setEdges((eds) => applyEdgeChanges(changes, eds));
};
```

---

### `getConnectedEdges(nodes, edges)`

```js
import { getConnectedEdges } from '@xyflow/react';

const connectedEdges = getConnectedEdges([node], edges);
// Retorna todas as edges conectadas a qualquer um dos nodes fornecidos
```

---

### `getIncomers(node, nodes, edges)`

```js
import { getIncomers } from '@xyflow/react';

const incomers = getIncomers(node, nodes, edges);
// Retorna nodes que têm edges com target === node.id
```

---

### `getOutgoers(node, nodes, edges)`

```js
import { getOutgoers } from '@xyflow/react';

const outgoers = getOutgoers(node, nodes, edges);
// Retorna nodes que têm edges com source === node.id
```

---

### `getNodesBounds(nodes)`

```js
import { getNodesBounds } from '@xyflow/react';

const bounds = getNodesBounds(nodes);
// { x, y, width, height }
```

---

### `getViewportForBounds(bounds, imageWidth, imageHeight, minZoom, maxZoom, padding)`

```js
import { getViewportForBounds } from '@xyflow/react';

const viewport = getViewportForBounds(bounds, 1024, 768, 0.5, 2, 0.1);
// { x, y, zoom }
```

---

### `getBezierPath(options)`

```js
import { getBezierPath } from '@xyflow/react';

const [edgePath, labelX, labelY, offsetX, offsetY] = getBezierPath({
  sourceX,
  sourceY,
  sourcePosition,
  targetX,
  targetY,
  targetPosition,
  curvature: 0.25,
});
```

---

### `getSmoothStepPath(options)`

```js
import { getSmoothStepPath } from '@xyflow/react';

const [edgePath, labelX, labelY] = getSmoothStepPath({
  sourceX, sourceY, sourcePosition,
  targetX, targetY, targetPosition,
  borderRadius: 5,
  offset: 20,
  centerX,
  centerY,
});
```

---

### `getStraightPath(options)`

```js
import { getStraightPath } from '@xyflow/react';

const [edgePath, labelX, labelY] = getStraightPath({
  sourceX, sourceY,
  targetX, targetY,
});
```

---

### `getSimpleBezierPath(options)`

```js
import { getSimpleBezierPath } from '@xyflow/react';

const [edgePath, labelX, labelY] = getSimpleBezierPath({
  sourceX, sourceY, sourcePosition,
  targetX, targetY, targetPosition,
});
```

---

### `isNode(element)` / `isEdge(element)`

```js
import { isNode, isEdge } from '@xyflow/react';

if (isNode(element)) { /* é um node */ }
if (isEdge(element)) { /* é uma edge */ }
```

---

## API Reference — Types

### NodeProps (props de custom nodes)

```ts
type NodeProps<T = Record<string, unknown>> = {
  id: string;
  data: T;
  type?: string;
  selected: boolean;
  isConnectable: boolean;
  zIndex: number;
  positionAbsoluteX: number;
  positionAbsoluteY: number;
  dragging: boolean;
  targetPosition?: Position;
  sourcePosition?: Position;
  width?: number;
  height?: number;
  parentId?: string;
  dragHandle?: string;
};
```

---

### EdgeProps (props de custom edges)

```ts
type EdgeProps<T = Record<string, unknown>> = {
  id: string;
  source: string;
  target: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  sourceHandleId?: string;
  targetHandleId?: string;
  data?: T;
  type?: string;
  animated?: boolean;
  selected?: boolean;
  label?: string | ReactNode;
  labelStyle?: CSSProperties;
  labelShowBg?: boolean;
  labelBgStyle?: CSSProperties;
  labelBgPadding?: [number, number];
  labelBgBorderRadius?: number;
  style?: CSSProperties;
  markerStart?: string;
  markerEnd?: string;
  pathOptions?: unknown;
  interactionWidth?: number;
};
```

---

### Position

```ts
enum Position {
  Left = 'left',
  Top = 'top',
  Right = 'right',
  Bottom = 'bottom',
}
```

---

### MarkerType

```ts
enum MarkerType {
  Arrow = 'arrow',
  ArrowClosed = 'arrowclosed',
}
```

---

### ConnectionMode

```ts
enum ConnectionMode {
  Strict = 'strict', // source→target apenas
  Loose = 'loose',   // qualquer handle pode conectar
}
```

---

### Viewport

```ts
type Viewport = {
  x: number;
  y: number;
  zoom: number;
};
```

---

### Connection

```ts
type Connection = {
  source: string;
  target: string;
  sourceHandle: string | null;
  targetHandle: string | null;
};
```

---

### ReactFlowInstance

Retornado por `useReactFlow()` ou pela prop `onInit`.

```ts
type ReactFlowInstance = {
  // Getters
  getNodes: () => Node[];
  getEdges: () => Edge[];
  getNode: (id: string) => Node | undefined;
  getEdge: (id: string) => Edge | undefined;
  getViewport: () => Viewport;

  // Setters
  setNodes: (nodes: Node[] | ((nodes: Node[]) => Node[])) => void;
  setEdges: (edges: Edge[] | ((edges: Edge[]) => Edge[])) => void;
  addNodes: (nodes: Node | Node[]) => void;
  addEdges: (edges: Edge | Edge[]) => void;
  updateNode: (id: string, nodeUpdate, options?) => void;
  updateNodeData: (id: string, dataUpdate, options?) => void;
  deleteElements: (params) => Promise<{...}>;

  // Viewport
  setViewport: (viewport: Viewport, options?) => void;
  fitView: (options?) => Promise<boolean>;
  fitBounds: (bounds, options?) => void;
  zoomIn: (options?) => void;
  zoomOut: (options?) => void;
  zoomTo: (zoomLevel, options?) => void;

  // Coordenadas
  screenToFlowPosition: (position) => XYPosition;
  flowToScreenPosition: (position) => XYPosition;

  // Interseção
  getIntersectingNodes: (node, partially?) => Node[];
  isNodeIntersecting: (node, area, partially?) => boolean;

  // Serialização
  toObject: () => ReactFlowJsonObject;

  viewportInitialized: boolean;
};
```

---

## UI Components (React Flow UI)

Componentes prontos para uso disponíveis em `@xyflow/react` UI.

### Templates

| Template | URL |
|----------|-----|
| AI Workflow Editor | https://reactflow.dev/ui/templates/ai-workflow-editor |
| Workflow Editor | https://reactflow.dev/ui/templates/workflow-editor |

### Node Utilities

| Componente | Descrição |
|------------|-----------|
| `BaseNode` | Node base com estilo padrão |
| `StatusIndicator` | Indicador de status (ok/warning/error) |
| `NodeAppendix` | Seção extra abaixo do node |
| `NodeTooltip` | Tooltip ao hover |

### Custom Nodes

| Componente | Descrição |
|------------|-----------|
| `DatabaseSchemaNode` | Node estilo schema de banco |
| `PlaceholderNode` | Node placeholder com botão "+" |
| `LabeledGroupNode` | Grupo com label |

### Handles

| Componente | Descrição |
|------------|-----------|
| `BaseHandle` | Handle com estilo base |
| `LabeledHandle` | Handle com label |
| `ButtonHandle` | Handle com botão de ação |

### Custom Edges

| Componente | Descrição |
|------------|-----------|
| `ButtonEdge` | Edge com botão de deletar |
| `DataEdge` | Edge que exibe dados |
| `AnimatedSVGEdge` | Edge com animação SVG |

### Controls

| Componente | Descrição |
|------------|-----------|
| `NodeSearch` | Campo de busca de nodes |
| `ZoomSlider` | Slider de zoom |
| `ZoomSelect` | Select de nível de zoom |

### Misc

| Componente | Descrição |
|------------|-----------|
| `DevTools` | Ferramentas de desenvolvimento |

---

## Padrões e Boas Práticas

### 1. Definir nodeTypes/edgeTypes fora do componente

```jsx
// ✅ CORRETO — fora do componente ou com useMemo
const nodeTypes = { custom: CustomNode };
const edgeTypes = { custom: CustomEdge };

function Flow() {
  return <ReactFlow nodeTypes={nodeTypes} edgeTypes={edgeTypes} />;
}

// ❌ ERRADO — recria o objeto a cada render, causando re-mounts
function Flow() {
  const nodeTypes = { custom: CustomNode }; // NÃO FAÇA ISSO
  return <ReactFlow nodeTypes={nodeTypes} />;
}
```

### 2. Memoizar custom nodes e edges

```jsx
import { memo } from 'react';

const CustomNode = memo(({ data }) => {
  return <div>{data.label}</div>;
});

export default CustomNode;
```

### 3. Usar useCallback em callbacks

```jsx
const onConnect = useCallback(
  (params) => setEdges((eds) => addEdge(params, eds)),
  [], // dependências vazias se não usa variáveis externas
);
```

### 4. Precisão de IDs únicos

```jsx
// Use nanoid, uuid, ou Date.now() para IDs únicos
import { nanoid } from 'nanoid';
const newNode = { id: nanoid(), position, data };
```

### 5. Container com dimensões explícitas

```jsx
// O container pai PRECISA ter width e height
<div style={{ width: '100%', height: '100vh' }}>
  <ReactFlow ... />
</div>
```

### 6. Usar ReactFlowProvider para acesso de hooks fora do canvas

```jsx
<ReactFlowProvider>
  <Sidebar /> {/* Pode usar useReactFlow() aqui */}
  <ReactFlow ... />
</ReactFlowProvider>
```

### 7. Classes utilitárias em elementos interativos

```jsx
// Dentro de nodes: use nodrag e nopan em elementos interativos
<button className="nodrag nopan" onClick={handleClick}>
  Clique aqui
</button>
<input className="nodrag nopan" type="text" />
```

---

## Referências Rápidas

| O que fazer | Solução |
|-------------|---------|
| Converter coords de tela → canvas | `screenToFlowPosition({ x, y })` |
| Serializar o flow | `toObject()` → `{ nodes, edges, viewport }` |
| Ajustar viewport para mostrar todos os nodes | `fitView()` |
| Obter todos os nodes selecionados | `getNodes().filter(n => n.selected)` |
| Atualizar dados de um node específico | `updateNodeData(id, newData)` |
| Deletar nodes e edges programaticamente | `deleteElements({ nodes: [...], edges: [...] })` |
| Detectar se dois nodes se intersectam | `isNodeIntersecting(node, bounds)` |
| Obter bounds de um conjunto de nodes | `getNodesBounds(nodes)` |
| Criar edge ao soltar conexão | `onConnectEnd` + `connectionState.isValid` |
| Edge não deletar quando reconectar em área vazia | `onReconnectEnd` + flag ref |
| Reconectar edge | `reconnectEdge(oldEdge, newConnection, edges)` |
| Node filho dentro de outro | `parentId` + `extent: 'parent'` |
| Layout automático | dagre, elkjs, ou `autoLayout` |
| Download como imagem | `getNodesBounds` + `html-to-image` |
