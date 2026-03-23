# Mind Pro AI — Documentação do Sistema

## Visão Geral

Plataforma de produtividade visual com mapas mentais, diagramas, boards Kanban e agenda integrada. Frontend React + Vite + Tailwind CSS + TypeScript com backend Lovable Cloud (Supabase).

---

## Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18, Vite 5, TypeScript 5 |
| UI | Tailwind CSS 3, shadcn/ui, Radix UI, Framer Motion |
| Diagramas | @xyflow/react (React Flow) |
| Drag & Drop | @dnd-kit/core + sortable |
| Estado | Zustand, React Query |
| Formulários | React Hook Form + Zod |
| Gráficos | Recharts |
| PDF | jsPDF, html-to-image |
| Backend | Supabase (Auth, Database, Storage, Edge Functions, Realtime) |
| Pagamentos | Stripe (checkout, webhooks, portal do cliente) |

---

## Estrutura de Rotas

### Públicas
| Rota | Página | Descrição |
|---|---|---|
| `/` | Index | Landing page |
| `/login` | Login | Autenticação (email/senha + Google OAuth) |
| `/cadastro` | Cadastro | Registro de novo usuário |
| `/esqueci-senha` | ForgotPassword | Recuperação de senha |
| `/redefinir-senha` | ResetPassword | Redefinir senha |
| `/convite` | AcceptInvite | Aceitar convite de colaboração |

### Protegidas (autenticado)
| Rota | Página | Descrição |
|---|---|---|
| `/dashboard` | Dashboard | Painel principal |
| `/diagramas` | DiagramList | Lista de diagramas |
| `/diagramas/novo` | NewDiagram | Criar novo diagrama |
| `/diagramas/:id` | DiagramEditor | Editor de diagrama |
| `/boards` | WorkspaceList | Lista de boards Kanban (agrupados por workspace) |
| `/boards/:id` | BoardDetail | Board Kanban individual |
| `/agenda` | AgendaPage | Calendário/agenda |
| `/inbox` | InboxPage | Caixa de entrada rápida |
| `/planner` | PlannerPage | Planejamento |
| `/assinaturas` | AssinaturasPage | Gestão de plano/assinatura |
| `/configuracoes` | Configuracoes | Configurações do usuário |

### Admin (requer role `admin`)
| Rota | Página | Descrição |
|---|---|---|
| `/admin` | AdminDashboard | Dashboard administrativo (MRR, DAU, retenção) |
| `/admin/usuarios` | AdminUsers | Gestão de usuários |
| `/admin/planos` | AdminPlans | Gestão de planos |
| `/admin/configuracoes` | AdminSettings | Configurações do sistema |

---

## Schema do Banco de Dados

### Usuários e Autenticação

#### `user_profiles`
Perfil do usuário (criado automaticamente via trigger `handle_new_user`).

| Coluna | Tipo | Descrição |
|---|---|---|
| user_id | uuid (PK) | Referência ao auth.users |
| full_name | text | Nome completo |
| email | text | E-mail |
| avatar_url | text | URL do avatar |
| birth_date | date | Data de nascimento |
| onboarding_done | boolean | Onboarding concluído |
| notify_comments | boolean | Notificar comentários |
| notify_card_moved | boolean | Notificar movimentação de cartão |
| notify_due_soon | boolean | Notificar prazo próximo |
| notify_member_added | boolean | Notificar membro adicionado |
| notify_diagram_shared | boolean | Notificar diagrama compartilhado |
| notify_diagram_commented | boolean | Notificar comentário em diagrama |
| notify_board_card_assigned | boolean | Notificar atribuição de cartão |
| notify_board_checklist_done | boolean | Notificar checklist concluído |
| notify_board_label_changed | boolean | Notificar mudança de label |
| notify_agenda_reminders | boolean | Notificar lembretes da agenda |
| notify_agenda_event_updated | boolean | Notificar evento atualizado |

#### `user_roles`
Roles de usuário (separado de profiles por segurança).

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid | Referência ao auth.users |
| role | enum (admin, moderator, user) | Papel do usuário |

