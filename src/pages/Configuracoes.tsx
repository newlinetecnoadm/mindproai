import DashboardLayout from "@/components/layout/DashboardLayout";
import { PageTransition } from "@/components/ui/transitions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, CreditCard, Bell } from "lucide-react";
import { useState } from "react";

const Configuracoes = () => {
  const [name, setName] = useState("Usuário Demo");
  const [email, setEmail] = useState("demo@mindproai.com.br");

  return (
    <DashboardLayout>
      <PageTransition className="p-6 lg:p-8 max-w-3xl">
        <h1 className="text-2xl font-display font-bold mb-1">Configurações</h1>
        <p className="text-muted-foreground mb-8">Gerencie sua conta e preferências</p>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="profile" className="gap-2">
              <User className="w-4 h-4" /> Perfil
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <CreditCard className="w-4 h-4" /> Plano & Billing
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <div className="p-6 rounded-xl border border-border bg-card space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold">{name}</p>
                  <p className="text-sm text-muted-foreground">{email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome completo</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="settings-email">E-mail</Label>
                  <Input id="settings-email" value={email} disabled className="bg-muted" />
                </div>
              </div>

              <Button variant="hero">Salvar Alterações</Button>
            </div>

            <div className="p-6 rounded-xl border border-destructive/30 bg-card">
              <h3 className="font-semibold text-destructive mb-2">Zona de Perigo</h3>
              <p className="text-sm text-muted-foreground mb-4">Excluir sua conta permanentemente. Esta ação não pode ser desfeita.</p>
              <Button variant="destructive" size="sm">Excluir Conta</Button>
            </div>
          </TabsContent>

          <TabsContent value="billing" className="space-y-6">
            <div className="p-6 rounded-xl border border-border bg-card">
              <h3 className="font-semibold mb-4">Plano Atual</h3>
              <div className="flex items-center justify-between p-4 rounded-lg bg-accent">
                <div>
                  <p className="font-bold">Trial Gratuito</p>
                  <p className="text-sm text-muted-foreground">14 dias restantes</p>
                </div>
                <Button variant="hero" size="sm">Upgrade</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Configuracoes;
