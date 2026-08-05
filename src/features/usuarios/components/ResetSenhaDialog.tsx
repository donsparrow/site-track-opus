import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { generatePassword } from '../constants';
import { useUsuariosMutations } from '../hooks/useUsuariosMutations';
import type { UsuarioMerged } from '../types';

interface Props {
  usuario: UsuarioMerged | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ResetSenhaDialog({ usuario, open, onOpenChange }: Props) {
  const { resetSenha } = useUsuariosMutations();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (!open) return;
    setNewPassword('');
    setConfirmPassword('');
  }, [open]);

  if (!usuario) return null;

  const handleGeneratePassword = () => {
    const pwd = generatePassword();
    setNewPassword(pwd);
    setConfirmPassword(pwd);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(newPassword);
    toast.success('Senha copiada!');
  };

  const handleSubmit = () => {
    if (!newPassword || !confirmPassword) { toast.error('Preencha os campos de senha'); return; }
    if (newPassword !== confirmPassword) { toast.error('As senhas não coincidem'); return; }
    if (newPassword.length < 6) { toast.error('Senha deve ter no mínimo 6 caracteres'); return; }
    resetSenha.mutate(
      { userId: usuario.user_id, novaSenha: newPassword },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Redefinir Senha — {usuario.nome}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nova Senha *</Label>
            <div className="flex gap-2">
              <Input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              <Button type="button" variant="outline" size="icon" onClick={handleGeneratePassword} title="Gerar senha automática">
                <RefreshCw className="h-4 w-4" />
              </Button>
              {newPassword && (
                <Button type="button" variant="outline" size="icon" onClick={handleCopyPassword} title="Copiar senha">
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div>
            <Label>Confirmar Senha *</Label>
            <Input type="text" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a senha" />
          </div>
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-sm text-destructive">As senhas não coincidem</p>
          )}
          <Button onClick={handleSubmit} disabled={resetSenha.isPending || !newPassword || newPassword !== confirmPassword} className="w-full">
            {resetSenha.isPending ? 'Redefinindo...' : 'Redefinir Senha'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