#### `admin_whitelist`
Lista de e-mails com acesso admin automático.

| Coluna | Tipo |
|---|---|
| email | text (PK) |

---

### Diagramas

#### `diagram_workspaces`
Workspaces para organizar diagramas.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid | Dono do workspace |
| title | text | Título |
| position | integer | Ordem |
| is_default | boolean | Workspace padrão |

#### `diagrams`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid | Dono do diagrama |
| title | text | Título |
| type | enum | mindmap, flowchart, orgchart, timeline, concept_map, swimlane, wireframe |
| data | jsonb | Nodes e edges do diagrama |
| theme | text | ID do tema visual |
| thumbnail | text | URL da thumbnail |
| template_id | text | Template usado na criação |
| is_public | boolean | Diagrama público |
| public_token | text | Token de acesso público |
| version | integer | Versão do diagrama |
| diagram_workspace_id | uuid (nullable) | FK → diagram_workspaces |

#### `diagram_collaborators`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| diagram_id | uuid | FK → diagrams |
| user_id | uuid | Colaborador |
| role | text | viewer ou editor |

---

### Boards (Kanban)

#### `workspaces`
Workspaces para organizar boards.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid | Dono do workspace |
| title | text | Título |
| position | integer | Ordem |
| is_default | boolean | Workspace padrão |

#### `workspace_members`
| Coluna | Tipo | Descrição |
|---|---|---|
| workspace_id | uuid | FK → workspaces |
| user_id | uuid | Membro |
| role | text | Papel no workspace |

#### `boards`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid | Dono do board |
| workspace_id | uuid (nullable) | FK → workspaces |
| title | text | Título |
| description | text | Descrição |
| cover_color | text | Cor de capa |
| cover_image | text | Imagem de capa |
| theme | text | Tema visual |
| is_starred | boolean | Favorito |
| is_closed | boolean | Arquivado |

#### `board_columns`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| board_id | uuid | FK → boards |
| title | text | Título da coluna |
| position | integer | Ordem |

#### `board_cards`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| board_id | uuid | FK → boards |
| column_id | uuid | FK → board_columns |
| title | text | Título |
| description | text | Descrição |
| position | integer | Ordem na coluna |
| due_date | timestamptz | Data de entrega |
| is_complete | boolean | Concluído |
| cover_color | text | Cor de capa |
| cover_image | text | Imagem de capa |
| diagram_id | uuid (nullable) | FK → diagrams (diagrama vinculado) |

#### `board_members`
| Coluna | Tipo | Descrição |
|---|---|---|
| board_id | uuid | FK → boards |
| user_id | uuid | Membro |
| role | text | member / admin |

#### `card_labels`
| Coluna | Tipo |
|---|---|
| id | uuid (PK) |
| board_id | uuid | FK → boards |
| name | text |
| color | text |

#### `card_label_assignments`
| Coluna | Tipo |
|---|---|
| card_id | uuid | FK → board_cards |
| label_id | uuid | FK → card_labels |

#### `card_members`
| Coluna | Tipo |
|---|---|
| card_id | uuid | FK → board_cards |
| user_id | uuid |

#### `card_comments`
| Coluna | Tipo |
|---|---|
| id | uuid (PK) |
| card_id | uuid | FK → board_cards |
| user_id | uuid |
| content | text |

#### `card_activities`
| Coluna | Tipo |
|---|---|
| id | uuid (PK) |
| card_id | uuid | FK → board_cards |
| user_id | uuid |
| action | text |
| details | jsonb |

#### `card_attachments`
| Coluna | Tipo |
|---|---|
| id | uuid (PK) |
| card_id | uuid | FK → board_cards |
| name | text |
| url | text |
| mime_type | text |

#### `card_checklists`
| Coluna | Tipo |
|---|---|
| id | uuid (PK) |
| card_id | uuid | FK → board_cards |
| title | text |
| position | integer |

#### `checklist_items`
| Coluna | Tipo |
|---|---|
| id | uuid (PK) |
| checklist_id | uuid | FK → card_checklists |
| text | text |
| is_checked | boolean |
| position | integer |
| due_date | timestamptz |

