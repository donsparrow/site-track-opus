import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link2, KeyRound, Pencil, Trash2, Shield } from 'lucide-react';
import { roleLabels, roleBadgeVariant, roleBadgeClassName } from '../constants';
import type { UsuarioMerged } from '../types';

interface Props {
  users: UsuarioMerged[];
  isSuperAdmin: boolean;
  currentUserId: string | undefined;
  onEditar: (u: UsuarioMerged) => void;
  onPermissoes: (u: UsuarioMerged) => void;
  onVincularObras: (u: UsuarioMerged) => void;
  onRedefinirSenha: (u: UsuarioMerged) => void;
  onExcluir: (u: UsuarioMerged) => void;
}

export default function UsuariosTable({
  users, isSuperAdmin, currentUserId,
  onEditar, onPermissoes, onVincularObras, onRedefinirSenha, onExcluir,
}: Props) {
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail (Login)</TableHead>
              <TableHead>Tipo</TableHead>
              {isSuperAdmin && <TableHead>Empresa</TableHead>}
              <TableHead>Obras Vinculadas</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nome || '—'}</TableCell>
                <TableCell>{u.email || '—'}</TableCell>
                <TableCell>
                  <Badge variant={roleBadgeVariant[u.role] || 'secondary'} className={roleBadgeClassName[u.role] || ''}>
                    {roleLabels[u.role] || u.role}
                  </Badge>
                </TableCell>
                {isSuperAdmin && (
                  <TableCell>
                    <span className="text-sm">{u.empresa_nome}</span>
                  </TableCell>
                )}
                <TableCell>
                  {(u.obras_count || 0) > 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs px-2 py-1 h-auto underline-offset-2 hover:underline"
                      onClick={() => onVincularObras(u)}
                      title="Ver obras vinculadas"
                    >
                      {u.obras_count === 1 ? '1 obra' : `${u.obras_count} obras`}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">0 obras</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap">
                    {u.user_id !== currentUserId && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => onEditar(u)} title="Editar usuário">
                          <Pencil className="h-4 w-4 mr-1" /> Editar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onPermissoes(u)} title="Permissões">
                          <Shield className="h-4 w-4 mr-1" /> Permissões
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onVincularObras(u)} title="Vincular obras">
                          <Link2 className="h-4 w-4 mr-1" /> Obras
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => onRedefinirSenha(u)} title="Redefinir senha">
                          <KeyRound className="h-4 w-4 mr-1" /> Senha
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => onExcluir(u)} title="Excluir usuário">
                          <Trash2 className="h-4 w-4 mr-1" /> Excluir
                        </Button>
                      </>
                    )}
                    {u.user_id === currentUserId && (
                      <span className="text-xs text-muted-foreground">Você</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
