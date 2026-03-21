# APROVADO — Refatoração Nativa React Flow
**Status:** ✅ Aprovado para implementação  
**Credenciais de teste:** newlinetecno@gmail.com / 123456  
**Data:** 21/03/2026

---

## O que o agente diagnosticou corretamente

O diagnóstico está preciso. O bug da hitbox ocorre porque `border`, `background`,
`borderRadius` e `shadow` estão sendo aplicados **dentro do JSX** dos CustomNodes
via classes Tailwind (`bg-blue-50`, `border-2`, `rounded-xl`, `shadow-sm`).

Quando o ELK ou o React Flow fixam `width/height` no wrapper `.react-flow__node`,
a div interna com CSS Tailwind excede esses limites se não houver `box-sizing: border-box`
estrito — resultando em handles desalinhados e "pontos mortos" no drag.

A estratégia proposta está correta: mover toda estética exterior para `node.style`,
limpar o JSX interno, e garantir `box-sizing: border-box` no wrapper do RF.

---

## Arquivos a modificar (confirmados)

| Arquivo | Ação | Responsável |
|---|---|---|
| `src/lib/nodeStyles.ts` | CRIAR | `frontend-specialist` |
| `src/data/templates.ts` | MODIFICAR | `frontend-specialist` |
| `src/components/editor/DiagramEditorCore.tsx` | MODIFICAR | `frontend-specialist` |
| `src/pages/DiagramEditor.tsx` | MODIFICAR | `frontend-specialist` |
| Todos os `*Node.tsx` (7 arquivos) | MODIFICAR | `frontend-specialist` |
| `src/index.css` | MODIFICAR | `frontend-specialist` |
| `src/lib/diagramUtils.ts` | LIMPAR | `code-archaeologist` |

---

## ETAPA 1 — Criar src/lib/nodeStyles.ts

**Agente:** `frontend-specialist`  
**Bloqueante:** sim — todos os outros arquivos dependem deste

### Implementação completa

```typescript
// src/lib/nodeStyles.ts
import type { CSSProperties } from 'react'

const BASE: CSSProperties = {
  boxSizing: 'border-box',  // CRÍTICO — garante que border não expande o hitbox
}

export const NODE_STYLES: Record<string, CSSProperties> = {
  // ── Mind map ──────────────────────────────────────────────
  'mindmap-root': {
    ...BASE,
    background: '#4472C4',
    border: '2px solid #2952A3',
    borderRadius: '22px',
    color: '#ffffff',
    fontWeight: '600',
    fontSize: '15px',
  },
  'mindmap-l1': {
    ...BASE,
    background: '#EBF5FB',
    border: '1.5px solid #4472C4',
    borderRadius: '8px',
  },
  'mindmap-l2': {
    ...BASE,
    background: '#F4F9FF',
    border: '1px solid #A4CAEB',
    borderRadius: '8px',
  },

  // ── Flowchart ─────────────────────────────────────────────
  'flowchart-process': {
    ...BASE,
    background: '#ffffff',
    border: '1px solid #b1b1b7',
    borderRadius: '8px',
  },
  'flowchart-decision': {
    ...BASE,
    background: '#FEF9E7',
    border: '1px solid #F39C12',
    borderRadius: '4px',
  },
  'flowchart-terminal': {
    ...BASE,
    background: '#2C3E50',
    border: 'none',
    borderRadius: '18px',
    color: '#ffffff',
    fontWeight: '600',
  },
  'flowchart-action': {
    ...BASE,
    background: '#EAFAF1',
    border: '1px solid #27AE60',
    borderRadius: '8px',
  },

  // ── Org chart ─────────────────────────────────────────────
  'orgchart-root': {
    ...BASE,
    background: '#4472C4',
    border: 'none',
    borderRadius: '6px',
    color: '#ffffff',
    fontWeight: '700',
  },
  'orgchart-child': {
    ...BASE,
    background: '#ffffff',
    border: '1px solid #b1b1b7',
    borderRadius: '6px',
  },

  // ── Timeline ──────────────────────────────────────────────
  'timeline-event': {
    ...BASE,
    background: '#4472C4',
    border: 'none',
    borderRadius: '18px',
    color: '#ffffff',
    fontWeight: '600',
  },

  // ── Concept map ───────────────────────────────────────────
  'concept-root': {
    ...BASE,
    background: '#2C3E50',
    border: 'none',
    borderRadius: '22px',
    color: '#ffffff',
    fontWeight: '600',
  },
  'concept-child': {
    ...BASE,
    background: '#ffffff',
    border: '1.5px solid #9B59B6',
    borderRadius: '18px',
  },

  // ── Default (swimlane, wireframe, fallback) ───────────────
  'default': {
    ...BASE,
    background: '#ffffff',
    border: '1px solid #b1b1b7',
    borderRadius: '8px',
  },
}

export function getNodeStyle(styleKey: string): CSSProperties {
  return NODE_STYLES[styleKey] ?? NODE_STYLES['default']
}

// Helper para criar o objeto style ao instanciar nós
export function buildNodeStyle(
  diagramType: string,
  isRoot: boolean,
  level: number = 1
): CSSProperties {
  if (diagramType === 'mindmap') {
    if (isRoot) return getNodeStyle('mindmap-root')
    if (level === 1) return getNodeStyle('mindmap-l1')
    return getNodeStyle('mindmap-l2')
  }
  if (diagramType === 'flowchart') return getNodeStyle('flowchart-process')
  if (diagramType === 'orgchart') {
    return isRoot ? getNodeStyle('orgchart-root') : getNodeStyle('orgchart-child')
  }
  if (diagramType === 'timeline') return getNodeStyle('timeline-event')
  if (diagramType === 'concept_map') {
    return isRoot ? getNodeStyle('concept-root') : getNodeStyle('concept-child')
  }
  return getNodeStyle('default')
}
```

