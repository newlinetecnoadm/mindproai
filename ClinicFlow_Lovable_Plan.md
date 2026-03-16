# ClinicFlow — Plano de Desenvolvimento para o Lovable

> **Como usar este documento:**
> Cada fase é um prompt separado para o Lovable. Cole o conteúdo de uma sub-fase por vez.
> **Sempre execute as migrações SQL listadas no Supabase Dashboard ANTES de colar o prompt no Lovable.**
> Ao iniciar cada prompt, inclua o contexto fixo abaixo.

---

## 🔒 CONTEXTO FIXO — Cole sempre no início de cada prompt

```
Este projeto é o ClinicFlow, um SaaS multi-tenant de gestão clínica.
Stack: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui + Supabase externo.
Supabase client: src/lib/supabase.ts
NUNCA usar Lovable Cloud. NUNCA editar src/integrations/supabase/client.ts ou types.ts.
Migrações SQL são executadas manualmente pelo usuário — nunca automaticamente.
tenant_id sempre vem do AuthContext/TenantContext.
```

---

## ⚠️ REGRA DE OURO

**Uma sub-fase por prompt.** Se o Lovable travar ou gerar código errado, reduza ainda mais o escopo. Nunca cole duas sub-fases juntas.

---

---

# FASE 1 — Correções Críticas de Fluxo

> **Duração estimada:** 1–2 semanas
> **Pré-requisito:** Nenhum. Iniciar imediatamente.
> **Por que primeiro:** Estes 3 bugs bloqueiam o uso correto em produção.

---

## F1-A — Fix: Painel de Chamada usa profissional errado

### SQL necessário
```sql
-- Nenhuma migração necessária para este fix.
```

### Prompt para o Lovable

```
[CONTEXTO FIXO ACIMA]

CORREÇÃO DE BUG — Painel de Chamada (CallPanelPage)

PROBLEMA:
Na página CallPanelPage, o botão "Atender" cria uma nova consulta usando o
professional_id do usuário logado (AuthContext) em vez do professional_id
do agendamento selecionado.

CORREÇÃO:
1. Localizar a função handleAttend() (ou equivalente) em src/pages/CallPanelPage.tsx
2. Ao criar o registro em "consultations", usar appointment.professional_id
   (vindo do agendamento) — NÃO usar o profile.id ou user.id do contexto de autenticação
3. Garantir que o professional_id passado para a consulta seja exatamente o mesmo
   professional_id do appointments record que disparou a ação

VALIDAÇÃO:
- Logar como recepcionista
- Clicar "Atender" em um agendamento de outro médico
- A consulta criada deve ter o professional_id do médico do agendamento, não da recepcionista
```

---

## F1-B — Fluxo Linear: Máquina de Estados do Atendimento

### SQL necessário — executar ANTES do prompt
```sql
-- 1. Adicionar coluna de chegada do paciente
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS arrived_at TIMESTAMPTZ;

-- 2. Trigger que valida transições de status
CREATE OR REPLACE FUNCTION validate_appointment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Transições permitidas
  IF (OLD.status = 'scheduled'   AND NEW.status IN ('confirmed','cancelled','no_show')) OR
     (OLD.status = 'confirmed'   AND NEW.status IN ('waiting','cancelled','no_show')) OR
     (OLD.status = 'waiting'     AND NEW.status IN ('in_progress','cancelled')) OR
     (OLD.status = 'in_progress' AND NEW.status IN ('completed','cancelled')) OR
     (OLD.status = 'completed'   AND NEW.status = 'completed') OR
     (OLD.status = 'cancelled'   AND NEW.status = 'cancelled') OR
     (OLD.status = 'no_show'     AND NEW.status = 'no_show') OR
     (OLD.status = NEW.status)
  THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Transição de status inválida: % → %', OLD.status, NEW.status;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_appointment_status_transition
BEFORE UPDATE OF status ON appointments
FOR EACH ROW EXECUTE FUNCTION validate_appointment_status();
```

### Prompt para o Lovable

```
[CONTEXTO FIXO ACIMA]

IMPLEMENTAR: Fluxo Linear de Atendimento — Botão "Check-in / Paciente Chegou"

O atendimento agora segue um ciclo linear obrigatório com estes status em ordem:
scheduled → confirmed → waiting → in_progress → completed

O banco já tem o trigger que valida as transições. O campo arrived_at (timestamptz)
já foi adicionado à tabela appointments.

TAREFA: Adicionar o botão "Paciente Chegou" (Check-in) na interface.

1. Na página de Agendamentos (/appointments), para cada agendamento com
   status "scheduled" ou "confirmed", exibir um botão "✓ Check-in".

2. Ao clicar em "Check-in":
   - Atualizar appointments SET status = 'waiting', arrived_at = now()
     WHERE id = appointment.id
   - Exibir toast de confirmação: "Paciente [nome] adicionado à fila de espera"

3. No detalhe do agendamento (modal ou drawer), também exibir o botão
   "Check-in" quando aplicável, com a mesma lógica.

4. Visual: botão verde com ícone de check. Após check-in, exibir badge
   "Na fila" (amarelo âmbar) no card do agendamento.

5. O campo arrived_at deve ser exibido no detalhe do agendamento como
   "Chegou às HH:mm".

NÃO alterar o Painel de Chamada neste prompt — apenas a página de agendamentos.
```

