# Guia: Estabilidade e Comportamento de Arrastar no ReactFlow (Lovable + Supabase)

## 1. Problemas Comuns de Desconfiguração de Layout

### Causa Principal
O ReactFlow recalcula posições ao re-renderizar quando o estado muda. Isso acontece especialmente quando:
- Nós são gerados por IA e chegam sem posições `x/y` definidas
- O `fitView` dispara após carregamento assíncrono
- O Supabase retorna os dados em ordem diferente a cada fetch

### Solução: Sempre persistir posições no Supabase

Adicione colunas `position_x` e `position_y` na tabela de nós:

```sql
ALTER TABLE nodes ADD COLUMN position_x FLOAT DEFAULT 0;
ALTER TABLE nodes ADD COLUMN position_y FLOAT DEFAULT 0;
```

Salve a posição sempre que um nó for movido:

```ts
const onNodeDragStop = useCallback((_, node) => {
  supabase
    .from('nodes')
    .update({ position_x: node.position.x, position_y: node.position.y })
    .eq('id', node.id);
}, []);
```

---

## 2. Evitar Layout Desconfigurado ao Gerar com IA

Quando a IA gerar nós, force um layout automático **uma única vez** e salve as posições resultantes imediatamente:

```ts
import dagre from 'dagre';

function applyDagreLayout(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 80, nodesep: 40 });

  nodes.forEach((n) => g.setNode(n.id, { width: 160, height: 40 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return { ...n, position: { x: pos.x - 80, y: pos.y - 20 } };
  });
}
```

Após aplicar, salve todas as posições no Supabase em batch antes de exibir.

---

## 3. Comportamento Customizado de Arrastar

### Objetivo
- **Arrastar + soltar próximo a um nó** → reassociar o nó arrastado como filho daquele nó
- **Arrastar + soltar longe de todos** → criar novo filho do nó raiz (principal)

### Implementação

```tsx
const PROXIMITY_THRESHOLD = 100; // px

const onNodeDragStop = useCallback((event, draggedNode) => {
  const otherNodes = nodes.filter((n) => n.id !== draggedNode.id);

  // Encontra o nó mais próximo
  let closest = null;
  let minDist = Infinity;

  otherNodes.forEach((n) => {
    const dx = n.position.x - draggedNode.position.x;
    const dy = n.position.y - draggedNode.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      closest = n;
    }
  });

  if (minDist < PROXIMITY_THRESHOLD && closest) {
    // Reassociar: atualizar aresta no Supabase
    supabase
      .from('edges')
      .delete()
      .eq('target', draggedNode.id)
      .then(() => {
        supabase.from('edges').insert({
          source: closest.id,
          target: draggedNode.id,
        });
      });
  } else {
    // Longe de todos: criar novo filho do nó raiz
    const rootNode = nodes.find((n) => n.data?.isRoot);
    if (rootNode) {
      supabase.from('edges').delete().eq('target', draggedNode.id).then(() => {
        supabase.from('edges').insert({
          source: rootNode.id,
          target: draggedNode.id,
        });
      });
    }
  }

  // Sempre salvar posição final
  supabase
    .from('nodes')
    .update({ position_x: draggedNode.position.x, position_y: draggedNode.position.y })
    .eq('id', draggedNode.id);
}, [nodes]);
```

### Marcar o nó raiz

Ao criar o mapa mental, marque o nó central com `is_root = true` no Supabase:

```sql
ALTER TABLE nodes ADD COLUMN is_root BOOLEAN DEFAULT FALSE;
```

---

## 4. Configuração Recomendada do `<ReactFlow />`

```tsx
<ReactFlow
  nodes={nodes}
  edges={edges}
  onNodeDragStop={onNodeDragStop}
  nodesDraggable={true}
  fitView={false}          // Desativar fitView automático após o primeiro load
  snapToGrid={true}
  snapGrid={[20, 20]}      // Grid ajuda a manter alinhamento visual
>
  <Controls />
  <Background />
</ReactFlow>
```

> **Importante:** Use `fitView={false}` após o layout inicial já estar salvo no banco. Só ative `fitView` no primeiro carregamento quando não houver posições salvas.

---

## 5. Checklist Rápido

- [ ] Colunas `position_x` e `position_y` na tabela de nós
- [ ] `onNodeDragStop` salva posição no Supabase
- [ ] Layout dagre aplicado **uma vez** na geração por IA, com posições salvas em seguida
- [ ] `fitView={false}` no componente ReactFlow (exceto na inicialização sem posições)
- [ ] Coluna `is_root` para identificar o nó central
- [ ] Lógica de proximidade no `onNodeDragStop` para reassociação e criação de filhos
