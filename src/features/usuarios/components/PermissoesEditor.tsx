import { Shield } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { MODULOS, MODULO_LABELS } from '@/hooks/usePermissions';
import type { PermissaoState } from '../types';

interface Props {
  perms: PermissaoState;
  setPerms: (p: PermissaoState) => void;
  disabled?: boolean;
}

export default function PermissoesEditor({ perms, setPerms, disabled }: Props) {
  const toggle = (modulo: string, field: 'v' | 'c' | 'e' | 'x') => {
    setPerms({
      ...perms,
      [modulo]: { ...perms[modulo], [field]: !perms[modulo][field] },
    });
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="bg-muted px-3 py-2 flex items-center gap-2">
        <Shield className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Permissões de Acesso</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left px-3 py-2 font-medium">Módulo</th>
              <th className="text-center px-2 py-2 font-medium">Ver</th>
              <th className="text-center px-2 py-2 font-medium">Criar</th>
              <th className="text-center px-2 py-2 font-medium">Editar</th>
              <th className="text-center px-2 py-2 font-medium">Excluir</th>
            </tr>
          </thead>
          <tbody>
            {MODULOS.map(m => (
              <tr key={m} className="border-b last:border-b-0">
                <td className="px-3 py-2 text-muted-foreground">{MODULO_LABELS[m]}</td>
                <td className="text-center px-2 py-2">
                  <Switch checked={perms[m]?.v || false} onCheckedChange={() => toggle(m, 'v')} disabled={disabled} />
                </td>
                <td className="text-center px-2 py-2">
                  <Switch checked={perms[m]?.c || false} onCheckedChange={() => toggle(m, 'c')} disabled={disabled} />
                </td>
                <td className="text-center px-2 py-2">
                  <Switch checked={perms[m]?.e || false} onCheckedChange={() => toggle(m, 'e')} disabled={disabled} />
                </td>
                <td className="text-center px-2 py-2">
                  <Switch checked={perms[m]?.x || false} onCheckedChange={() => toggle(m, 'x')} disabled={disabled} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