---

## F1-C — Formulário Único: Usuário + Profissional

### SQL necessário — executar ANTES do prompt
```sql
-- Garantir constraint de unicidade no vínculo profile ↔ professional
-- (executa só se ainda não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'professionals_profile_id_unique'
  ) THEN
    ALTER TABLE professionals
    ADD CONSTRAINT professionals_profile_id_unique
    UNIQUE (profile_id);
  END IF;
END $$;
```

### Prompt para o Lovable

```
[CONTEXTO FIXO ACIMA]

REFATORAR: Cadastro de Usuário — Formulário Único com Campos Condicionais

CONTEXTO:
Na página /users (ou onde usuários são criados/editados), o formulário
atualmente coleta apenas dados de conta (nome, e-mail, role).

REQUISITO:
Quando o campo "Função/Cargo" (role) for uma função clínica, o formulário
deve exibir campos adicionais OBRIGATÓRIOS de profissional de saúde
e criar/vincular automaticamente o registro em "professionals".

FUNÇÕES CLÍNICAS (mostrar campos extras quando qualquer uma dessas for selecionada):
medico, psicologo, fisioterapeuta, nutricionista, dentista,
fonoaudiologo, enfermeiro, terapeuta_ocupacional

CAMPOS ADICIONAIS que devem aparecer condicionalmente:
- Conselho profissional (select): CRM, CRP, CREFITO, CRO, CRN, CREFONO, COREN, CRTO
- Número do registro no conselho (texto, obrigatório)
- UF do conselho (select com estados brasileiros, obrigatório)
- Especialidade principal (texto livre, obrigatório)
- Duração padrão da consulta em minutos (número, default 30)

AO SALVAR um usuário com função clínica:
1. Criar o perfil normalmente (tabela profiles)
2. Verificar se já existe um registro em "professionals" com o mesmo CPF
   - Se existe e profile_id é null: vincular (UPDATE professionals SET profile_id = novo_profile_id)
   - Se não existe: INSERT em professionals com todos os dados + profile_id = novo_profile_id
3. Se já existe com profile_id diferente: exibir erro "Já existe um profissional vinculado a outro usuário com este CPF"

AO EXIBIR a lista de usuários:
- Para usuários com função clínica e professional vinculado: exibir badge
  com conselho e número (ex: "CRM 12345/SP") ao lado do nome

Usar React Hook Form + Zod para validação. Campos condicionais devem
aparecer/desaparecer com animação suave (Framer Motion se disponível).
```

---

---

# FASE 2 — Agenda Visual + Encaixe + Exames

> **Duração estimada:** 2 semanas
> **Pré-requisito:** Fase 1 concluída.

---

## F2-A — Agenda Visual Estilo Google Agenda

### SQL necessário
```sql
-- Nenhuma migração necessária. Usa tabelas existentes.
```

### Prompt para o Lovable

```
[CONTEXTO FIXO ACIMA]

REFATORAR: Página de Agendamentos — Visualização de Calendário Semanal

SUBSTITUIR a visualização atual da página /appointments por um calendário
semanal interativo, mantendo todas as funcionalidades existentes.

LAYOUT:
- Cabeçalho: semana atual (ex: "10–16 Mar 2026") com setas ← → para navegar
  entre semanas + botão "Hoje" + DatePicker para salto direto
- Abaixo do cabeçalho: toggle "Profissionais | Equipamentos"
- Grade: colunas = profissionais ativos do tenant (ou equipamentos, conforme toggle)
  linhas = horários de 07h às 20h em slots de 30min
- Largura de cada coluna: igual, mínimo 160px, scroll horizontal se necessário

CARDS DE AGENDAMENTO:
Posicionados na grade no cruzamento do profissional × horário correto.
Altura proporcional à duration_minutes do agendamento.
Cor por status:
  scheduled  → azul (#3B82F6)
  confirmed  → índigo (#6366F1)
  waiting    → âmbar (#F59E0B)
  in_progress → verde escuro (#15803D)
  completed  → cinza (#6B7280)
  cancelled  → vermelho (#EF4444)
  no_show    → vermelho claro (#FCA5A5)
Conteúdo do card: nome do paciente (truncado) + horário + ícone de status.

INTERAÇÕES:
- Slot livre clicável → abre AppointmentFormDialog pré-preenchido com
  o profissional da coluna e o horário do slot
- Click no card → abre drawer lateral direito com detalhes completos do
  agendamento e os botões de ação disponíveis para o status atual
- Drawer deve ter botão "Check-in" se status for scheduled/confirmed

MANTER:
- Toda a lógica de criação/edição de agendamentos existente
- Filtros existentes (se houver) — movê-los para a barra de cabeçalho
- Responsividade: em mobile, exibir visualização de lista (não a grade)

Usar date-fns (pt-BR) para toda manipulação de datas.
NÃO recriar AppointmentFormDialog — apenas chamá-lo como já existe.
```

