import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import logoSistema from '@/assets/logo-sistema.jpeg';

const REMEMBER_KEY = 'gestaopro:last-email';

export default function Auth() {
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-primary">
        <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setErro(null);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        setErro(error.message);
        toast.error(error.message);
      } else {
        if (remember) localStorage.setItem(REMEMBER_KEY, email);
        else localStorage.removeItem(REMEMBER_KEY);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[hsl(221_35%_8%)]">
      {/* Branding */}
      <aside className="relative overflow-hidden bg-primary lg:w-[26%] lg:min-h-screen px-6 py-8 lg:px-8 lg:py-12 flex lg:flex-col justify-between items-center lg:items-start gap-4">
        {/* malha técnica sutil */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.10]"
          style={{
            backgroundImage:
              'linear-gradient(to right, hsl(var(--primary-foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--primary-foreground)) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rotate-45 border border-primary-foreground/10 hidden lg:block"
        />

        <div className="relative z-10 flex items-center gap-3 lg:block">
          <div className="h-12 w-12 lg:h-[92px] lg:w-auto overflow-hidden rounded-md bg-primary-foreground/95 p-1 lg:p-2 inline-flex">
            <img src={logoSistema} alt="J&A GestãoPro" className="h-full w-auto object-contain" />
          </div>
          <div className="lg:mt-6">
            <p className="font-display text-lg lg:text-2xl font-semibold text-primary-foreground leading-tight">
              GestãoPro
            </p>
            <p className="mt-0.5 text-[10px] lg:text-[11px] uppercase tracking-[0.22em] text-primary-foreground/55">
              Plataforma de Gestão
            </p>
          </div>
        </div>

        <div className="relative z-10 hidden lg:block">
          <div className="h-px w-14 bg-accent mb-5" />
          <p className="text-sm leading-relaxed text-primary-foreground/75">
            Engenharia, obras e operação sob controle — do planejamento à entrega,
            em um único ambiente digital.
          </p>
        </div>

        <div className="relative z-10 hidden lg:flex items-center gap-2 text-[11px] text-primary-foreground/50">
          <ShieldCheck className="h-3.5 w-3.5" />
          Acesso restrito e monitorado
        </div>
      </aside>

      {/* Formulário */}
      <main className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[420px]">
            <h1 className="font-display text-2xl sm:text-[28px] font-semibold text-white tracking-tight">
              Bem-vindo ao GestãoPro!
            </h1>
            <p className="mt-1.5 text-sm text-white/55">Acesse sua conta para continuar.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate={false}>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[11px] uppercase tracking-[0.14em] text-white/55">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setErro(null); }}
                    required
                    aria-invalid={!!erro}
                    className="h-11 pl-9 bg-white/[0.04] border-white/12 text-white placeholder:text-white/30 focus-visible:ring-accent focus-visible:border-accent/60"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-[11px] uppercase tracking-[0.14em] text-white/55">
                  Senha
                </Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setErro(null); }}
                    required
                    minLength={6}
                    aria-invalid={!!erro}
                    className="h-11 pl-9 pr-10 bg-white/[0.04] border-white/12 text-white placeholder:text-white/30 focus-visible:ring-accent focus-visible:border-accent/60"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-white/45 hover:text-white/80 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {erro && (
                <p role="alert" className="text-xs text-destructive-foreground bg-destructive/20 border border-destructive/40 rounded-md px-3 py-2">
                  {erro}
                </p>
              )}

              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                  className="border-white/25 data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                />
                <Label htmlFor="remember" className="text-sm font-normal text-white/65 cursor-pointer">
                  Manter conectado
                </Label>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 bg-accent text-accent-foreground hover:bg-accent/90 font-medium"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent-foreground/40 border-t-accent-foreground" />
                    Entrando...
                  </span>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-white/40">
              Problemas para acessar? Fale com o administrador do sistema.
            </p>
          </div>
        </div>

        <footer className="px-5 py-4 border-t border-white/[0.06]">
          <p className="text-center text-[11px] text-white/35">
            © 2026 Grupo J&A Engenharia LTDA. Soluções inteligentes em engenharia.
          </p>
        </footer>
      </main>
    </div>
  );
}
