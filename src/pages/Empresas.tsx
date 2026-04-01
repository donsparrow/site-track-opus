import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, Edit, Eye, Power, LogIn, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Navigate } from 'react-router-dom';

interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  email: string | null;
  plano: string;
  status: string;
  created_at: string;
  obras_count: number;
}

export default function Empresas() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editDialog, setEditDialog] = useState(false);
  const [viewDialog, setViewDialog] = useState(false);
  const [selected, setSelected] = useState<Empresa | null>(null);
  const [editForm, setEditForm] = useState({ nome: '', cnpj: '', email: '', plano: 'basico', status: 'ativo' });

  const fetchEmpresas = async () => {
    setLoading(true);
    const { data: empresasData } = await supabase
      .from('empresas')
      .select('*')
      .order('created_at', { ascending: false });

    if (empresasData) {
      const { data: obrasData } = await supabase
        .from('obras')
        .select('id, empresa_id');

      const obrasCount: Record<string, number> = {};
      (obrasData || []).forEach((o: any) => {
        if (o.empresa_id) {
          obrasCount[o.empresa_id] = (obrasCount[o.empresa_id] || 0) + 1;
        }
      });

      setEmpresas(empresasData.map((e: any) => ({
        ...e,
        obras_count: obrasCount[e.id] || 0,
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const handleEdit = (empresa: Empresa) => {
    setSelected(empresa);
    setEditForm({
      nome: empresa.nome,
      cnpj: empresa.cnpj || '',
      email: empresa.email || '',
      plano: empresa.plano,
      status: empresa.status,
    });
    setEditDialog(true);
  };

  const handleView = (empresa: Empresa) => {
    setSelected(empresa);
    setViewDialog(true);
  };

  const handleSave = async () => {
    if (!selected) return;
    const { error } = await supabase
      .from('empresas')
      .update({
        nome: editForm.nome,
        cnpj: editForm.cnpj || null,
        email: editForm.email || null,
        plano: editForm.plano,
        status: editForm.status,
      } as any)
      .eq('id', selected.id);

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Empresa atualizada com sucesso' });
      setEditDialog(false);
      fetchEmpresas();
    }
  };

  const handleToggleStatus = async (empresa: Empresa) => {
    const newStatus = empresa.status === 'ativo' ? 'inativo' : 'ativo';
    const { error } = await supabase
      .from('empresas')
      .update({ status: newStatus } as any)
      .eq('id', empresa.id);

    if (error) {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Empresa ${newStatus === 'ativo' ? 'ativada' : 'desativada'}` });
      fetchEmpresas();
    }
  };

  const filtered = empresas.filter(e =>
    e.nome.toLowerCase().includes(search.toLowerCase()) ||
    (e.cnpj && e.cnpj.includes(search)) ||
    (e.email && e.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Empresas</h1>
          <p className="text-sm text-muted-foreground">Gerenciamento de empresas do sistema</p>
        </div>
        <Badge variant="outline" className="w-fit">
          {empresas.length} empresa{empresas.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CNPJ ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Obras</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        Nenhuma empresa encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((empresa) => (
                      <TableRow key={empresa.id}>
                        <TableCell className="font-medium">{empresa.nome}</TableCell>
                        <TableCell>{empresa.cnpj || '—'}</TableCell>
                        <TableCell>{empresa.email || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">{empresa.plano}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={empresa.status === 'ativo' ? 'default' : 'destructive'}>
                            {empresa.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{empresa.obras_count}</TableCell>
                        <TableCell>
                          {format(new Date(empresa.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" onClick={() => handleView(empresa)} title="Visualizar">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => handleEdit(empresa)} title="Editar">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleToggleStatus(empresa)}
                              title={empresa.status === 'ativo' ? 'Desativar' : 'Ativar'}
                            >
                              <Power className={`h-4 w-4 ${empresa.status === 'ativo' ? 'text-destructive' : 'text-green-600'}`} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={viewDialog} onOpenChange={setViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selected?.nome}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">CNPJ:</span> {selected.cnpj || '—'}</div>
                <div><span className="text-muted-foreground">Email:</span> {selected.email || '—'}</div>
                <div><span className="text-muted-foreground">Plano:</span> <Badge variant="secondary" className="capitalize">{selected.plano}</Badge></div>
                <div><span className="text-muted-foreground">Status:</span> <Badge variant={selected.status === 'ativo' ? 'default' : 'destructive'}>{selected.status}</Badge></div>
                <div><span className="text-muted-foreground">Obras:</span> {selected.obras_count}</div>
                <div><span className="text-muted-foreground">Cadastro:</span> {format(new Date(selected.created_at), 'dd/MM/yyyy', { locale: ptBR })}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialog} onOpenChange={setEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input value={editForm.nome} onChange={(e) => setEditForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div>
              <Label>CNPJ</Label>
              <Input value={editForm.cnpj} onChange={(e) => setEditForm(f => ({ ...f, cnpj: e.target.value }))} />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <Label>Plano</Label>
              <Select value={editForm.plano} onValueChange={(v) => setEditForm(f => ({ ...f, plano: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basico">Básico</SelectItem>
                  <SelectItem value="profissional">Profissional</SelectItem>
                  <SelectItem value="empresarial">Empresarial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