---

## F2-B — Encaixe na Agenda

### SQL necessário — executar ANTES do prompt
```sql
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS is_fit_in BOOLEAN DEFAULT FALSE;
```

### Prompt para o Lovable

```
[CONTEXTO FIXO ACIMA]

IMPLEMENTAR: Encaixe de Paciente na Agenda

O banco já tem a coluna is_fit_in (boolean, default false) em appointments.

CONCEITO: Encaixe é um agendamento fora dos slots normais, sem validação
de horário disponível. Aparece visualmente diferenciado na agenda.

MUDANÇAS NO FORMULÁRIO DE AGENDAMENTO (AppointmentFormDialog):
1. Adicionar toggle "Encaixe" no início do formulário
2. Quando "Encaixe" ativado:
   - Campo de horário fica livre (sem restrição de slots disponíveis)
   - Exibir aviso: "Encaixe: horário fora dos slots padrão"
   - Salvar com is_fit_in = true
3. Quando desativado: comportamento normal atual

MUDANÇAS NA AGENDA VISUAL (F2-A):
1. Cards de encaixe: borda tracejada laranja + badge pequeno "ENCAIXE"
   no canto superior direito do card
2. Slots normais livres NÃO devem mostrar "Encaixe" — apenas o toggle
   no formulário ativa esse modo

MUDANÇAS NA LISTAGEM:
- Filtro adicional: checkbox "Mostrar encaixes" (default: mostrado)
- Badge visual "ENCAIXE" na linha/card do agendamento em todas as views
```

---

## F2-C — Agenda por Equipamento / Exames

### SQL necessário — executar ANTES do prompt
```sql
-- Tabela de equipamentos
CREATE TABLE IF NOT EXISTS equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT, -- 'ultrassom', 'eletrocardiograma', 'raio_x', etc.
  room_id UUID REFERENCES rooms(id),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_equipment" ON equipment
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- Coluna na tabela de agendamentos
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS equipment_id UUID REFERENCES equipment(id);
```

### Prompt para o Lovable

```
[CONTEXTO FIXO ACIMA]

IMPLEMENTAR: Agenda e Agendamentos por Equipamento (Exames)

O banco já tem a tabela "equipment" e a coluna equipment_id em appointments.

PARTE 1 — CRUD de Equipamentos:
Adicionar aba "Equipamentos" na página /rooms (ou /settings, onde fizer
mais sentido visualmente).
Campos do equipamento: Nome (obrigatório), Tipo (texto livre, ex: Ultrassom),
Sala vinculada (select das rooms existentes, opcional), Ativo (toggle).
CRUD completo com tabela listando todos os equipamentos do tenant.

PARTE 2 — Agendamento por Equipamento:
No formulário de agendamento (AppointmentFormDialog):
1. Adicionar toggle no topo: "Consulta | Exame"
2. Quando "Exame" selecionado:
   - Substituir o seletor de profissional por seletor de equipamento
     (busca na tabela equipment WHERE active = true)
   - Campo de profissional técnico responsável (opcional)
   - Salvar com equipment_id preenchido e professional_id opcional
3. Quando "Consulta": comportamento atual, equipment_id = null

PARTE 3 — Agenda Visual:
No toggle "Profissionais | Equipamentos" da agenda (implementado em F2-A):
- Aba "Equipamentos": colunas = equipamentos ativos, mesma lógica de grade
- Cards de exame: ícone de equipamento no card para diferenciar visualmente
```

---

---

# FASE 3 — Procedimentos, Precificação e Documentos Clínicos

> **Duração estimada:** 2 semanas
> **Pré-requisito:** Fase 1 concluída. F2 pode correr em paralelo.

---

## F3-A — Módulo de Procedimentos com Categorias

### SQL necessário — executar ANTES do prompt
```sql
-- Categorias de procedimentos
CREATE TABLE IF NOT EXISTS procedure_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE procedure_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_procedure_categories" ON procedure_categories
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- Procedimentos
CREATE TABLE IF NOT EXISTS procedures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id UUID REFERENCES procedure_categories(id),
  name TEXT NOT NULL,
  description TEXT,
  default_price NUMERIC(10,2) DEFAULT 0,
  duration_minutes INT DEFAULT 30,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_procedures" ON procedures
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- Procedimento no agendamento
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS procedure_id UUID REFERENCES procedures(id);

-- Valor final no agendamento (pode sobrescrever o padrão)
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS price_charged NUMERIC(10,2);
```

### Prompt para o Lovable

