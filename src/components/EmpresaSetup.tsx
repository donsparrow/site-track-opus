import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';

export default function EmpresaSetup() {
  const { user, isAdmin, isSuperAdmin, empresaId, refreshEmpresa } = useAuth();
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [saving, setSaving] = useState(false);

  // Super admin doesn't need an empresa to use the system
  const open = isAdmin && !isSuperAdmin && !empresaId;

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

      toast.success('Empresa configurada com sucesso!');
      await refreshEmpresa();
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Building2 className="h-5 w-5 text-accent" />
            Configurar Empresa
          </DialogTitle>
          <DialogDescription>
            Para começar a usar o sistema, cadastre os dados da sua empresa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome da Empresa *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Ex: J&A Engenharia" />
          </div>
          <div>
            <Label>CNPJ</Label>
            <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
          </div>
          <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving}>
            {saving ? 'Salvando...' : 'Cadastrar Empresa'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
