import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import PermissoesEditor from './PermissoesEditor';
import ObrasChecklist from './ObrasChecklist';
import { getDefaultPermsForRole, generatePassword, isFullAccessRole } from '../constants';
import { useUsuariosMutations } from '../hooks/useUsuariosMutations';
import type { ObraOption, PermissaoState } from '../types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obras: ObraOption[];
  isSuperAdmin: boolean;
  empresaId: string | null;
}

export default function NovoUsuarioDialog({ open, onOpenChange, obras, isSuperAdmin, empresaId }: Props) {
  const { criarUsuario } = useUsuariosMutations();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [tipo, setTipo] = useState('cliente');
  const [obrasSelecionadas, setObrasSelecionadas] = useState<string[]>([]);
  const [perms, setPerms] = useState<PermissaoState>(getDefaultPermsForRole('cliente'));

  const resetForm = () => {
    setNome(''); setEmail(''); setSenha(''); setTipo('cliente');
    setObrasSelecionadas([]); setPerms(getDefaultPermsForRole('cliente'));
  };

  const toggleObra = (obraId: string) => {
    setObrasSelecionadas((prev) => prev.includes(obraId) ? prev.filter((id) => id !== obraId) : [...prev, obraId]);
  };

  const handleSubmit = () => {
    if (!nome || !email || !senha) {
      toast.error('Preencha nome, e-mail e senha');
      return;
    }
    if (senha.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres');
      return;
    }
    if (tipo === 'super_admin' && !isSuperAdmin) {
      toast.error('Apenas Administrador Geral pode criar outro Administrador Geral');
      return;
    }
    criarUsuario.mutate(
      { nome, email, senha, tipo, empresaId, obraIds: obrasSelecionadas, perms },
      { onSuccess: () => { resetForm(); onOpenChange(false); } },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
          </div>
          <div>
            <Label>E-mail (login) *</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
          </div>
          <div>
            <Label>Senha *</Label>
            <div className="flex gap-2">
              <Input type="text" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
              <Button type="button" variant="outline" size="icon" onClick={() => setSenha(generatePassword())} title="Gerar senha">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div>
            <Label>Tipo de Usuário</Label>
            <Select value={tipo} onValueChange={(v) => { setTipo(v); setPerms(getDefaultPermsForRole(v)); }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {isSuperAdmin && <SelectItem value="super_admin">Administrador Geral</SelectItem>}
                <SelectItem value="admin">Diretor</SelectItem>
                <SelectItem value="trabalhador">Funcionário</SelectItem>
                <SelectItem value="sindico">Síndico</SelectItem>
                <SelectItem value="cliente">Cliente</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vincular Obras</Label>
            <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2 mt-1">
              <ObrasChecklist obras={obras} selecionadas={obrasSelecionadas} onToggle={toggleObra} />
            </div>
          </div>
          <Separator />
          <PermissoesEditor perms={perms} setPerms={setPerms} disabled={isFullAccessRole(tipo)} />
          {isFullAccessRole(tipo) && (
            <p className="text-xs text-muted-foreground">Diretores sempre possuem acesso total.</p>
          )}
          <Button onClick={handleSubmit} disabled={criarUsuario.isPending} className="w-full">
            {criarUsuario.isPending ? 'Cadastrando...' : 'Cadastrar Usuário'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