```
[CONTEXTO FIXO ACIMA]

IMPLEMENTAR: Módulo de Procedimentos e Categorias

O banco já tem as tabelas procedure_categories e procedures, e appointments
já tem as colunas procedure_id e price_charged.

NOVA PÁGINA: /procedures (adicionar ao sidebar com ícone de tag/lista)
Acesso: admin e professional.

LAYOUT DA PÁGINA:
- Cabeçalho com título "Procedimentos" + botão "+ Nova Categoria" + botão "+ Novo Procedimento"
- Abas horizontais: uma aba por categoria + aba "Todos"
  (abas coloridas com a cor da categoria)
- Tabela de procedimentos com colunas: Nome, Categoria (badge colorido),
  Duração, Valor padrão, Ativo (toggle inline)
- Botões de editar e arquivar por linha

FORMULÁRIO DE CATEGORIA (modal):
- Nome (obrigatório)
- Cor (color picker simples com 8 cores pré-definidas)

FORMULÁRIO DE PROCEDIMENTO (modal):
- Nome (obrigatório)
- Categoria (select das categorias ativas)
- Descrição (textarea, opcional)
- Duração padrão em minutos (número)
- Valor padrão R$ (número com 2 casas decimais)
- Ativo (toggle)

SEED de categorias iniciais (criar automaticamente se o tenant não tiver nenhuma):
Consultas (#3B82F6), Exames (#8B5CF6), Procedimentos Cirúrgicos (#EF4444),
Terapias (#10B981), Vacinas e Aplicações (#F59E0B), Outros (#6B7280)

INTEGRAÇÃO COM AGENDAMENTO:
No AppointmentFormDialog, adicionar campo "Procedimento" (select das procedures
ativas). Ao selecionar, preencher automaticamente o campo de valor com
default_price do procedimento selecionado (editável manualmente).
O valor final vai para appointments.price_charged.
```

---

## F3-B — Convênios e Tabela de Preços por Modalidade

### SQL necessário — executar ANTES do prompt
```sql
-- Convênios e planos de saúde
CREATE TABLE IF NOT EXISTS health_insurances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('convenio', 'plano_proprio')),
  ans_registry TEXT, -- número de registro na ANS (opcional)
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE health_insurances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_health_insurances" ON health_insurances
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- Preços por modalidade (particular, por convênio, etc.)
CREATE TABLE IF NOT EXISTS procedure_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  procedure_id UUID NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
  health_insurance_id UUID REFERENCES health_insurances(id), -- null = particular
  price_type TEXT NOT NULL CHECK (price_type IN ('particular','convenio','plano_proprio','desconto')),
  price NUMERIC(10,2) NOT NULL,
  tuss_code TEXT, -- código TUSS para convênios
  cbhpm_code TEXT, -- código CBHPM para convênios
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE procedure_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_procedure_prices" ON procedure_prices
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

-- Vincular paciente ao convênio (substituir campo texto atual)
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS health_insurance_id UUID REFERENCES health_insurances(id);

ALTER TABLE patients
ADD COLUMN IF NOT EXISTS health_insurance_plan TEXT; -- plano/modalidade dentro do convênio

-- Desconto manual por agendamento
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS discount_override NUMERIC(10,2);
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS payment_type TEXT CHECK (payment_type IN ('particular','convenio','plano_proprio'));
```

### Prompt para o Lovable

```
[CONTEXTO FIXO ACIMA]

IMPLEMENTAR: Convênios e Precificação por Modalidade

O banco já tem as tabelas health_insurances e procedure_prices, e as
colunas health_insurance_id / health_insurance_plan em patients, e
discount_override / payment_type em appointments.

PARTE 1 — CRUD de Convênios:
Adicionar aba "Convênios" na página /procedures (ou /settings/financial).
Campos: Nome (obrigatório), Tipo (Convênio / Plano Próprio), Registro ANS
(texto opcional), Ativo.

PARTE 2 — Preços por Convênio no Procedimento:
No formulário de procedimento (F3-A), adicionar seção "Tabela de Preços":
- Linha "Particular": valor padrão (já existe)
- Botão "+ Adicionar preço para convênio": abre linha com select de convênio
  + campo valor + campos opcionais Código TUSS e Código CBHPM
- Pode ter N linhas, uma por convênio

PARTE 3 — Convênio no Cadastro do Paciente:
No formulário de paciente (PatientFormDialog), substituir o campo de texto
"Convênio" por:
- Select "Convênio / Plano" buscando em health_insurances
- Campo "Plano/Modalidade" (texto livre, ex: "Enfermaria", "Apartamento")

PARTE 4 — Preço Automático por Convênio no Agendamento:
No AppointmentFormDialog, adicionar campo "Modalidade de pagamento"
(Particular / Convênio / Plano Próprio).
Lógica de preenchimento automático do valor:
1. Se paciente tem convênio vinculado: sugerir "Convênio" como modalidade
2. Ao selecionar procedimento + modalidade: buscar em procedure_prices o
   preço correspondente — se não existir para o convênio, usar particular
   com aviso "Preço particular aplicado (sem tabela para este convênio)"
3. Campo valor sempre editável manualmente
4. Campo "Desconto" (R$) opcional, salvo em discount_override
```

---

## F3-C — Documentos Clínicos em PDF