#### `card_reminders`
| Coluna | Tipo |
|---|---|
| id | uuid (PK) |
| card_id | uuid | FK → board_cards |
| user_id | uuid |
| remind_at | timestamptz |
| sent | boolean |

---

### Agenda

#### `events`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid | Dono |
| title | text | Título |
| description | text | Descrição |
| start_at | timestamptz | Início |
| end_at | timestamptz | Fim |
| all_day | boolean | Dia inteiro |
| color | text | Cor do evento |
| card_id | uuid | FK → board_cards (integração Kanban) |
| diagram_id | uuid | FK → diagrams |

---

### Inbox

#### `inbox_items`
| Coluna | Tipo |
|---|---|
| id | uuid (PK) |
| user_id | uuid |
| title | text |
| notes | text |
| position | integer |

---

### Notificações

#### `notifications`
| Coluna | Tipo |
|---|---|
| id | uuid (PK) |
| user_id | uuid |
| title | text |
| body | text |
| type | text |
| is_read | boolean |
| board_id | uuid (nullable) |
| card_id | uuid (nullable) |

---

### Convites e Solicitações de Acesso

#### `invitations`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| invited_by | uuid | Quem convidou |
| invited_email | text | E-mail convidado |
| invited_user_id | uuid | Usuário convidado (se existir) |
| resource_type | text | board ou diagram |
| resource_id | uuid | ID do recurso |
| role | text | Papel atribuído |
| token | text | Token do convite |
| status | text | pending, accepted, declined |
| expires_at | timestamptz | Expiração (7 dias) |

#### `access_requests`
Solicitações de acesso a recursos compartilhados.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| requester_id | uuid | Quem solicitou |
| owner_id | uuid | Dono do recurso |
| resource_type | text | Tipo do recurso |
| resource_id | uuid | ID do recurso |
| requested_role | text | Papel solicitado |
| status | text | pending, approved, denied |
| resolved_at | timestamptz | Data de resolução |

---

### Assinaturas

#### `subscription_plans`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| name | text | free, pro, business |
| display_name | text | Nome exibido |
| price_brl | numeric | Preço em R$ |
| features | jsonb | Limites e features |
| stripe_price_id | text | ID do preço no Stripe |
| is_active | boolean | Plano ativo |

#### `subscriptions`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid | Usuário |
| plan_id | uuid | FK → subscription_plans |
| status | text | active, canceled, trialing |
| stripe_subscription_id | text | ID da subscription no Stripe |
| stripe_customer_id | text | ID do customer no Stripe |
| stripe_price_id | text | Price ID |
| current_period_start | timestamptz | Início do período |
| current_period_end | timestamptz | Fim do período |
| trial_ends_at | timestamptz | (legado, não utilizado) |
| canceled_at | timestamptz | Data de cancelamento |

---

### IA e Configurações

#### `ai_settings`
Configurações de provedores de IA.

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| provider | text | Provedor (ex: openai) |
| model | text | Modelo |
| api_key_encrypted | text | Chave encriptada |
| is_active | boolean | Ativo |

---

### E-mail

#### `email_send_log`
Log de e-mails enviados.

| Coluna | Tipo |
|---|---|
| id | uuid (PK) |
| recipient_email | text |
| template_name | text |
| status | text |
| message_id | text |
| error_message | text |
| metadata | jsonb |

#### `email_send_state`
Estado de envio de e-mail (rate limiting).

| Coluna | Tipo |
|---|---|
| id | integer (PK) |
| batch_size | integer |
| send_delay_ms | integer |
| auth_email_ttl_minutes | integer |
| transactional_email_ttl_minutes | integer |
| retry_after_until | timestamptz |

#### `email_unsubscribe_tokens`
Tokens de descadastramento de e-mail.

| Coluna | Tipo |
|---|---|
| id | uuid (PK) |
| email | text |
| token | text |
| used_at | timestamptz |

#### `suppressed_emails`
E-mails suprimidos (bounce, complaint).

