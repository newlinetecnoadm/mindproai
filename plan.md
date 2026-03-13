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
| `/convite` | AcceptInvite | Aceitar convite de colaboração |

### Protegidas (autenticado)
| Rota | Página | Descrição |
|---|---|---|
| `/dashboard` | Dashboard | Painel principal |
| `/diagramas` | DiagramList | Lista de diagramas |
| `/diagramas/novo` | NewDiagram | Criar novo diagrama |
| `/diagramas/:id` | DiagramEditor | Editor de diagrama |
| `/boards` | WorkspaceList | Lista de boards Kanban |
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

### `user_profiles`
Perfil do usuário (criado automaticamente via trigger `handle_new_user`).

| Coluna | Tipo | Descrição |
|---|---|---|
| user_id | uuid (PK) | Referência ao auth.users |
| full_name | text | Nome completo |
| email | text | E-mail |
| avatar_url | text | URL do avatar |
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

### `user_roles`
Roles de usuário (separado de profiles por segurança).

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid | Referência ao auth.users |
| role | enum (admin, moderator, user) | Papel do usuário |

### `admin_whitelist`
Lista de e-mails com acesso admin automático.

| Coluna | Tipo |
|---|---|
| email | text (PK) |

---

### Diagramas

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

#### `diagram_collaborators`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| diagram_id | uuid | FK → diagrams |
| user_id | uuid | Colaborador |
| role | text | viewer ou editor |

---

### Boards (Kanban)

#### `boards`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid (PK) | |
| user_id | uuid | Dono do board |
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

### Convites

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
| `is_diagram_owner(diagram_id, user_id)` | Dono do diagrama |
| `is_diagram_collaborator(diagram_id, user_id)` | Colaborador do diagrama |
| `is_diagram_editor(diagram_id, user_id)` | Editor do diagrama |
| `handle_new_user()` | Trigger: cria perfil ao registrar |
| `handle_new_subscription()` | Trigger: cria subscription free ao registrar |
| `update_updated_at_column()` | Trigger: atualiza updated_at |

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
- Temas visuais personalizáveis
- Colaboração em tempo real (Supabase Realtime + Presence)
- Compartilhamento público via token
- Exportação (thumbnail automática)
- Templates pré-definidos
- Undo/Redo
- Busca de nós

### 2. Boards Kanban
- Drag-and-drop de cartões e colunas
- Cartões com: descrição, labels, membros, checklists, anexos, comentários, capa
- Filtros por label, membro, data
- Temas visuais por board
- Templates de board
- Feed de atividades por cartão
- Lembretes de prazo (cron + e-mail + notificação in-app)
- Compartilhamento/convites

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
- Perfil automático via trigger

### 8. Admin
- Dashboard com KPIs (MRR, DAU, retenção, receita por plano)
- Gestão de usuários e roles
- Gestão de planos de assinatura
- Atribuição manual de planos

### 9. Assinaturas
- Checkout via Stripe
- Portal do cliente Stripe
- Webhook para sincronização de status
- Limites enforçados no frontend

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