### SQL necessário — executar ANTES do prompt
```sql
-- Tabela centralizada de documentos clínicos emitidos
CREATE TABLE IF NOT EXISTS clinical_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id),
  professional_id UUID NOT NULL REFERENCES professionals(id),
  patient_id UUID NOT NULL REFERENCES patients(id),
  type TEXT NOT NULL CHECK (type IN (
    'receita', 'receituario_especial', 'atestado',
    'solicitacao_exame', 'encaminhamento'
  )),
  content JSONB, -- conteúdo estruturado do documento
  pdf_url TEXT,  -- URL no Supabase Storage após geração
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE clinical_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_clinical_documents" ON clinical_documents
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);
```

### Prompt para o Lovable

```
[CONTEXTO FIXO ACIMA]

IMPLEMENTAR: Geração de Documentos Clínicos em PDF

O banco já tem a tabela clinical_documents.
A biblioteca jsPDF já está instalada no projeto.

CONTEXTO: Dentro de um atendimento ativo (status in_progress), o profissional
precisa emitir documentos clínicos. Os PDFs devem seguir o padrão visual
exigido pelo CFM: dados completos do médico, dados do paciente, conteúdo
estruturado, data e campo para assinatura.

IMPLEMENTAR 4 TIPOS DE DOCUMENTO — cada um como um modal separado,
acessível por botões dentro da tela de atendimento/consulta:

────────────────────────────────────
1. RECEITA MÉDICA SIMPLES
────────────────────────────────────
Botão "📋 Receita" → modal com:
- Campo de texto grande para medicações (ex: "Amoxicilina 500mg — 1 comp. 8/8h por 7 dias")
- Botão "+ Adicionar medicamento" para linha estruturada: nome + dosagem + posologia
- Campo observações

PDF gerado contém:
- Cabeçalho: nome do médico, CRM/UF, especialidade, nome + endereço da clínica
- "RECEITA MÉDICA" centralizado
- Dados do paciente: nome, CPF, data de nascimento
- Lista de medicamentos numerada
- Data e cidade
- Linha para assinatura + nome + CRM

────────────────────────────────────
2. ATESTADO MÉDICO
────────────────────────────────────
Botão "📄 Atestado" → modal com:
- Dias de afastamento (número)
- Data de início do afastamento (date picker)
- CID (texto livre, opcional)
- Finalidade (select: repouso / trabalho / escolar / outros)
- Observações (texto livre)

────────────────────────────────────
3. SOLICITAÇÃO DE EXAME
────────────────────────────────────
Botão "🔬 Solicitar Exame" → modal com:
- Lista de exames (campo de adição dinâmica, ex: "Hemograma completo")
- Hipótese diagnóstica (texto livre)
- CID (texto livre, opcional)
- Urgência (toggle Normal / Urgente)
- Observações

────────────────────────────────────
4. ENCAMINHAMENTO (básico — modal expandido na Fase 4)
────────────────────────────────────
Botão "↗ Encaminhar" → modal básico com:
- Profissional destino interno (select dos professionals) OU externo (nome + CRM)
- Especialidade destino
- CID (texto livre, opcional)
- Motivo (textarea, obrigatório)
- Observações

────────────────────────────────────
COMPORTAMENTO COMUM A TODOS OS DOCUMENTOS:
- Botão "Gerar PDF" → gera via jsPDF, abre preview em nova aba
- Botão "Download" → salva arquivo com nome padronizado
  (ex: "receita_joao_silva_2026-03-16.pdf")
- Ao gerar: INSERT em clinical_documents com type, content (JSONB), professional_id,
  patient_id, appointment_id, tenant_id
- Na aba "Prontuário" do paciente: listar documentos emitidos com tipo, data
  e botão de reimpressão

Layout PDF (todos os documentos):
- Fonte: Arial ou Helvetica
- Cabeçalho fixo com linha separadora
- Rodapé: "Documento emitido eletronicamente em [data] — [nome da clínica]"
- Papel A4, margens 2cm
```

---

---

# FASE 4 — Encaminhamento Médico Completo

> **Duração estimada:** 0,5 semana
> **Pré-requisito:** F3-C concluída (tabela clinical_documents + botão básico de encaminhamento).

---

## F4-A — Módulo Completo de Encaminhamento

### SQL necessário — executar ANTES do prompt
```sql
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id),
  from_professional_id UUID NOT NULL REFERENCES professionals(id),
  to_professional_id UUID REFERENCES professionals(id), -- null se externo
  to_specialty_id UUID REFERENCES specialties(id),
  to_external BOOLEAN DEFAULT FALSE,
  external_name TEXT,
  external_crm TEXT,
  external_specialty TEXT,
  cid_code TEXT,
  reason TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_referrals" ON referrals
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);
```

### Prompt para o Lovable