| Coluna | Tipo |
|---|---|
| id | uuid (PK) |
| email | text |
| reason | text |
| metadata | jsonb |

---

## Funções SQL (Security Definer)

| Função | Descrição |
|---|---|
| `has_role(user_id, role)` | Verifica se usuário tem determinado role |
| `is_admin(user_id)` | Verifica admin (role ou whitelist) |
| `is_board_owner(board_id, user_id)` | Dono do board |
| `is_board_member(board_id, user_id)` | Membro do board |
| `can_access_board(board_id, user_id)` | Dono OU membro |
| `can_access_card(card_id, user_id)` | Acesso ao cartão via board |
| `can_access_checklist(checklist_id, user_id)` | Acesso ao checklist via board |
| `can_access_workspace(user_id, workspace_id)` | Acesso ao workspace |
| `is_workspace_owner(user_id, workspace_id)` | Dono do workspace |
| `is_diagram_owner(diagram_id, user_id)` | Dono do diagrama |
| `is_diagram_collaborator(diagram_id, user_id)` | Colaborador do diagrama |
| `is_diagram_editor(diagram_id, user_id)` | Editor do diagrama |
| `handle_new_user()` | Trigger: cria perfil ao registrar |
| `handle_new_subscription()` | Trigger: cria subscription free ao registrar |
| `update_updated_at_column()` | Trigger: atualiza updated_at |
| `enqueue_email(payload, queue_name)` | Enfileira e-mail para envio |
| `read_email_batch(batch_size, queue_name, vt)` | Lê batch de e-mails da fila |
| `delete_email(message_id, queue_name)` | Remove e-mail da fila |
| `move_to_dlq(dlq_name, message_id, payload, source_queue)` | Move e-mail para DLQ |

---

## Edge Functions

| Função | JWT | Descrição |
|---|---|---|
| `stripe-checkout` | Sim | Cria sessão de checkout Stripe |
| `stripe-webhook` | Não | Processa webhooks do Stripe |
| `stripe-customer-portal` | Sim | Gera link do portal do cliente Stripe |
| `send-invite` | Não | Envia e-mail de convite de colaboração |
| `send-email` | Não | Envio genérico de e-mail (SMTP) |
| `send-reminders` | Sim | Cron: envia lembretes de prazos |
| `notify-board-event` | Sim | Notificação de eventos do board |
| `notify-card-comment` | Sim | Notificação de comentários |
| `accept-invitation` | Não | Aceitar convite de colaboração |
| `ai-chat` | Não | Chat com IA |
| `ai-map-assist` | Não | Assistente IA para mapas mentais |
| `ai-board-assist` | Não | Assistente IA para boards |
| `auth-email-hook` | Não | Hook de e-mail de autenticação |
| `process-email-queue` | Não | Processa fila de e-mails |

---

## Storage Buckets

| Bucket | Público | Uso |
|---|---|---|
| `diagram-thumbnails` | Sim | Thumbnails dos diagramas |
| `card-attachments` | Sim | Anexos de cartões Kanban |

---

## Modelo de Negócio

### Planos

| Plano | Preço | Diagramas | Boards | Colaboradores | PDF | IA |
|---|---|---|---|---|---|---|
| Gratuito | R$ 0 | 3 | 2 | 0 | ❌ | ❌ |
| Pro | R$ 29,90/mês | Ilimitado | Ilimitado | 5 | ✅ | ✅ |
| Business | R$ 79,90/mês | Ilimitado | Ilimitado | Ilimitado | ✅ | ✅ |

- **Sem trial**: plano gratuito é permanente com limitações
- Limites enforçados via hook `usePlanLimits`
- Modal de upgrade (`UpgradeModal`) exibido ao atingir cotas

---

## Funcionalidades Principais

