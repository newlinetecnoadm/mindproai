import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Key, Globe, Shield, CreditCard } from "lucide-react";

const configs = [
  {
    title: "Stripe",
    description: "Gateway de pagamento para assinaturas",
    icon: CreditCardIcon,
    status: "pendente",
    fields: [
      { label: "Publishable Key", placeholder: "pk_live_..." },
      { label: "Secret Key", placeholder: "sk_live_..." },
      { label: "Webhook Secret", placeholder: "whsec_..." },
    ],
  },
  {
    title: "Google OAuth",
    description: "Login social com Google (gerenciado pelo Lovable Cloud)",
    icon: Globe,
    status: "ativo",
    fields: [],
  },
  {
    title: "API de IA",
    description: "Modelos de IA para sugestões de diagramas (gerenciado pelo Lovable Cloud)",
    icon: Key,
    status: "ativo",
    fields: [],
  },
];

function CreditCardIcon(props: any) {
  return <Key {...props} />;
}

const AdminSettings = () => {
  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 max-w-4xl">
        <h1 className="text-2xl font-display font-bold mb-1">Configurações de APIs</h1>
        <p className="text-muted-foreground mb-8">Gerencie integrações e chaves de API</p>

        <div className="space-y-4">
          {configs.map((config) => (
            <div key={config.title} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <config.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{config.title}</h3>
                    <p className="text-sm text-muted-foreground">{config.description}</p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={config.status === "ativo"
                    ? "bg-success/10 text-success border-success/20"
                    : "bg-warning/10 text-warning border-warning/20"
                  }
                >
                  {config.status}
                </Badge>
              </div>

              {config.fields.length > 0 ? (
                <div className="space-y-3 max-w-lg">
                  {config.fields.map((field) => (
                    <div key={field.label}>
                      <Label className="text-xs">{field.label}</Label>
                      <Input placeholder={field.placeholder} type="password" className="h-9 font-mono text-xs" />
                    </div>
                  ))}
                  <Button variant="hero" size="sm" className="text-xs">
                    <Shield className="w-3.5 h-3.5 mr-1" /> Salvar Configuração
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Configuração gerenciada automaticamente.</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettings;