```
[CONTEXTO FIXO ACIMA]

EXPANDIR: Modal de Encaminhamento (substituir o básico criado em F3-C)

O banco já tem a tabela referrals. A tabela clinical_documents já existe.

SUBSTITUIR o modal básico de encaminhamento por uma versão completa:

MODAL DE ENCAMINHAMENTO — 2 abas internas:
────────────────────────────
Aba 1: "Profissional Interno"
- Select de profissional (busca em professionals WHERE active = true)
- Ao selecionar: exibir especialidade e agenda próximos horários disponíveis
- Checkbox "Criar agendamento automático": se marcado, abre mini-seletor de
  data/hora → ao confirmar, cria appointments com status='scheduled',
  professional_id do destino e patient_id atual
────────────────────────────
Aba 2: "Profissional Externo"
- Nome completo (obrigatório)
- Especialidade (obrigatório)
- CRM e UF (obrigatório)
- Endereço/clínica (opcional)
────────────────────────────
Campos comuns (abaixo das abas):
- CID-10: campo com autocomplete (pode ser texto livre — não precisa base completa)
- Motivo do encaminhamento (textarea, obrigatório, mínimo 20 caracteres)
- Observações clínicas (textarea, opcional)

AO CONFIRMAR:
1. INSERT em referrals com todos os dados
2. Gerar PDF de encaminhamento via jsPDF contendo:
   - Cabeçalho: nome + CRM/UF + especialidade + endereço da clínica do médico emissor
   - "ENCAMINHAMENTO MÉDICO" centralizado com data e cidade
   - Dados do paciente: nome, CPF, data de nascimento
   - Para: nome do profissional destino, especialidade, CRM (se externo)
   - CID, motivo do encaminhamento, observações
   - Linha para assinatura + nome + CRM do emissor
3. INSERT em clinical_documents (type = 'encaminhamento')
4. Se agendamento automático foi criado: exibir toast com link para o agendamento

HISTÓRICO:
Na aba "Prontuário" ou "Encaminhamentos" do paciente: listar referrals
emitidos e recebidos, com tipo (interno/externo), data e botão de reimpressão.
```

---

---

# FASE 5 — Kits de Estoque e Saída Automática

> **Duração estimada:** 2 semanas
> **Pré-requisito:** F3-A concluída (tabela procedures com kit_id).

---

## F5-A — CRUD de Kits de Estoque

### SQL necessário — executar ANTES do prompt
```sql
CREATE TABLE IF NOT EXISTS stock_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE stock_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_stock_kits" ON stock_kits
  USING (tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid);

CREATE TABLE IF NOT EXISTS stock_kit_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kit_id UUID NOT NULL REFERENCES stock_kits(id) ON DELETE CASCADE,
  stock_item_id UUID NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  quantity NUMERIC(10,3) NOT NULL DEFAULT 1
);

-- Vincular kit ao procedimento
ALTER TABLE procedures
ADD COLUMN IF NOT EXISTS kit_id UUID REFERENCES stock_kits(id);
```

### Prompt para o Lovable

```
[CONTEXTO FIXO ACIMA]

IMPLEMENTAR: Kits de Estoque

O banco já tem as tabelas stock_kits e stock_kit_items, e procedures
já tem a coluna kit_id.

PARTE 1 — Aba "Kits" na página /stock:
Adicionar nova aba "Kits" na página de estoque, ao lado das abas existentes.

Listagem de kits: tabela com Nome, Nº de itens, Status (ativo/inativo),
botões Editar e Arquivar.

Formulário de kit (modal):
- Nome (obrigatório)
- Descrição (opcional)
- Seção "Itens do Kit":
  - Select de item de estoque (busca em stock_items WHERE active = true)
  - Campo quantidade (número com decimais)
  - Botão "+ Adicionar item"
  - Lista de itens adicionados com botão de remover
- Para cada item na lista, exibir o estoque atual entre parênteses
  (ex: "Agulha 40x12 (estoque: 150 un)")
- Se estoque de algum item estiver abaixo do mínimo: destacar em vermelho

PARTE 2 — Vincular Kit ao Procedimento:
No formulário de procedimento (F3-A), adicionar campo "Kit consumido":
- Select das stock_kits ativas (ou "Nenhum")
- Ao selecionar um kit: exibir abaixo a lista de itens com quantidades e
  estoque atual de cada um
- Salvar em procedures.kit_id
```

---

## F5-B — Saída Automática de Estoque ao Finalizar Atendimento

### SQL necessário — executar ANTES do prompt
```sql
-- Adicionar rastreabilidade na tabela de histórico de estoque
ALTER TABLE stock_history
ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES appointments(id);

ALTER TABLE stock_history
ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id);

-- Lote e recall para rastreabilidade ANVISA
ALTER TABLE stock_items
ADD COLUMN IF NOT EXISTS lot_number TEXT;

ALTER TABLE stock_items
ADD COLUMN IF NOT EXISTS recall_active BOOLEAN DEFAULT FALSE;
```

### Prompt para o Lovable