### Gate de validação — Etapa 1

```
@qa-automation-engineer NÃO executar verificação no browser ainda.
Apenas confirmar que o arquivo foi criado sem erros de TypeScript:

✅ Arquivo existe em src/lib/nodeStyles.ts
✅ npx tsc --noEmit não retorna erros neste arquivo
✅ getNodeStyle('inexistente') retorna o estilo 'default' (não undefined)
✅ Todos os 12 styleKeys exportados têm boxSizing: 'border-box'

NÃO prosseguir para Etapa 2 sem ✅ neste gate.
```

---

## ETAPA 2 — Limpar JSX dos 7 CustomNodes

**Agente:** `frontend-specialist`  
**Pré-requisito:** Etapa 1 ✅

### Regra universal para todos os CustomNodes

O elemento raiz do return de CADA CustomNode deve ter APENAS:

```tsx
// ✅ CORRETO — apenas layout interno, sem estética exterior
<div
  style={{
    padding: '10px 14px',
    fontSize: '13px',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    textAlign: 'center',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}
>
  <Handle type="target" position={Position.Left} />
  {data.label}
  <Handle type="source" position={Position.Right} />
  {hasChildren && (
    <button className="collapse-btn" onClick={...}>
      {data.collapsed ? '+' : '−'}
    </button>
  )}
</div>
```

### Classes Tailwind a REMOVER de todos os CustomNodes

```
REMOVER (afetam o hitbox ou duplicam o node.style):
  bg-*          → vai para node.style.background
  border-*      → vai para node.style.border
  rounded-*     → vai para node.style.borderRadius
  shadow-*      → vai para node.style.boxShadow (não usar)
  ring-*        → vai para CSS global .selected
  w-*           → não deve existir no CustomNode
  h-*           → não deve existir no CustomNode
  min-w-*       → não deve existir no CustomNode
  max-w-*       → não deve existir no CustomNode

MANTER (apenas layout e tipografia interna):
  px-*, py-*    → equivalente ao padding do style acima
  flex          → ok se for layout interno
  items-center  → ok
  justify-center → ok
  text-sm       → ok (ou usar fontSize no style)
  font-medium   → ok (ou usar fontWeight no style)
  text-center   → ok
  break-words   → ok
  whitespace-normal → ok
```

### Gate de validação — Etapa 2

