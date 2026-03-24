# Pacote de Análise de Bugs — Módulo de Diagrama
> Mind Pro AI · Fase de análise pré-Phase XVI
> Bugs alvo: ELK instável, arestas desalinhadas, estilos/retrocompat
> Tipos: mindmap, orgchart
> Entrega esperada: análise + lista de inconsistências

---

## AGENTE 1 — `orchestrator`
**Papel:** ponto de entrada, delega e sincroniza os demais agentes.

```
Você é o orchestrator do projeto Mind Pro AI.

Contexto do sistema:
- Frontend: React 18 + Vite + TypeScript + Tailwind
- Diagramas: @xyflow/react (React Flow) com layout via elkjs
- Estado: Zustand + React Query
- Arquivo de estilos: src/lib/nodeStyles.ts
- Arquivo de layout: src/components/mindmap/mindmapLayout.ts
- Utilitários: src/lib/diagramUtils.ts
- Componente principal: src/pages/DiagramEditor (ou similar)

Bugs ativos a investigar:
1. Layout ELK instável — "pulos" visuais ao editar texto de nó em orgchart
2. Arestas mal posicionadas ou desalinhadas após autoLayout em mindmap e orgchart
3. Estilos de nós incorretos ou retrocompatibilidade quebrada (nós antigos sem styleKey)

Tipos de diagrama afetados: mindmap, orgchart

Delegue as seguintes tarefas em paralelo:

→ [code-archaeologist] com skill [systematic-debugging]:
   Analise src/lib/diagramUtils.ts, src/components/mindmap/mindmapLayout.ts e
   src/lib/nodeStyles.ts. Produza uma lista de inconsistências internas nos três arquivos.

→ [debugger] com skills [nextjs-react-expert]:
   Analise o componente DiagramEditor e o hook useAutoLayout. Foco em:
   closures stale no autosave, regressões de collapse/expand e instabilidade
   de layout ELK no orgchart após edição de texto.

→ [frontend-specialist] com skill [code-review-checklist]:
   Analise a integração entre nodeStyles.ts, CustomNode components e os templates
   de criação de nós. Foque em retrocompatibilidade (nós antigos sem styleKey)
   e alinhamento dinâmico de nós no orgchart.

Ao receber os resultados, consolide em um único relatório estruturado com:
- Seção por bug
- Arquivo e linha da inconsistência
- Nível de severidade (crítico / médio / baixo)
- Dependências entre os bugs (se bug A causa bug B)

Não faça correções ainda — apenas catalogue.
```

---

## AGENTE 2 — `code-archaeologist` + skill `systematic-debugging`
**Papel:** mapear divergências entre documentação (plan.md) e código real.