```
[CONTEXTO FIXO ACIMA]

IMPLEMENTAR: Saída Automática de Estoque ao Finalizar Atendimento

O banco já tem as colunas appointment_id e patient_id em stock_history,
e lot_number e recall_active em stock_items.

FLUXO AO CLICAR "FINALIZAR ATENDIMENTO":

ETAPA 1 — Verificar kit:
Antes de finalizar, verificar se appointments.procedure_id aponta para um
procedure que tem kit_id preenchido.

Se NÃO tem kit: finalizar normalmente (comportamento atual).

Se TEM kit: abrir modal "Consumo de Estoque" ANTES de completar a finalização.

ETAPA 2 — Modal "Consumo de Estoque":
Título: "Confirmar consumo de materiais"
Subtítulo: "Kit: [nome do kit]"

Tabela com os itens do kit:
| Item          | Qtd padrão | Qtd a consumir | Estoque atual | Status  |
|---------------|------------|----------------|---------------|---------|
| Agulha 40x12  | 1          | [input editável]| 150 un       | ✅ OK   |
| Seringa 3ml   | 1          | [input editável]| 3 un         | ⚠️ Baixo|
| Triancil 40mg | 1          | [input editável]| 0 un         | ❌ Sem estoque|

- Campos "Qtd a consumir" são editáveis (padrão = quantidade do kit)
- Linha com estoque insuficiente: fundo vermelho claro, aviso "Estoque insuficiente"
- Permitir confirmar mesmo com estoque insuficiente (registra saída negativa com aviso)

Botões: "Cancelar" (volta sem finalizar) | "Confirmar e Finalizar"

ETAPA 3 — Ao confirmar:
Para cada item da lista:
1. INSERT em stock_history:
   - type = 'saida'
   - quantity = (quantidade consumida negativa, ex: -1)
   - stock_item_id = id do item
   - appointment_id = id do agendamento atual
   - patient_id = id do paciente do agendamento
   - notes = "Consumo automático — kit [nome]"
   - tenant_id correto
2. UPDATE stock_items SET quantity = quantity - qtd_consumida
3. Após todos os inserts: UPDATE appointments SET status = 'completed'
4. Gerar transação financeira (INSERT em financial_transactions com o
   valor de appointments.price_charged)

ALERTA DE RECALL:
Se qualquer item do kit tiver recall_active = true:
Antes de abrir o modal de estoque, exibir alerta vermelho:
"⚠️ RECALL ATIVO: [nome do item] — verifique com o fornecedor antes de usar."
```

---

---

# FASE 6 — Conformidade Normativa

> **Duração estimada:** 1 semana
> **Pré-requisito:** Fase 1 e Fase 5 concluídas.

---

## F6-A — Imutabilidade do Prontuário (CFM 1.821/2007)

### SQL necessário — executar ANTES do prompt
```sql
-- Trigger que impede deleção de registros de prontuário
CREATE OR REPLACE FUNCTION prevent_medical_record_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Registros de prontuário não podem ser excluídos. Use adendos para correções. (CFM 1.821/2007)';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER block_medical_record_delete
BEFORE DELETE ON medical_records
FOR EACH ROW EXECUTE FUNCTION prevent_medical_record_delete();

-- Coluna para adendos/correções
ALTER TABLE medical_records
ADD COLUMN IF NOT EXISTS parent_record_id UUID REFERENCES medical_records(id);

ALTER TABLE medical_records
ADD COLUMN IF NOT EXISTS is_addendum BOOLEAN DEFAULT FALSE;
```

### Prompt para o Lovable

```
[CONTEXTO FIXO ACIMA]

IMPLEMENTAR: Imutabilidade do Prontuário

O banco já tem o trigger que bloqueia DELETE em medical_records.
As colunas parent_record_id e is_addendum já foram adicionadas.

MUDANÇAS NA INTERFACE:

1. REMOVER o botão "Excluir" de todos os registros de prontuário.
   (O trigger no banco já bloqueia, mas a UI não deve nem mostrar a opção)

2. SUBSTITUIR por botão "Adicionar adendo/correção":
   - Abre modal com textarea "Adendo ao registro de [data]"
   - Campo obrigatório, mínimo 10 caracteres
   - Ao salvar: INSERT em medical_records com:
     - parent_record_id = id do registro original
     - is_addendum = true
     - content = texto do adendo
     - professional_id = profissional logado
     - Todos os campos obrigatórios normais

3. EXIBIÇÃO na timeline do prontuário:
   - Registros com adendos: exibir indicador "📎 [N] adendo(s)"
   - Ao expandir: listar adendos abaixo do registro original com
     indentação e label "ADENDO — [data] — [profissional]"

4. AVISO no topo da tela de prontuário:
   Banner informativo (não intrusivo, apenas na primeira vez ou colapsável):
   "Os registros de prontuário são imutáveis conforme CFM 1.821/2007.
    Use adendos para correções."
```

---

## F6-B — Controle de Acesso ao Prontuário (CFM 2.217/2018)