```
@qa-automation-engineer execute no browser:

Credenciais: newlinetecno@gmail.com / 123456
Navegar para /diagramas → abrir qualquer diagrama

TESTE VISUAL:
1. Inspecionar um nó no DevTools (F12 → elemento)
2. Encontrar o elemento com classe react-flow__node
3. Verificar o elemento filho direto (o CustomNode)

✅ O filho direto NÃO tem classes como bg-blue-50, border-2, rounded-xl
✅ O filho direto NÃO tem style com border, background ou borderRadius
✅ O nó ainda renderiza com cor e borda (herdadas de node.style — Etapa 3)

⚠️ Nesta etapa os nós podem aparecer SEM ESTILO VISUAL (fundo branco, sem borda)
   porque node.style ainda não foi injetado. Isso é ESPERADO — continuar para Etapa 3.

NÃO prosseguir para Etapa 3 sem ✅ no teste técnico do DevTools.
```

---

## ETAPA 3 — Injetar node.style em todas as fontes de nós

**Agente:** `frontend-specialist`  
**Pré-requisito:** Etapa 2 ✅  
**Esta etapa restaura o visual que foi removido na Etapa 2**

### 3A — Templates (src/data/templates.ts)

```typescript
import { buildNodeStyle } from '@/lib/nodeStyles'

// Exemplo para template mindmap:
const mindmapTemplate = {
  nodes: [
    {
      id: 'root',
      type: 'mindMapNode',
      position: { x: 0, y: 0 },
      data: { label: 'Tema central', styleKey: 'mindmap-root', level: 0 },
      style: buildNodeStyle('mindmap', true, 0),  // ← ADICIONAR
    },
    {
      id: 'child-1',
      type: 'mindMapNode',
      position: { x: 0, y: 0 },
      data: { label: 'Subtópico', styleKey: 'mindmap-l1', level: 1 },
      style: buildNodeStyle('mindmap', false, 1),  // ← ADICIONAR
    },
  ],
}

// Aplicar o mesmo padrão em TODOS os templates dos 7 tipos de diagrama.
// Cada nó deve ter:
//   data.styleKey  → chave para referência (ex: 'mindmap-l1')
//   data.level     → profundidade na hierarquia (0 = raiz)
//   style          → resultado de buildNodeStyle(...)
```

### 3B — Criação dinâmica de nós (DiagramEditorCore.tsx)

```typescript
import { buildNodeStyle } from '@/lib/nodeStyles'

// Em handleAddChild, handleAddSpecialNode e similares:
const novoNo: Node = {
  id: generateId(),
  type: 'mindMapNode',
  position: { x: 0, y: 0 },
  data: {
    label: 'Novo tópico',
    styleKey: 'mindmap-l1',
    level: parentLevel + 1,
  },
  style: buildNodeStyle(diagramType, false, parentLevel + 1),  // ← ADICIONAR
}
```

### 3C — Retrocompatibilidade ao carregar do banco (DiagramEditor.tsx)

**Esta é a parte mais importante para os diagramas existentes.**

```typescript
import { buildNodeStyle } from '@/lib/nodeStyles'

// Na função loadDiagram, após buscar os dados do Supabase:
const loadedNodes = diagramData.nodes.map((node) => {
  // Já tem style? Verificar se tem boxSizing (foi salvo pela nova lógica)
  if (node.style?.boxSizing === 'border-box') {
    return node  // já está no novo formato, não precisa migrar
  }

  // Nó antigo sem style correto → inferir styleKey pelo data existente
  const styleKey = node.data?.styleKey
    ?? inferStyleKey(node, diagramType)  // função auxiliar abaixo
  
  return {
    ...node,
    data: { ...node.data, styleKey },
    style: buildNodeStyle(diagramType, node.data?.isRoot ?? false, node.data?.level ?? 1),
  }
})

// Função auxiliar para inferir styleKey de nós antigos sem styleKey:
function inferStyleKey(node: Node, diagramType: string): string {
  // Tentar detectar pelo tipo do nó e posição
  if (diagramType === 'mindmap') {
    // Se for o nó com id 'root' ou data.isRoot, é raiz
    if (node.id === 'root' || node.data?.isRoot) return 'mindmap-root'
    return 'mindmap-l1'
  }
  if (diagramType === 'flowchart') return 'flowchart-process'
  if (diagramType === 'orgchart') {
    return node.data?.isRoot ? 'orgchart-root' : 'orgchart-child'
  }
  return 'default'
}
```

### Gate de validação — Etapa 3