```
Você é o code-archaeologist. Use a skill systematic-debugging.

Contexto da documentação (plan.md — trechos relevantes):

FASE XI (concluída):
- nodeStyles.ts criado com tokens de estilo centralizados
- 7 CustomNodes limpos de CSS Tailwind visual
- node.style injetado em templates, criação dinâmica e carga do banco
- Bug do botão collapse corrigido: hasChildren incluindo edges ocultas + data.isCollapsed (não data.collapsed)
- Hitbox 100% alinhado ao visual, box-sizing: border-box no wrapper nativo

FASE XII (concluída):
- Arestas ortogonais (quadradas) para orgchart
- Role editável no nó com persistência no banco
- Alinhamento dinâmico: nós no mesmo nível herdam mesma altura e largura
- Bug de "pulos" visuais corrigido: autoLayout aplicado de forma atômica

UTILITÁRIOS DOCUMENTADOS:
- getDescendants(nodeId, edges): BFS de descendentes
- getDirectChildren(nodeId, edges): apenas filhos diretos
- toggleNodeCollapse(nodeId, nodes, edges): colapsar oculta todos os descendentes,
  expandir revela apenas filhos diretos
- autoLayoutDiagram(nodes, edges, type): dispatcher principal por tipo
- autoLayoutMindMap(nodes, edges): layout balanceado bilateral via ELK
- rerouteDiagramEdges(nodes, edges, type): recalcula sourceHandle/targetHandle
- getNodeStyle(key): retorna CSSProperties para uma chave
- buildNodeStyle(type, isRoot, level): constrói style dado tipo/raiz/profundidade
- inferStyleKey(node, type): infere chave de estilo de nós antigos sem styleKey
- NODE_STYLES: registro central de estilos dos 7 tipos

Arquivos a analisar:
1. src/lib/diagramUtils.ts
2. src/components/mindmap/mindmapLayout.ts
3. src/lib/nodeStyles.ts

Para cada arquivo, responda:

A) A implementação real corresponde ao que a documentação descreve?
B) Existem casos não cobertos (ex: tipo de diagrama novo sem estilo em NODE_STYLES)?
C) Existem condições de borda não tratadas (ex: nó raiz sem filhos, edge sem source/target)?
D) Existe alguma inconsistência entre os três arquivos (ex: rerouteDiagramEdges chama
   uma função de nodeStyles que mudou de assinatura)?

Formato de saída:
## [nome do arquivo]
### Inconsistência N
- Linha(s): X–Y
- Descrição: ...
- Severidade: crítico | médio | baixo
- Relacionado a: [outro arquivo ou bug]
```

---

## AGENTE 3 — `debugger` + skill `nextjs-react-expert`
**Papel:** rastrear os bugs em runtime no DiagramEditor e useAutoLayout.

```
Você é o debugger. Use a skill nextjs-react-expert.

Stack relevante:
- React 18 com hooks
- @xyflow/react (React Flow v11+)
- elkjs para layout automático
- Zustand para estado global
- Autosave a cada 10s com refs para evitar closures stale (documentado)

Componentes/hooks a analisar:
- Componente principal do editor de diagramas (DiagramEditor ou equivalente)
- Hook useAutoLayout
- Hook useUndoRedo (verificar interação com autoLayout)

Bug 1 — ELK instável / pulos no orgchart ao editar texto:
Analise se:
- O autoLayout é disparado de forma reativa ao onChange do texto (causando relayout prematuro)
- Existe debounce adequado entre edição de texto e chamada de autoLayoutDiagram
- O layout ELK recebe dimensões corretas dos nós (width/height) ao ser chamado;
  nós sem dimensão definida podem causar posicionamento errático
- O hook de undo/redo armazena snapshots antes ou depois do autoLayout
  (snapshot pré-layout pode causar "pulo" ao fazer undo)

Bug 2 — Arestas desalinhadas após autoLayout em mindmap:
Analise se:
- rerouteDiagramEdges é chamado sempre após autoLayoutMindMap (e não apenas
  em alguns code paths)
- Os handles (sourceHandle / targetHandle) estão sendo corretamente invalidados
  antes do rerouteamento (handles obsoletos causam arestas cruzadas)
- O layout bilateral do mindmap (nós à esquerda e à direita da raiz) está
  atribuindo handles corretos para cada lado

Bug 3 — Closures stale no autosave:
Analise se:
- O autosave de 10s usa useRef para nodes e edges (conforme documentado),
  ou se em algum caso ele captura o valor inicial via closure
- Existe race condition entre o autosave e uma operação de autoLayout em andamento

Formato de saída por bug:
## Bug [N] — [nome curto]
### Causa provável
...
### Arquivo e linha suspeitos
...
### Evidência no código
(trecho ou padrão encontrado)
### Severidade: crítico | médio | baixo
### Interação com outros bugs
...
```

---

## AGENTE 4 — `frontend-specialist` + skill `code-review-checklist`
**Papel:** auditar retrocompatibilidade e integração de estilos nos CustomNodes.

