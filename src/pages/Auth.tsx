import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import constructionHero from '@/assets/construction-hero.jpg';
import logoSistema from '@/assets/logo-sistema.jpeg';
import GlobalFooter from '@/components/GlobalFooter';

export default function Auth() {
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await signIn(email, password);
      if (error) toast.error(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center">
      <img src={constructionHero} alt="" className="absolute inset-0 w-full h-full object-cover" width={1920} height={1080} />
      <div className="absolute inset-0 bg-primary/70" />
      <Card className="relative z-10 w-full max-w-md mx-4 border-0 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-[114px] w-auto items-center justify-center rounded-xl overflow-hidden">
            <img src={logoSistema} alt="J&A GestãoPro" className="h-full w-auto object-contain" />
          </div>
          <CardTitle className="leading-none tracking-tight text-base text-center font-medium mx-[63px] px-0 rounded-none shadow-none">
            Entrar
          </CardTitle>
          <p className="text-muted-foreground mt-1 font-sans text-left text-xs font-extralight">Identifique-se para acesso ao sistema</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={submitting}>
              {submitting ? 'Aguarde...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <GlobalFooter variant="overlay" />
      </div>
    </div>
  );
}