### SQL necessário — executar ANTES do prompt
```sql
-- RLS mais granular em medical_records
-- Profissional só vê prontuários onde ele é o responsável
-- Admin e recepcionista autorizada vêem todos

-- Primeiro, garantir que a política atual não conflite
DROP POLICY IF EXISTS "tenant_isolation_medical_records" ON medical_records;

CREATE POLICY "medical_records_access" ON medical_records
  USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
    AND (
      -- Admin vê tudo do tenant
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
      OR
      -- Profissional vê apenas seus próprios registros
      (
        (auth.jwt() -> 'app_metadata' ->> 'role') = 'professional'
        AND professional_id = (
          SELECT id FROM professionals
          WHERE profile_id = auth.uid()
          LIMIT 1
        )
      )
      OR
      -- Recepcionista pode ler (mas não editar)
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'receptionist'
    )
  );
```

### Prompt para o Lovable

```
[CONTEXTO FIXO ACIMA]

IMPLEMENTAR: Controle de Acesso ao Prontuário

A RLS no banco já restringe o acesso por papel. Agora garantir que a
interface respeite e informe isso corretamente.

1. Na tela de prontuário de um paciente:
   - Se o profissional logado não for o responsável pelos registros exibidos:
     mostrar aviso discreto no topo: "Você está visualizando o prontuário
     de outro profissional. Acesso registrado."
   - Recepcionistas: podem ver a lista de consultas mas NÃO podem abrir
     o conteúdo do prontuário — substituir o conteúdo por:
     "Acesso restrito — apenas profissionais de saúde podem visualizar
     o conteúdo do prontuário."

2. Registrar acesso em audit_logs:
   Sempre que um profissional abrir/visualizar um medical_record:
   INSERT em audit_logs com action = 'view_medical_record',
   record_id = id do registro, user_id = auth.uid()

3. Na listagem de pacientes (/patients):
   Para usuários com role = 'professional':
   - Exibir apenas pacientes que têm pelo menos uma consulta associada
     a esse profissional — OU todos (se admin decidir permitir)
   - Adicionar toggle nas configurações da clínica:
     "Profissionais veem todos os pacientes / apenas os seus"
```

---

## F6-C — Rastreabilidade de Materiais (ANVISA RDC 36/2013)

### SQL necessário
```sql
-- Nenhuma migração adicional. Usa lot_number e recall_active de F5-B
-- e appointment_id/patient_id em stock_history de F5-B.
```

### Prompt para o Lovable

```
[CONTEXTO FIXO ACIMA]

IMPLEMENTAR: Rastreabilidade de Materiais por Lote

PARTE 1 — Número de Lote no Cadastro de Estoque:
No formulário de item de estoque, adicionar campo "Número de Lote"
(texto opcional) e toggle "Recall ativo" (vermelho, default desligado).

PARTE 2 — Relatório de Rastreabilidade na página /stock:
Adicionar aba "Rastreabilidade".

Filtros:
- Item de estoque (select)
- Número de lote (texto livre)
- Período (date range)

Resultado em tabela:
| Data       | Paciente        | Profissional   | Qtd usada | Agendamento |
|------------|-----------------|----------------|-----------|-------------|
| 15/03/2026 | João Silva      | Dr. Pedro      | 1 un      | #12345      |
| 14/03/2026 | Maria Souza     | Dra. Ana       | 1 un      | #12344      |

- Cada linha clicável abre o agendamento correspondente
- Botão "Exportar CSV" (UTF-8 BOM) com todos os resultados filtrados

PARTE 3 — Alerta de Recall:
Se stock_items.recall_active = true para algum item:
- Banner vermelho fixo no topo da página /stock:
  "⚠️ RECALL ATIVO: [nome do item] (Lote: [lot_number])"
- O mesmo banner aparece no atendimento quando um procedimento com kit
  contendo esse item for iniciado
```

---

---

# 📋 CHECKLIST GERAL DE MIGRAÇÕES SQL

Execute nesta ordem antes dos respectivos prompts:

| # | Fase | Tabela/Objeto | Status |
|---|------|---------------|--------|
| 1 | F1-B | `appointments.arrived_at` + trigger de status | ☐ |
| 2 | F1-C | `professionals` unique constraint profile_id | ☐ |
| 3 | F2-B | `appointments.is_fit_in` | ☐ |
| 4 | F2-C | Tabela `equipment` + `appointments.equipment_id` | ☐ |
| 5 | F3-A | Tabelas `procedure_categories` + `procedures` + colunas appointments | ☐ |
| 6 | F3-B | Tabelas `health_insurances` + `procedure_prices` + colunas patients/appointments | ☐ |
| 7 | F3-C | Tabela `clinical_documents` | ☐ |
| 8 | F4-A | Tabela `referrals` | ☐ |
| 9 | F5-A | Tabelas `stock_kits` + `stock_kit_items` + `procedures.kit_id` | ☐ |
| 10 | F5-B | Colunas rastreabilidade em `stock_history` + lote/recall em `stock_items` | ☐ |
| 11 | F6-A | Trigger imutabilidade + colunas adendo em `medical_records` | ☐ |
| 12 | F6-B | RLS granular em `medical_records` | ☐ |

---

*ClinicFlow — Plano Lovable v4.0 — Março 2026*
