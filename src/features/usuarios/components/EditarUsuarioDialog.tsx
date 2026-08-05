import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import PermissoesEditor from './PermissoesEditor';
import ObrasChecklist from './ObrasChecklist';
import { getDefaultPermsForRole, isFullAccessRole } from '../constants';
import { useUsuariosMutations } from '../hooks/useUsuariosMutations';
import { usePermissoesUsuario } from '../hooks/usePermissoesUsuario';
import { podeAlterarRole } from '../utils';
import type { ObraOption, PermissaoState, UsuarioMerged } from '../types';

interface Props {
  usuario: UsuarioMerged | null;
  users: UsuarioMerged[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  obras: ObraOption[];
  isSuperAdmin: boolean;
}

export default function EditarUsuarioDialog({ usuario, users, open, onOpenChange, obras, isSuperAdmin }: Props) {
  const { editarUsuario } = useUsuariosMutations();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [tipo, setTipo] = useState('');
  const [obrasSelecionadas, setObrasSelecionadas] = useState<string[]>([]);
  const [perms, setPerms] = useState<PermissaoState>(getDefaultPermsForRole('cliente'));

  const permsQuery = usePermissoesUsuario(usuario?.user_id ?? null, usuario?.role ?? 'cliente', open);

  useEffect(() => {
    if (!usuario || !open) return;
    setNome(usuario.nome || '');
    setEmail(usuario.email || '');
    setTipo(usuario.role);
    setObrasSelecionadas((usuario.obras_vinculadas || []).map((l) => l.obra_id));
  }, [usuario, open]);

  useEffect(() => {
    if (permsQuery.data) setPerms(permsQuery.data);
  }, [permsQuery.data]);

  const toggleObra = (obraId: string) => {
    setObrasSelecionadas((prev) => prev.includes(obraId) ? prev.filter((id) => id !== obraId) : [...prev, obraId]);
  };

  const handleSubmit = () => {
    if (!usuario) return;
    if (!nome) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (tipo === 'super_admin' && !isSuperAdmin) {
      toast.error('Apenas Administrador Geral pode promover a Administrador Geral');
      return;
    }
    const check = podeAlterarRole(users, usuario.user_id, tipo);
    if (!check.ok) {
      toast.error(check.erro);
      return;
    }
    editarUsuario.mutate(
      { userId: usuario.user_id, nome, email, tipo, obraIds: obrasSelecionadas, perms },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
          </div>
          <div>
            <Label>Tipo de Usuário</Label>
            <Select value={tipo} onValueChange={(v) => { setTipo(v); if (isFullAccessRole(v)) setPerms(getDefaultPermsForRole(v)); }}>
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
            <Label>Obras Vinculadas</Label>
            <div className="border rounded-md p-3 max-h-48 overflow-y-auto space-y-2 mt-1">
              <ObrasChecklist obras={obras} selecionadas={obrasSelecionadas} onToggle={toggleObra} />
            </div>
          </div>
          <Separator />
          <PermissoesEditor perms={perms} setPerms={setPerms} disabled={isFullAccessRole(tipo)} />
          {isFullAccessRole(tipo) && (
            <p className="text-xs text-muted-foreground">Diretores sempre possuem acesso total.</p>
          )}
          <Button onClick={handleSubmit} disabled={editarUsuario.isPending} className="w-full">
            {editarUsuario.isPending ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
