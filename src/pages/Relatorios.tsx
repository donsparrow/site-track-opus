import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Calendar, Clock, BarChart3, PenTool, History, Download } from 'lucide-react';
import { toast } from 'sonner';
import { gerarRelatorioPDF } from '@/lib/pdfRelatorio';
import SignatureCanvas from 'react-signature-canvas';

// Business days calculation (Mon-Fri)
function calcBusinessDays(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

export default function Relatorios() {
  const { canEdit, user, role } = useAuth();
  const [obras, setObras] = useState<any[]>([]);
  const [selectedObra, setSelectedObra] = useState('');
  const [obraData, setObraData] = useState<any>(null);

  // Period
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');

  // Computed data
  const [prazos, setPrazos] = useState({ contratual: 0, parados: 0, ajustado: 0, trabalhados: 0, saldo: 0 });
  const [diarios, setDiarios] = useState<any[]>([]);
  const [allEquipe, setAllEquipe] = useState<any[]>([]);
  const [allAtividades, setAllAtividades] = useState<any[]>([]);
  const [allMateriais, setAllMateriais] = useState<any[]>([]);
  const [allOcorrencias, setAllOcorrencias] = useState<any[]>([]);
  const [allImagens, setAllImagens] = useState<any[]>([]);
  const [paralisacoes, setParalisacoes] = useState<any[]>([]);

  // Versions & signatures
  const [relatorioId, setRelatorioId] = useState<string | null>(null);
  const [versoes, setVersoes] = useState<any[]>([]);
  const [assinaturas, setAssinaturas] = useState<any[]>([]);
  const [signOpen, setSignOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [empresa, setEmpresa] = useState<any>(null);

  const sigRef = useRef<SignatureCanvas>(null);
  const [signName, setSignName] = useState('');
  const [signCargo, setSignCargo] = useState('');
  const [signTipo, setSignTipo] = useState('responsavel_tecnico');

  useEffect(() => {
    supabase.from('obras').select('id, nome, data_inicio, data_fim_prevista, endereco, responsavel, clientes(nome, cpf_cnpj, email, telefone)').order('nome').then(({ data }) => setObras(data || []));
    supabase.from('configuracoes_empresa').select('*').limit(1).single().then(({ data }) => setEmpresa(data));
  }, []);

  useEffect(() => {
    if (selectedObra) {
      const obra = obras.find(o => o.id === selectedObra);
      setObraData(obra);
      if (obra?.data_inicio) setPeriodoInicio(obra.data_inicio);
      if (obra?.data_fim_prevista) setPeriodoFim(obra.data_fim_prevista);
    }
  }, [selectedObra, obras]);

  const consolidar = async () => {
    if (!selectedObra || !periodoInicio || !periodoFim) return;

    // Fetch diarios in period
    const { data: diariosList } = await supabase
      .from('diario_obra')
      .select('*')
      .eq('obra_id', selectedObra)
      .gte('data', periodoInicio)
      .lte('data', periodoFim)
      .order('data');
    const dList = diariosList || [];
    setDiarios(dList);

    const diarioIds = dList.map(d => d.id);

    if (diarioIds.length > 0) {
      const [eq, at, mt, oc, im, pa] = await Promise.all([
        supabase.from('diario_equipe').select('*').in('diario_id', diarioIds),
        supabase.from('diario_atividades').select('*').in('diario_id', diarioIds),
        supabase.from('diario_materiais').select('*').in('diario_id', diarioIds),
        supabase.from('diario_ocorrencias').select('*').in('diario_id', diarioIds),
        supabase.from('diario_imagens').select('*').in('diario_id', diarioIds),
        supabase.from('diario_paralisacoes').select('*').in('diario_id', diarioIds),
      ]);
      setAllEquipe(eq.data || []);
      setAllAtividades(at.data || []);
      setAllMateriais(mt.data || []);
      setAllOcorrencias(oc.data || []);
      setAllImagens(im.data || []);
      setParalisacoes(pa.data || []);
    } else {
      setAllEquipe([]); setAllAtividades([]); setAllMateriais([]); setAllOcorrencias([]); setAllImagens([]); setParalisacoes([]);
    }

    // Calculate prazos
    const obra = obras.find(o => o.id === selectedObra);
    const prazoContratual = obra?.data_inicio && obra?.data_fim_prevista
      ? calcBusinessDays(obra.data_inicio, obra.data_fim_prevista)
      : 0;

    // Sum paralisacoes days in this period
    let diasParados = 0;
    if (diarioIds.length > 0) {
      const { data: parData } = await supabase
        .from('diario_paralisacoes')
        .select('total_dias')
        .in('diario_id', diarioIds);
      diasParados = (parData || []).reduce((s, p) => s + (p.total_dias || 0), 0);
    }

    const diasTrabalhados = dList.length;
    const prazoAjustado = prazoContratual + diasParados;
    const saldoPrazo = prazoAjustado - diasTrabalhados;

    setPrazos({
      contratual: prazoContratual,
      parados: diasParados,
      ajustado: prazoAjustado,
      trabalhados: diasTrabalhados,
      saldo: saldoPrazo,
    });

    // Find or create relatorio
    let { data: relatorio } = await supabase
      .from('relatorios')
      .select('id')
      .eq('obra_id', selectedObra)
      .gte('data_inicio', periodoInicio)
      .lte('data_fim', periodoFim)
      .single();

    if (!relatorio) {
      const { data: newRel } = await supabase
        .from('relatorios')
        .insert({
          obra_id: selectedObra,
          data_inicio: periodoInicio,
          data_fim: periodoFim,
          prazo_contratual_dias_uteis: prazoContratual,
          dias_parados: diasParados,
          dias_trabalhados: diasTrabalhados,
          prazo_ajustado: prazoAjustado,
          saldo_prazo: saldoPrazo,
        })
        .select()
        .single();
      relatorio = newRel;

      // Create version 1
      if (relatorio && user) {
        await supabase.from('relatorio_versoes').insert({
          relatorio_id: relatorio.id,
          numero_versao: 1,
          criado_por: user.id,
          status: 'rascunho',
          descricao_alteracao: 'Criação do relatório',
        });
        await supabase.from('relatorio_logs').insert({
          relatorio_id: relatorio.id,
          usuario_id: user.id,
          acao: 'criou',
        });
      }
    } else {
      // Update existing
      await supabase.from('relatorios').update({
        prazo_contratual_dias_uteis: prazoContratual,
        dias_parados: diasParados,
        dias_trabalhados: diasTrabalhados,
        prazo_ajustado: prazoAjustado,
        saldo_prazo: saldoPrazo,
      }).eq('id', relatorio.id);
    }

    if (relatorio) {
      setRelatorioId(relatorio.id);
      const { data: vers } = await supabase.from('relatorio_versoes').select('*').eq('relatorio_id', relatorio.id).order('numero_versao', { ascending: false });
      setVersoes(vers || []);
      const { data: assin } = await supabase.from('assinaturas').select('*').eq('relatorio_id', relatorio.id).order('data_assinatura');
      setAssinaturas(assin || []);
    }

    toast.success('Dados consolidados!');
  };

  const handleGerarPDF = async () => {
    if (!obraData) { toast.error('Selecione uma obra e consolide os dados'); return; }
    if (!empresa) { toast.info('Dados da empresa não configurados. O PDF será gerado sem cabeçalho/logo.'); }
    setGenerating(true);
    const latestVersion = versoes.length > 0 ? versoes[0].numero_versao : 1;
    try {
      await gerarRelatorioPDF({
        empresa: empresa || {},
        obra: {
          nome: obraData.nome,
          endereco: obraData.endereco || '',
          cliente_nome: obraData.clientes?.nome || '',
          cliente_cpf_cnpj: obraData.clientes?.cpf_cnpj || '',
          cliente_email: obraData.clientes?.email || '',
          cliente_telefone: obraData.clientes?.telefone || '',
        },
        periodo: { inicio: periodoInicio, fim: periodoFim },
        prazos,
        diarios,
        equipe: allEquipe,
        atividades: allAtividades,
        materiais: allMateriais,
        ocorrencias: allOcorrencias,
        imagens: allImagens,
        assinaturas,
        versao: latestVersion,
      });
      toast.success('PDF gerado!');

      // Log
      if (relatorioId && user) {
        await supabase.from('relatorio_logs').insert({
          relatorio_id: relatorioId,
          usuario_id: user.id,
          acao: 'gerou PDF',
        });
      }
    } catch (err: any) {
      toast.error('Erro ao gerar PDF: ' + err.message);
    }
    setGenerating(false);
  };

  const handleSign = async () => {
    if (!sigRef.current || sigRef.current.isEmpty()) { toast.error('Desenhe sua assinatura'); return; }
    if (!signName || !relatorioId) return;

    const dataUrl = sigRef.current.toDataURL('image/png');
    const blob = await (await fetch(dataUrl)).blob();
    const filePath = `assinaturas/${relatorioId}/${Date.now()}.png`;
    const { error: upErr } = await supabase.storage.from('anexos').upload(filePath, blob);
    if (upErr) { toast.error(upErr.message); return; }
    const { data: urlData } = supabase.storage.from('anexos').getPublicUrl(filePath);

    const { error } = await supabase.from('assinaturas').insert({
      relatorio_id: relatorioId,
      tipo: signTipo,
      nome_assinante: signName,
      cargo: signCargo || null,
      tipo_assinatura: 'desenho',
      assinatura_url: urlData.publicUrl,
    });
    if (error) { toast.error(error.message); return; }

    // Create new version as signed
    if (user) {
      const nextVersion = versoes.length > 0 ? versoes[0].numero_versao + 1 : 1;
      await supabase.from('relatorio_versoes').insert({
        relatorio_id: relatorioId,
        numero_versao: nextVersion,
        criado_por: user.id,
        status: 'assinado',
        descricao_alteracao: `Assinado por ${signName}`,
      });
      await supabase.from('relatorio_logs').insert({
        relatorio_id: relatorioId,
        usuario_id: user.id,
        acao: 'assinou',
      });
    }

    toast.success('Assinatura registrada!');
    setSignOpen(false);
    setSignName(''); setSignCargo('');
    consolidar();
  };

  const saldoColor = prazos.saldo > 0 ? 'text-success' : prazos.saldo < 0 ? 'text-destructive' : 'text-foreground';

  return (
    <div>
      <h1 className="text-3xl font-display font-bold mb-8">Relatórios</h1>

      {/* Obra & Period Selection */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <Label>Obra</Label>
              <Select value={selectedObra} onValueChange={setSelectedObra}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {obras.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Início</Label>
              <Input type="date" value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} />
            </div>
            <Button onClick={consolidar} disabled={!selectedObra || !periodoInicio || !periodoFim} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <BarChart3 className="h-4 w-4 mr-2" />Consolidar
            </Button>
          </div>
        </CardContent>
      </Card>

      {relatorioId && (
        <>
          {/* Dados do Cliente */}
          {obraData?.clientes && (
            <Card className="mb-6">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-display">Dados do Cliente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div><span className="text-muted-foreground">Nome:</span> <span className="font-medium">{obraData.clientes.nome || '—'}</span></div>
                  <div><span className="text-muted-foreground">CNPJ/CPF:</span> <span className="font-medium">{obraData.clientes.cpf_cnpj || '—'}</span></div>
                  <div><span className="text-muted-foreground">E-mail:</span> <span className="font-medium">{obraData.clientes.email || '—'}</span></div>
                  <div><span className="text-muted-foreground">Telefone:</span> <span className="font-medium">{obraData.clientes.telefone || '—'}</span></div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Indicators */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Prazo Contratual', value: `${prazos.contratual} dias`, icon: Calendar },
              { label: 'Dias Parados', value: `${prazos.parados} dias`, icon: Clock, color: 'text-destructive' },
              { label: 'Prazo Ajustado', value: `${prazos.ajustado} dias`, icon: Calendar },
              { label: 'Dias Trabalhados', value: `${prazos.trabalhados} dias`, icon: BarChart3 },
              { label: 'Saldo de Prazo', value: `${prazos.saldo} dias`, icon: Clock, color: saldoColor },
            ].map(item => (
              <Card key={item.label}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                  </div>
                  <p className={`text-lg font-display font-bold ${item.color || ''}`}>{item.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mb-6">
            {canEdit && (
              <Button onClick={handleGerarPDF} disabled={generating} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Download className="h-4 w-4 mr-2" />{generating ? 'Gerando...' : 'Gerar PDF'}
              </Button>
            )}
            <Button variant="outline" onClick={() => setSignOpen(true)}>
              <PenTool className="h-4 w-4 mr-2" />Assinar
            </Button>
          </div>

          {/* Content Tabs */}
          <Tabs defaultValue="resumo">
            <TabsList>
              <TabsTrigger value="resumo">Resumo</TabsTrigger>
              <TabsTrigger value="assinaturas">Assinaturas ({assinaturas.length})</TabsTrigger>
              <TabsTrigger value="versoes">Versões ({versoes.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="resumo">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-sm font-display">Diários no Período</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold font-display">{diarios.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">registros encontrados</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-sm font-display">Equipe</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold font-display">{allEquipe.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">registros de equipe</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-sm font-display">Atividades</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold font-display">{allAtividades.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">atividades registradas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-3"><CardTitle className="text-sm font-display">Ocorrências</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold font-display">{allOcorrencias.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {allOcorrencias.filter(o => o.impacto === 'alto').length} de alto impacto
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="assinaturas">
              <Card>
                <CardContent className="pt-6">
                  {assinaturas.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma assinatura registrada</p>
                  ) : (
                    <div className="space-y-4">
                      {assinaturas.map(a => (
                        <div key={a.id} className="flex items-center gap-4 p-3 border rounded-lg">
                          <img src={a.assinatura_url} alt="Assinatura" className="h-16 w-24 object-contain border rounded" />
                          <div>
                            <p className="font-medium">{a.nome_assinante}</p>
                            {a.cargo && <p className="text-sm text-muted-foreground">{a.cargo}</p>}
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={a.tipo === 'responsavel_tecnico' ? 'default' : 'secondary'}>
                                {a.tipo === 'responsavel_tecnico' ? 'Resp. Técnico' : 'Cliente'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{new Date(a.data_assinatura + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="versoes">
              <Card>
                <CardContent className="pt-6">
                  {versoes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhuma versão</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Versão</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {versoes.map(v => (
                          <TableRow key={v.id}>
                            <TableCell className="font-bold">v{v.numero_versao}</TableCell>
                            <TableCell>
                              <Badge variant={v.status === 'assinado' ? 'default' : v.status === 'finalizado' ? 'secondary' : 'outline'}>
                                {v.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{v.descricao_alteracao || '—'}</TableCell>
                            <TableCell>{new Date(v.data_criacao).toLocaleDateString('pt-BR')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Signature Dialog */}
      <Dialog open={signOpen} onOpenChange={setSignOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display">Assinatura Digital</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nome *</Label><Input value={signName} onChange={e => setSignName(e.target.value)} required /></div>
            <div><Label>Cargo</Label><Input value={signCargo} onChange={e => setSignCargo(e.target.value)} /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={signTipo} onValueChange={setSignTipo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="responsavel_tecnico">Responsável Técnico</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Desenhe sua assinatura</Label>
              <div className="border rounded-lg bg-white">
                <SignatureCanvas
                  ref={sigRef}
                  canvasProps={{ className: 'w-full h-40', style: { width: '100%', height: '160px' } }}
                  penColor="black"
                />
              </div>
              <Button variant="ghost" size="sm" className="mt-1" onClick={() => sigRef.current?.clear()}>Limpar</Button>
            </div>
            <Button onClick={handleSign} className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={!signName}>
              Confirmar Assinatura
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
