import { ReactNode, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Kanban,
  ListChecks,
  Zap,
  Rocket,
  BookOpen,
  Target,
  Users,
  Layers,
} from "lucide-react";

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  color: string;
  columns: string[];
  cards?: Record<string, string[]>; // column title -> card titles
}

export const boardTemplates: BoardTemplate[] = [
  {
    id: "blank",
    name: "Em branco",
    description: "Board vazio com 3 colunas padrão",
    icon: <Kanban className="w-5 h-5" />,
    color: "#6366f1",
    columns: ["A Fazer", "Em Progresso", "Concluído"],
  },
  {
    id: "gtd",
    name: "GTD (Getting Things Done)",
    description: "Método de produtividade de David Allen",
    icon: <ListChecks className="w-5 h-5" />,
    color: "#10b981",
    columns: ["Inbox", "Próximas Ações", "Aguardando", "Projetos", "Algum Dia / Talvez", "Concluído"],
    cards: {
      "Inbox": ["Processar e-mails pendentes", "Revisar notas da reunião", "Organizar mesa de trabalho"],
      "Próximas Ações": ["Responder proposta do cliente", "Agendar dentista"],
      "Aguardando": ["Feedback do gestor sobre relatório"],
      "Projetos": ["Redesign do site", "Planejamento trimestral"],
      "Algum Dia / Talvez": ["Aprender um novo idioma", "Curso de fotografia"],
    },
  },
  {
    id: "kanban-dev",
    name: "Desenvolvimento de Software",
    description: "Fluxo de desenvolvimento com code review",
    icon: <Zap className="w-5 h-5" />,
    color: "#3b82f6",
    columns: ["Backlog", "To Do", "In Progress", "Code Review", "QA", "Done"],
    cards: {
      "Backlog": ["Implementar dark mode", "Melhorar performance do dashboard", "Adicionar export CSV"],
      "To Do": ["Corrigir bug no login", "Atualizar dependências"],
      "In Progress": ["Refatorar componente de tabela"],
    },
  },
  {
    id: "sprint",
    name: "Sprint Planning",
    description: "Planejamento de sprints ágeis",
    icon: <Rocket className="w-5 h-5" />,
    color: "#8b5cf6",
    columns: ["Sprint Backlog", "Em Desenvolvimento", "Em Revisão", "Teste", "Pronto para Deploy", "Deployed"],
    cards: {
      "Sprint Backlog": ["US-001: Cadastro de usuários", "US-002: Tela de relatórios", "US-003: Notificações push"],
      "Em Desenvolvimento": ["US-004: Dashboard analytics"],
    },
  },
  {
    id: "content",
    name: "Calendário de Conteúdo",
    description: "Planejamento de posts e publicações",
    icon: <BookOpen className="w-5 h-5" />,
    color: "#ec4899",
    columns: ["Ideias", "Rascunho", "Em Revisão", "Agendado", "Publicado"],
    cards: {
      "Ideias": ["Post sobre produtividade", "Vídeo tutorial React", "Thread sobre IA", "Infográfico de métricas"],
      "Rascunho": ["Artigo: 10 dicas de UX"],
      "Agendado": ["Post Instagram — lançamento v2"],
    },
  },
  {
    id: "okr",
    name: "OKRs & Metas",
    description: "Acompanhamento de objetivos e resultados-chave",
    icon: <Target className="w-5 h-5" />,
    color: "#f97316",
    columns: ["Objetivos", "Key Results", "Iniciativas", "Em Andamento", "Concluído"],
    cards: {
      "Objetivos": ["Aumentar receita em 30%", "Melhorar NPS para 80+", "Expandir para 3 novos mercados"],
      "Key Results": ["KR1: 500 novos clientes/mês", "KR2: Reduzir churn para < 3%"],
      "Iniciativas": ["Campanha de referral", "Programa de onboarding"],
    },
  },
  {
    id: "crm",
    name: "CRM / Pipeline de Vendas",
    description: "Funil de vendas com etapas",
    icon: <Users className="w-5 h-5" />,
    color: "#14b8a6",
    columns: ["Leads", "Primeiro Contato", "Proposta Enviada", "Negociação", "Fechado ✓", "Perdido ✗"],
    cards: {
      "Leads": ["Empresa ABC Ltda", "João Silva — Freelancer", "Startup XYZ"],
      "Primeiro Contato": ["Maria Santos — E-commerce"],
      "Proposta Enviada": ["Tech Corp — Plano Enterprise"],
    },
  },
  {
    id: "design",
    name: "Design Sprint",
    description: "Processo de design em 5 dias",
    icon: <Layers className="w-5 h-5" />,
    color: "#a855f7",
    columns: ["Entender", "Divergir", "Decidir", "Prototipar", "Testar"],
    cards: {
      "Entender": ["Mapear jornada do usuário", "Entrevistar 5 clientes", "Analisar concorrência"],
      "Divergir": ["Crazy 8s — ideação rápida", "Brainstorm de soluções"],
      "Decidir": ["Votação por pontos", "Storyboard da solução"],
    },
  },
];

interface NewBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateBoard: (title: string, template: BoardTemplate) => void;
  isPending?: boolean;
}

const NewBoardDialog = ({ open, onOpenChange, onCreateBoard, isPending }: NewBoardDialogProps) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("blank");
  const [boardTitle, setBoardTitle] = useState("");

  const template = boardTemplates.find((t) => t.id === selectedTemplate) || boardTemplates[0];

  const handleCreate = () => {
    if (!boardTitle.trim()) {
      return;
    }
    onCreateBoard(boardTitle.trim(), template);
    setBoardTitle("");
    setSelectedTemplate("blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar novo Board</DialogTitle>
          <DialogDescription>Escolha um template ou comece do zero</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label className="text-xs text-muted-foreground">Nome do board</Label>
            <Input
              value={boardTitle}
              onChange={(e) => setBoardTitle(e.target.value)}
              placeholder="Ex: Projeto Marketing"
              className="mt-1"
            />
            {!boardTitle.trim() && (
              <p className="text-xs text-muted-foreground mt-1.5">Insira um nome para continuar</p>
            )}
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Template</Label>
            <div className="grid grid-cols-2 gap-2">
              {boardTemplates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplate(t.id)}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                    selectedTemplate === t.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-primary/20"
                  )}
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-white"
                    style={{ backgroundColor: t.color }}
                  >
                    {t.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Prévia das colunas:</p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {template.columns.map((col) => (
                <div key={col} className="rounded-md bg-card border border-border p-2 min-w-0">
                  <p className="text-xs font-semibold truncate mb-1">{col}</p>
                  {template.cards?.[col]?.slice(0, 2).map((card) => (
                    <div key={card} className="text-[10px] text-muted-foreground bg-muted rounded px-1.5 py-1 mb-1 truncate">
                      {card}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="hero"
            className="w-full"
            onClick={handleCreate}
            disabled={isPending || !boardTitle.trim()}
          >
            {isPending ? "Criando..." : "Criar Board"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewBoardDialog;
