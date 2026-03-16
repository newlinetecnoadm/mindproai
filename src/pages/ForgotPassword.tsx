import { Mail, ArrowLeft, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoVerticalColor from "@/assets/logo-vertical-color.png";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setLoading(false);
    if (error) {
      toast.error("Erro ao enviar e-mail. Tente novamente.");
    } else {
      setSent(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center">
          <Link to="/" className="inline-block mb-8">
            <img src={logoVerticalColor} alt="Mind Pro AI" className="h-24 mx-auto" />
          </Link>
          <h1 className="text-2xl font-display font-bold mb-2">Recuperar Senha</h1>
          <p className="text-muted-foreground">
            {sent
              ? "Verifique sua caixa de entrada"
              : "Informe seu e-mail para receber o link de redefinição"}
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">
                Enviamos um link de redefinição para <strong className="text-foreground">{email}</strong>. 
                Verifique também a pasta de spam.
              </p>
            </div>
            <Button variant="outline" className="w-full h-12" onClick={() => setSent(false)}>
              Enviar novamente
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-10 h-12"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <Button variant="hero" className="w-full h-12" type="submit" disabled={loading}>
              {loading ? "Enviando..." : <>Enviar Link <ArrowRight className="w-4 h-4 ml-1" /></>}
            </Button>
          </form>
        )}

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary hover:underline font-medium inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Voltar ao login
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
