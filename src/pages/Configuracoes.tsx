import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { toast } from 'sonner';
import { Settings, Upload } from 'lucide-react';

export default function Configuracoes() {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configId, setConfigId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome_empresa: '',
    cnpj: '',
    endereco: '',
    telefone: '',
    email: '',
    logo_url: '',
    site: '',
    instagram: '',
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const { data } = await supabase.from('configuracoes_empresa').select('*').limit(1).single();
    if (data) {
      setConfigId(data.id);
      setForm({
        nome_empresa: data.nome_empresa || '',
        cnpj: data.cnpj || '',
        endereco: data.endereco || '',
        telefone: data.telefone || '',
        email: data.email || '',
        logo_url: data.logo_url || '',
        site: data.site || '',
        instagram: data.instagram || '',
      });
    }
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (configId) {
      const { error } = await supabase.from('configuracoes_empresa').update(form).eq('id', configId);
      if (error) toast.error(error.message);
      else toast.success('Configurações salvas!');
    } else {
      const { error } = await supabase.from('configuracoes_empresa').insert(form);
      if (error) toast.error(error.message);
      else { toast.success('Configurações criadas!'); fetchConfig(); }
    }
    setSaving(false);
  };

  const handleLogoUpload = async (file: File) => {
    const ext = file.name.split('.').pop();
    const filePath = `empresa/logo.${ext}`;
    const { error: upErr } = await supabase.storage.from('anexos').upload(filePath, file, { upsert: true });
    if (upErr) { toast.error(upErr.message); return; }
    const { data: urlData } = supabase.storage.from('anexos').getPublicUrl(filePath);
    setForm({ ...form, logo_url: urlData.publicUrl });
    toast.success('Logo enviada!');
  };

  if (!isAdmin) return <p className="text-muted-foreground">Acesso restrito ao administrador.</p>;
  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-accent border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-8">Configurações da Empresa</h1>
      <Card className="max-w-2xl">
        <CardHeader><CardTitle className="font-display flex items-center gap-2"><Settings className="h-5 w-5" />Dados da Empresa</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nome da Empresa *</Label><Input value={form.nome_empresa} onChange={e => setForm({ ...form, nome_empresa: e.target.value })} required /></div>
              <div><Label>CNPJ</Label><Input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} /></div>
            </div>
            <div><Label>Endereço</Label><Input value={form.endereco} onChange={e => setForm({ ...form, endereco: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Telefone</Label><Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Site</Label><Input value={form.site} onChange={e => setForm({ ...form, site: e.target.value })} placeholder="www.engenhariajf.com.br" /></div>
              <div><Label>Instagram</Label><Input value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="@engenhariajf" /></div>
            </div>
            <div>
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {form.logo_url && <img src={form.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded border" />}
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} />
                  <Button type="button" variant="outline" size="sm" asChild><span><Upload className="h-4 w-4 mr-1" />Enviar Logo</span></Button>
                </label>
              </div>
            </div>
            <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