```
@qa-automation-engineer execute no browser:

Credenciais: newlinetecno@gmail.com / 123456

TESTE A — Novo diagrama:
1. /diagramas → Novo diagrama → Mind map
✅ Nó raiz: fundo azul escuro (#4472C4), borda, texto branco
✅ Nós filhos: fundo azul claro (#EBF5FB), borda azul
✅ Handles (pontos de conexão) nas bordas exatas do visual

TESTE B — Diagrama existente (retrocompatibilidade):
1. /diagramas → abrir um diagrama criado ANTES desta implementação
✅ O diagrama abre sem erro
✅ Nós aparecem com estilo visual correto (não fundo branco sem borda)
✅ Layout preservado (posições dos nós iguais ao que foi salvo)

TESTE C — DevTools hitbox check:
1. Selecionar qualquer nó
2. DevTools → elemento react-flow__node → propriedade computed width/height
3. Elemento filho (CustomNode) → computed width/height
✅ Ambos têm O MESMO width e height
✅ Nenhum fill, border ou borderRadius no elemento filho (apenas no pai)

❌ Se TESTE B falhar → @debugger verificar a função inferStyleKey
❌ Se TESTE C falhar → verificar se boxSizing: border-box está em node.style

NÃO prosseguir para Etapa 4 sem ✅ em todos os testes.
```

---

## ETAPA 4 — CSS Global (src/index.css)

**Agente:** `frontend-specialist`  
**Pré-requisito:** Etapa 3 ✅

### Adicionar ao src/index.css

```css
/* ── React Flow: garantias de box model ─────────────────── */
.react-flow__node {
  box-sizing: border-box;
}

/* ── Seleção: anel externo via outline, não border ──────── */
.react-flow__node.selected {
  outline: 2px solid #4472C4;
  outline-offset: 2px;
}

/* ── Remove qualquer borda de seleção customizada anterior ─ */
.react-flow__node.selected > div {
  /* Não adicionar nada aqui — a seleção é via outline no wrapper */
}

/* ── Handles: estilo padrão RF ──────────────────────────── */
.react-flow__handle {
  width: 8px;
  height: 8px;
  background: #b1b1b7;
  border: 2px solid #ffffff;
  border-radius: 50%;
}

.react-flow__handle:hover {
  background: #4472C4;
}

/* ── Botão collapse/expand ──────────────────────────────── */
.collapse-btn {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid #b1b1b7;
  color: #555555;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  transition: border-color 150ms ease, color 150ms ease;
  padding: 0;
}

.collapse-btn:hover {
  border-color: #4472C4;
  color: #4472C4;
}

/* ── Animação de reposicionamento após collapse/expand ───── */
.react-flow__node {
  transition: transform 300ms ease;
}

/* ── Remover qualquer CSS que sobrescreva o RF com !important */
/* (verificar e remover seletores antigos aqui se existirem)  */
```

### Gate de validação — Etapa 4

```
@qa-automation-engineer execute no browser:

Credenciais: newlinetecno@gmail.com / 123456

TESTE A — Seleção sem borda dupla:
1. Clicar em qualquer nó para selecionar
✅ Aparece outline azul ao REDOR do nó (não dentro)
✅ Sem borda dupla (uma do style + uma do CSS de seleção)
✅ Handles nas bordas visuais exatas

TESTE B — Handles visíveis e corretos:
✅ Handles são círculos cinzas de 8px nas bordas do nó
✅ Hover no handle → fica azul
✅ Arrastar do handle cria uma nova edge

TESTE C — Botão collapse:
✅ Nós com filhos mostram botão circular "−" na borda inferior
✅ Hover no botão → borda e texto ficam azuis
✅ Nós folha (sem filhos) NÃO mostram o botão

NÃO prosseguir para Etapa 5 sem ✅ em todos os testes.
```

---

## ETAPA 5 — Limpeza de código morto

**Agente:** `code-archaeologist`  
**Pré-requisito:** Etapa 4 ✅

