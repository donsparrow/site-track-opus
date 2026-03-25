import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function Clientes() {
  const { canEdit } = useAuth();
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [endereco, setEndereco] = useState('');
  const [administradora, setAdministradora] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchClientes = async () => {
    setLoading(true);
    const { data } = await supabase.from('clientes').select('*').order('nome');
    setClientes(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchClientes(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('clientes').insert({
      nome,
      cpf_cnpj: cpfCnpj || null,
      endereco: endereco || null,
      administradora: administradora || null,
      telefone: telefone || null,
      email: email || null,
    });
    setSaving(false);
    if (error) toast.error('Erro: ' + error.message);
    else {
      toast.success('Cliente cadastrado!');
      setNome(''); setCpfCnpj(''); setEndereco(''); setAdministradora(''); setTelefone(''); setEmail('');
      setDialogOpen(false);
      fetchClientes();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground mt-1">Gerenciamento de clientes e condomínios</p>
        </div>
        {canEdit && (
          <Button onClick={() => setDialogOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="h-4 w-4 mr-2" /> Novo Cliente
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" />
        </div>
      ) : clientes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">Nenhum cliente cadastrado</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF/CNPJ</TableHead>
                  <TableHead>Administradora</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{c.cpf_cnpj || '—'}</TableCell>
                    <TableCell>{c.administradora || '—'}</TableCell>
                    <TableCell>{c.telefone || '—'}</TableCell>
                    <TableCell>{c.email || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Novo Cliente</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Nome *</Label><Input value={nome} onChange={e => setNome(e.target.value)} required /></div>
            <div><Label>CPF/CNPJ</Label><Input value={cpfCnpj} onChange={e => setCpfCnpj(e.target.value)} /></div>
            <div><Label>Endereço</Label><Input value={endereco} onChange={e => setEndereco(e.target.value)} /></div>
            <div><Label>Administradora</Label><Input value={administradora} onChange={e => setAdministradora(e.target.value)} /></div>
            <div><Label>Telefone</Label><Input value={telefone} onChange={e => setTelefone(e.target.value)} /></div>
            <div><Label>E-mail</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving}>
              {saving ? 'Salvando...' : 'Cadastrar Cliente'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