```
Você é o frontend-specialist. Use a skill code-review-checklist.

Contexto:
O sistema tem 7 tipos de diagrama (mindmap, flowchart, orgchart, timeline,
concept_map, swimlane, wireframe). Cada tipo tem CustomNodes específicos.

Regra arquitetural documentada (FASE XI):
- Toda estética visual (border, background, borderRadius) é aplicada via node.style
- NUNCA via classes Tailwind (bg-*, border-*, rounded-*) dentro do CustomNode
- inferStyleKey + buildNodeStyle aplicam retrocompatibilidade automática em nós antigos

Arquivos a auditar:
1. src/lib/nodeStyles.ts — NODE_STYLES e funções de estilo
2. Todos os CustomNode components de mindmap e orgchart
3. Lógica de criação de nó (onde node.style é injetado na criação)
4. Lógica de carga do banco (onde inferStyleKey é chamado)

Checklist de revisão:

[ ] NODE_STYLES cobre os 7 tipos? Verificar se mindmap e orgchart têm todas as
    variantes necessárias (root, branch, leaf para mindmap; root, manager, employee
    para orgchart ou equivalente)

[ ] Os CustomNodes de mindmap e orgchart NÃO possuem classes Tailwind visuais
    (bg-*, border-*, rounded-*, shadow-*)?

[ ] inferStyleKey trata corretamente nós antigos que chegam do banco sem styleKey?
    Verificar se a função cobre todos os tipos de diagrama ou apenas alguns

[ ] buildNodeStyle gera estilos válidos para todos os níveis (level 0, 1, 2+)?
    Verificar se há um fallback para level indefinido

[ ] O alinhamento dinâmico do orgchart (nós do mesmo nível com mesma altura/largura)
    é calculado em CSS/React ou delegado ao ELK? Há conflito entre os dois?

[ ] Após o autoLayout do orgchart, o node.style de dimensões (width, height) é
    atualizado nos nós ou apenas a posição (x, y)?

Para cada item reprovado no checklist:
- Arquivo e linha
- Descrição do problema
- Impacto: visual | funcional | dados
- Severidade: crítico | médio | baixo
```

---

## CONSOLIDAÇÃO FINAL — via `orchestrator` (segunda rodada)

Após receber os relatórios dos três agentes, dispare este prompt no orchestrator:

```
Você recebeu os relatórios de análise de code-archaeologist, debugger e
frontend-specialist sobre os bugs do módulo de diagrama (ELK instável,
arestas desalinhadas, estilos/retrocompat) em mindmap e orgchart.

Consolide os resultados em um relatório final com este formato:

# Relatório de Inconsistências — Módulo de Diagrama
Data: [hoje]
Bugs investigados: ELK instável, arestas desalinhadas, estilos/retrocompat
Tipos afetados: mindmap, orgchart

## Sumário executivo
(3–5 linhas com os achados mais críticos)

## Mapa de dependências entre bugs
(qual bug causa qual; usar formato "Bug A → Bug B")

## Lista de inconsistências por severidade

### Crítico
| # | Arquivo | Linha | Descrição | Bug relacionado |
|---|---------|-------|-----------|-----------------|

### Médio
(mesma tabela)

### Baixo
(mesma tabela)

## Recomendação de ordem de correção
(sequência sugerida considerando dependências)

## Escopo para PHASE XVI
(o que deve entrar na próxima fase com base nos achados)
```

---

## Dicas de uso no Antigravity

1. **Inicie pelo orchestrator** — ele dispara os outros três em paralelo, economizando tempo.
2. **Se preferir sequencial**: comece pelo `code-archaeologist` (mapeia o terreno), depois `debugger` (usa o mapa para rastrear), depois `frontend-specialist` (audita estilos).
3. **Adicione o conteúdo do plan.md** como contexto em cada prompt — os agentes precisam da documentação para identificar divergências.
4. **Compartilhe os arquivos reais** com cada agente (diagramUtils.ts, mindmapLayout.ts, nodeStyles.ts e os CustomNode components) para que a análise seja baseada em código real, não em inferência.
5. **Guarde os relatórios individuais** antes de consolidar — eles serão úteis na fase de correção (Phase XVI).