### 1. Diagramas / Mapas Mentais
- 7 tipos: mindmap, flowchart, orgchart, timeline, concept_map, swimlane, wireframe
- Editor visual com React Flow (@xyflow/react)
- **Estilização nativa React Flow**: toda a estética visual (border, background, borderRadius) via `node.style` — jamais via classes Tailwind no CustomNode
- `src/lib/nodeStyles.ts`: tokens centralizados (`getNodeStyle`, `buildNodeStyle`, `inferStyleKey`)
- Hitbox 100% alinhado ao visual (sem borda dupla), `box-sizing: border-box` no wrapper nativo
- Seleção nativa via `outline` no `.react-flow__node.selected` (sem ring interno)
- Temas visuais personalizáveis
- Colaboração em tempo real (Supabase Realtime + Presence)
- Compartilhamento públ ico via token
- Exportação (thumbnail automática)
- Templates pré-definidos com `node.style` injetado
- Undo/Redo
- Busca de nós (Ctrl+F)
- Autosave a cada 10s com refs para evitar closures stale
- Organização por diagram_workspaces
- Layout automático ao carregar template e ao adicionar/mover nós via ELK (`useAutoLayout`)
- Reorganização manual via botão na toolbar ou atalho `Ctrl+Shift+L`
- **Collapse/Expand de nós**: botão sutil (+/−) posicionado sobre o conector sainte; detecta filhos considerando edges ocultas; estado `collapsed` persistido no jsonb; relayout automático após toggle
- **Retrocompatibilidade**: nós antigos carregados do banco recebem `node.style` automático via `inferStyleKey` + `buildNodeStyle`
- Word-wrap correto em todos os tipos de nó (texto longo não vaza para fora do nó)

### 2. Boards Kanban
- Drag-and-drop de cartões e colunas
- Cartões com: descrição, labels, membros, checklists (editáveis/excluíveis), anexos, comentários, capa, diagrama vinculado
- Filtros por label, membro, data
- Temas visuais por board
- Templates de board
- Feed de atividades por cartão
- Lembretes de prazo (cron + e-mail + notificação in-app)
- Compartilhamento/convites com visualização de membros e permissões
- Organização por workspaces (boards órfãos tratados como "não atribuídos")

### 3. Agenda
- Visualizações mensal e semanal
- CRUD de eventos
- Integração com Kanban: due_date de cartão → evento automático
- Eventos de cartão exibem badge do board de origem

### 4. Inbox
- Captura rápida de ideias/notas
- Ordenação por posição (drag-and-drop)

### 5. Planner
- Painel de planejamento integrado

### 6. Notificações
- Sistema in-app com sino (NotificationBell)
- Preferências granulares por tipo de notificação
- Notificações via e-mail (Edge Functions)

### 7. Autenticação
- E-mail/senha com confirmação de e-mail
- Google OAuth
- Recuperação de senha (esqueci-senha / redefinir-senha)
- Perfil automático via trigger

### 8. Admin
- Dashboard com KPIs (MRR, DAU, retenção, receita por plano)
- Gestão de usuários e roles
- Gestão de planos de assinatura
- Atribuição manual de planos
- Configurações de IA

### 9. Assinaturas
- Checkout via Stripe
- Portal do cliente Stripe
- Webhook para sincronização de status
- Limites enforçados no frontend

### 10. IA
- Chat com IA (AIChatWidget)
- Assistente para mapas mentais (AIMapAssistDialog)
- Assistente para boards (AIBoardAssistDialog)

---

## Utilitários de Diagrama

### `src/lib/diagramUtils.ts`
| Função | Descrição |
|---|---|
| `getDescendants(nodeId, edges)` | Retorna todos os IDs descendentes via BFS |
| `getDirectChildren(nodeId, edges)` | Retorna apenas filhos diretos |
| `toggleNodeCollapse(nodeId, nodes, edges)` | Alterna collapse/expand; colapsar oculta todos os descendentes, expandir revela apenas filhos diretos |

### `src/components/mindmap/mindmapLayout.ts`
| Função | Descrição |
|---|---|
| `autoLayoutDiagram(nodes, edges, type)` | Dispatcher principal: roteia para algoritmo ELK correto por tipo |
| `autoLayoutMindMap(nodes, edges)` | Layout balanceado bilateral para mindmaps via ELK |
| `rerouteDiagramEdges(nodes, edges, type)` | Recalcula sourceHandle/targetHandle após layout |

