import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Building2, Plus, Clock } from 'lucide-react';

export default function EmpresaSetup() {
  const { user, isSuperAdmin, empresaId, hasCheckedEmpresa, refreshEmpresa } = useAuth();
  const [step, setStep] = useState<'choose' | 'create'>('choose');
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [endereco, setEndereco] = useState('');
  const [saving, setSaving] = useState(false);

  // Only show modal after empresa check is complete
  const open = hasCheckedEmpresa && !!user && !isSuperAdmin && empresaId === null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !user) return;
    setSaving(true);

    try {
      const { data, error } = await supabase.rpc('create_empresa_and_link', {
        _nome: nome.trim(),
        _cnpj: cnpj || null,
      });

      if (error) throw error;

      // Save additional config if provided
      if (data && (telefone || email || endereco)) {
        await supabase.from('configuracoes_empresa').insert({
          empresa_id: data,
          nome_empresa: nome.trim(),
          cnpj: cnpj || null,
          telefone: telefone || null,
          email: email || null,
          endereco: endereco || null,
        });
      }

      toast.success('Empresa criada com sucesso! Você agora é Diretor.');
      await refreshEmpresa();
      // Force page reload to refresh role/permissions
      window.location.reload();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Building2 className="h-5 w-5 text-accent" />
            {step === 'choose' ? 'Vincular Empresa' : 'Criar Nova Empresa'}
          </DialogTitle>
          <DialogDescription>
            {step === 'choose'
              ? 'Você ainda não está vinculado a uma empresa. Escolha uma opção abaixo.'
              : 'Preencha os dados da sua empresa. Você será definido como Diretor.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'choose' ? (
          <div className="space-y-3">
            <Button
              onClick={() => setStep('create')}
              className="w-full justify-start gap-3 h-auto py-4 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Plus className="h-5 w-5 shrink-0" />
              <div className="text-left">
                <div className="font-semibold">Criar Nova Empresa</div>
                <div className="text-xs opacity-80">Cadastre sua empresa e torne-se Diretor</div>
              </div>
            </Button>

            <div className="w-full border rounded-lg p-4 flex items-start gap-3 bg-muted/50">
              <Clock className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-semibold text-sm">Aguardar liberação do administrador</div>
                <div className="text-xs text-muted-foreground">
                  Se você foi convidado por uma empresa, aguarde o administrador vincular sua conta.
                </div>
              </div>
            </div>

            <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleSignOut}>
              Sair da conta
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome da Empresa *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Ex: J&A Engenharia" />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com" />
            </div>
            <div>
              <Label>Endereço</Label>
              <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, número, cidade" />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep('choose')} disabled={saving}>
                Voltar
              </Button>
              <Button type="submit" className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving}>
                {saving ? 'Criando...' : 'Criar Empresa'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
