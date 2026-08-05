import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import PermissoesEditor from './PermissoesEditor';
import { getDefaultPermsForRole, isFullAccessRole, roleLabels, roleBadgeVariant, roleBadgeClassName } from '../constants';
import { useUsuariosMutations } from '../hooks/useUsuariosMutations';
import { usePermissoesUsuario } from '../hooks/usePermissoesUsuario';
import type { PermissaoState, UsuarioMerged } from '../types';

interface Props {
  usuario: UsuarioMerged | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PermissoesDialog({ usuario, open, onOpenChange }: Props) {
  const { salvarPermissoes } = useUsuariosMutations();
  const [perms, setPerms] = useState<PermissaoState>(getDefaultPermsForRole('cliente'));

  const permsQuery = usePermissoesUsuario(usuario?.user_id ?? null, usuario?.role ?? 'cliente', open);

  useEffect(() => {
    if (permsQuery.data) setPerms(permsQuery.data);
  }, [permsQuery.data]);

  if (!usuario) return null;

  const handleSubmit = () => {
    salvarPermissoes.mutate(
      { userId: usuario.user_id, perms },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permissões — {usuario.nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={roleBadgeVariant[usuario.role] || 'secondary'} className={roleBadgeClassName[usuario.role] || ''}>
              {roleLabels[usuario.role] || usuario.role}
            </Badge>
          </div>
          <PermissoesEditor perms={perms} setPerms={setPerms} disabled={isFullAccessRole(usuario.role)} />
          {isFullAccessRole(usuario.role) && (
            <p className="text-xs text-muted-foreground">Este tipo de usuário sempre possui acesso total.</p>
          )}
          <Button onClick={handleSubmit} disabled={salvarPermissoes.isPending || isFullAccessRole(usuario.role)} className="w-full">
            {salvarPermissoes.isPending ? 'Salvando...' : 'Salvar Permissões'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