### `src/lib/nodeStyles.ts`
| Função | Descrição |
|---|---|
| `getNodeStyle(key)` | Retorna o `CSSProperties` para uma chave de estilo (ex: `mindmap-root`) |
| `buildNodeStyle(type, isRoot, level)` | Constrói o style para um nó dado o tipo de diagrama, se é raiz e a profundidade |
| `inferStyleKey(node, type)` | Infere a chave de estilo de nós antigos sem `styleKey` |
| `NODE_STYLES` | Registro central de todos os estilos visuais dos 7 tipos de nó |

---

## Hooks Principais

| Hook | Descrição |
|---|---|
| `useAuth` | Estado de autenticação (user, session, signOut) |
| `usePlan` | Plano atual do usuário |
| `usePlanLimits` | Limites e contagens do plano |
| `useIsAdmin` | Verifica se é admin |
| `useRealtimeDiagram` | Sync realtime + presence para diagramas |
| `useUndoRedo` | Histórico de undo/redo |
| `useCardActivity` | Feed de atividades de cartão |
| `useNotifications` | Notificações do usuário |
| `useMobile` | Detecção de viewport mobile |

---

## Secrets Configurados

- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — Pagamentos
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` — E-mail
- `LOVABLE_API_KEY` — IA
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_DB_URL` — Infra

---

## ✅ PHASE X COMPLETE: Implantação Layout Dinâmico + Collapse/Expand
- Lint & Type Check: ✅ Pass
- Security: ✅ No critical issues
- Build: ✅ Success
- Date: 2026-03-21

## ✅ PHASE XI COMPLETE: Refatoração Nativa React Flow (hitbox/seleção)
- `src/lib/nodeStyles.ts` criado com tokens de estilo centralizados
- 7 CustomNodes limpos de CSS Tailwind visual (bg-*, border-*, rounded-*)
- `node.style` injetado em templates, criação dinâmica e carga do banco
- CSS global atualizado: seleção nativa, botão `.collapse-btn` sobre o conector sainte
- Bug do botão collapse corrigido: `hasChildren` incluindo edges ocultas + `data.isCollapsed` (não `data.collapsed`)
- Lint & Type Check: ✅ Pass
- Date: 2026-03-21

## ✅ PHASE XII COMPLETE: Organograma (Arestas Quadradas + Role Editável)
- **Arestas Ortogonais (Quadradas)**: Mudança visual para arestas que formam ângulos retos, típico de organogramas profissionais.
- **Role Editável**: Adição do campo de cargo/role editável diretamente no nó, com persistência no banco de dados.
- **Alinhamento Dinâmico**: Nós no mesmo nível agora herdam a mesma altura e largura dinamicamente (baseado no maior conteúdo), garantindo que as arestas fiquem perfeitamente alinhadas nos conectores.
- **Estabilidade de Layout**: Corrigido o bug que causava "pulos" visuais ao editar o texto de um nó. O `autoLayout` agora é aplicado de forma mais atômica e preserva a organização.
- Lint & Type Check: ✅ Pass
- Date: 2026-03-22

## ✅ PHASE XIII COMPLETE: Kanban Board Enhancements & Member Management
- **Reordenamento de Colunas**: Correção definitiva da lógica de drag-and-drop para colunas, incluindo suporte a colunas de templates e sistema de colisão customizado que ignora cartões durante o arrasto ("ghost preview").
- **Horário de Entrega**: Adição de seletor de tempo (HH:mm) no popover de data de entrega. Sincronização automática com a Agenda (eventos deixam de ser "dia inteiro").
- **Segurança e Visibilidade (RLS)**: Resolução de erro de recursão infinita via função `check_board_access` (Security Definer). Membros agora visualizam uns aos outros corretamente.
- **Gestão de Membros**: Restrição de exclusão de membros e cancelamento de convites apenas para o proprietário do board.
- **UI Refinada**: Implementação do componente `Avatar` no diálogo de compartilhamento e ícone de Coroa para identificar o dono do recurso.
- Lint & Type Check: ✅ Pass
- Date: 2026-03-23
