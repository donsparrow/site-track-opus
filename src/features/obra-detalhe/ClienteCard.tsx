import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, MessageCircle, MapPin, Mail, User, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export interface ClienteObra {
  nome: string | null; cpf_cnpj: string | null; telefone: string | null;
  email: string | null; endereco: string | null; administradora: string | null;
}

async function copiar(texto: string, rotulo: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(`${rotulo} copiado`);
  } catch {
    toast.error('Não foi possível copiar');
  }
}

function Campo({ rotulo, valor, acao }: { rotulo: string; valor: string | null; acao?: { href: string; label: string; icon: typeof Mail } }) {
  const v = valor?.trim() || null;
  const Icon = acao?.icon;
  return (
    <div className="min-w-0 rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{rotulo}</p>
      <div className="mt-1 flex items-center gap-1">
        <p className="min-w-0 flex-1 break-words text-sm font-medium">{v ?? '—'}</p>
        {v && acao && Icon && (
          <Button asChild variant="ghost" size="icon" className="h-10 w-10 shrink-0 lg:h-8 lg:w-8" aria-label={acao.label} title={acao.label}>
            <a href={acao.href} target={acao.href.startsWith('mailto:') ? undefined : '_blank'} rel="noopener noreferrer"><Icon className="h-4 w-4" /></a>
          </Button>
        )}
        {v && (
          <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 lg:h-8 lg:w-8" aria-label={`Copiar ${rotulo}`} title="Copiar" onClick={() => copiar(v, rotulo)}>
            <Copy className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function ClienteCard({ cliente, podeAbrirCadastro }: { cliente: ClienteObra | null; podeAbrirCadastro: boolean }) {
  const digitos = cliente?.telefone?.replace(/\D/g, '') ?? '';
  return (
    <Card className="mb-6 min-w-0">
      <CardHeader className="flex flex-col gap-2 pb-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <CardTitle className="flex items-center gap-2 font-display text-base"><User className="h-5 w-5 text-accent" /> Cliente</CardTitle>
        {cliente && podeAbrirCadastro && (
          <Button asChild variant="outline" size="sm" className="min-h-10 w-full sm:w-auto lg:min-h-9">
            <Link to="/clientes"><ExternalLink className="mr-1 h-4 w-4" /> Abrir cadastro</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!cliente ? (
          <p className="text-sm text-muted-foreground">Nenhum cliente vinculado</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Campo rotulo="Nome" valor={cliente.nome} />
            <Campo rotulo="CPF/CNPJ" valor={cliente.cpf_cnpj} />
            <Campo rotulo="Telefone" valor={cliente.telefone}
              acao={digitos ? { href: `https://wa.me/55${digitos}`, label: 'Abrir no WhatsApp', icon: MessageCircle } : undefined} />
            <Campo rotulo="E-mail" valor={cliente.email}
              acao={cliente.email ? { href: `mailto:${cliente.email.trim()}`, label: 'Enviar e-mail', icon: Mail } : undefined} />
            <Campo rotulo="Endereço" valor={cliente.endereco}
              acao={cliente.endereco ? { href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cliente.endereco)}`, label: 'Abrir no Google Maps', icon: MapPin } : undefined} />
            <Campo rotulo="Administradora" valor={cliente.administradora} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