```
@code-archaeologist

Remova os seguintes itens que foram substituídos pelas etapas anteriores:

1. Qualquer ResizeObserver criado manualmente fora do React Flow
2. Qualquer função que meça nós via elementos DOM temporários
3. A função toggleNodeCollapse ANTIGA (se foi substituída por toggleCollapse
   + getVisibleGraph nos planos anteriores)
4. Imports não utilizados nos arquivos modificados nas Etapas 1-4
5. Classes CSS em src/index.css ou outros arquivos CSS que foram
   substituídas pelos seletores do .react-flow__node adicionados na Etapa 4
6. Qualquer width ou height hardcoded nos templates de nó
   (deve ser undefined — o ELK e o RF calculam dinamicamente)

Para cada item removido, documentar:
- Arquivo e linha
- O que foi removido
- Por que é seguro remover

NÃO remover sem documentar. Se tiver dúvida se algo é código morto,
deixar e reportar para revisão humana.
```

### Gate de validação — Etapa 5

```
@qa-automation-engineer + @test-engineer:

✅ Build sem erros de TypeScript (npx tsc --noEmit)
✅ Nenhum import com "Module not found" no console do browser
✅ Funcionalidades básicas não regrediram:
   - Criar novo diagrama de cada tipo ✅
   - Adicionar nó ✅
   - Editar label ✅
   - Deletar nó ✅
   - Ctrl+Z desfaz ✅
   - Autosave (aguardar 10s) ✅
   - Recarregar página → diagrama igual ✅
```

---

## ETAPA 6 — Validação final do bug original

**Agente:** `qa-automation-engineer`  
**Pré-requisito:** Etapa 5 ✅  
**Esta etapa valida especificamente o bug reportado na imagem**

```
@qa-automation-engineer

Reproduzir EXATAMENTE o cenário da imagem reportada:

Credenciais: newlinetecno@gmail.com / 123456

1. Abrir /diagramas → abrir diagrama com nós "Negociação" e "Fechamento"
   (ou criar um Mind map com esses labels)

2. Clicar no nó "Negociação":
✅ Os 4 handles aparecem NAS BORDAS VISUAIS do nó (não dentro)
✅ A área de seleção laranja coincide com a área azul de fundo
✅ Não existe "ponto morto" — clicar em qualquer ponto do visual seleciona o nó

3. Arrastar o nó pela borda visual:
✅ O nó se move ao clicar e arrastar pela borda
✅ Não existe zona onde o cursor fica "no ar" sem agarrar o nó

4. Clicar no nó "Fechamento":
✅ Mesmos critérios acima

5. DevTools → Performance:
✅ Drag sem jank (60fps)
✅ Sem layout thrashing durante o arrasto

RESULTADO FINAL ESPERADO:
A imagem reportada mostrava os handles (pontos cinzas) desalinhados
da borda visual laranja. Após esta refatoração, os handles devem
coincidir perfeitamente com as bordas visuais dos nós.

Tirar screenshot comparativo (antes/depois) e anexar ao relatório.
```

---

## Resumo do que muda e o que não muda

### O que muda
- `border`, `background`, `borderRadius` saem do JSX → entram em `node.style`
- `box-sizing: border-box` adicionado em `node.style` e `.react-flow__node`
- Seleção via `outline` no wrapper (não `border` no filho)
- `nodeStyles.ts` centraliza todos os estilos visuais

### O que NÃO muda
- Lógica de layout (ELK) — inalterada
- `useNodesInitialized` e `useAutoLayout` — inalterados
- `getVisibleGraph` e `toggleCollapse` — inalterados
- Autosave, undo/redo, colaboração, Kanban — fora do escopo
- Estrutura do banco de dados — inalterada
- Diagramas existentes — migrados automaticamente via `inferStyleKey`

---

## Ordem de execução obrigatória

```
Etapa 1 (nodeStyles.ts)
  ↓ gate ✅
Etapa 2 (limpar JSX dos CustomNodes)
  ↓ gate ✅
Etapa 3 (injetar node.style em templates + loadDiagram + addChild)
  ↓ gate ✅ [visual restaurado aqui]
Etapa 4 (CSS global)
  ↓ gate ✅
Etapa 5 (limpeza código morto)
  ↓ gate ✅
Etapa 6 (validação bug original)
  ↓ ✅ CONCLUÍDO
```

**Nenhuma etapa pode ser pulada ou executada fora de ordem.**  
**Se qualquer gate reprovar, @debugger é acionado antes de prosseguir.**
