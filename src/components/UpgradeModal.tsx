import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, ArrowRight } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: "diagrama" | "board" | "feature";
  currentCount?: number;
  maxCount?: number;
  planName: string;
  featureLabel?: string;
}

const UpgradeModal = ({
  open,
  onOpenChange,
  resource,
  currentCount = 0,
  maxCount = 0,
  planName,
  featureLabel,
}: UpgradeModalProps) => {
  const navigate = useNavigate();

  const isFeatureGate = resource === "feature";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center items-center">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <Crown className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">
            {isFeatureGate ? "Recurso exclusivo Pro" : "Limite atingido"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isFeatureGate ? (
              <>
                <strong>{featureLabel || "Este recurso"}</strong> está disponível apenas no plano{" "}
                <strong>Pro</strong>. Você está no plano <strong>{planName}</strong>.
              </>
            ) : (
              <>
                Você atingiu o limite de{" "}
                <strong>
                  {maxCount} {resource === "diagrama" ? "diagramas" : "boards"}
                </strong>{" "}
                do plano <strong>{planName}</strong>. Atualmente você tem{" "}
                <strong>{currentCount}</strong>{" "}
                {resource === "diagrama" ? "diagrama" : "board"}
                {currentCount !== 1 ? "s" : ""}.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 my-2">
          <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <Crown className="w-4 h-4 text-primary" />
            Faça upgrade para o Pro
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li className="flex items-center gap-2">
              <ArrowRight className="w-3 h-3 text-primary shrink-0" />
              Diagramas ilimitados
            </li>
            <li className="flex items-center gap-2">
              <ArrowRight className="w-3 h-3 text-primary shrink-0" />
              Boards ilimitados
            </li>
            <li className="flex items-center gap-2">
              <ArrowRight className="w-3 h-3 text-primary shrink-0" />
              Exportar PDF + sugestões de IA
            </li>
            <li className="flex items-center gap-2">
              <ArrowRight className="w-3 h-3 text-primary shrink-0" />
              Até 10 convidados por projeto
            </li>
          </ul>
        </div>

        <div className="flex gap-2 mt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Voltar
          </Button>
          <Button
            variant="hero"
            className="flex-1"
            onClick={() => {
              onOpenChange(false);
              navigate("/assinaturas");
            }}
          >
            <Crown className="w-4 h-4 mr-1" />
            Ver planos
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
