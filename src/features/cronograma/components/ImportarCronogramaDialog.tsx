import { useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, FileSpreadsheet, Trash2, Plus, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { parseImportFile, diffDays, addDaysISO, type ImportedRow } from '@/lib/cronogramaImport';

interface PreviewRow extends ImportedRow {
  _key: string;
  peso: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cronogramaId: string | null;
  startOrdem: number;
  onImported: () => void;
}

const makeKey = () => Math.random().toString(36).slice(2, 10);

export default function ImportarCronogramaDialog({ open, onOpenChange, cronogramaId, startOrdem, onImported }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [fileName, setFileName] = useState('');

  const reset = () => {
    setStep('upload');
    setRows([]);
    setFileName('');
    setParsing(false);
    setSaving(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    setFileName(file.name);
    try {
      const parsed = await parseImportFile(file);
      if (parsed.length === 0) {
        toast.error('Nenhuma atividade detectada no arquivo. Verifique o formato.');
        setParsing(false);
        return;
      }
      const equalWeight = Math.floor(100 / parsed.length);
      const preview: PreviewRow[] = parsed.map((r, i) => ({
        ...r,
        _key: makeKey(),
        peso: i === parsed.length - 1 ? 100 - equalWeight * (parsed.length - 1) : equalWeight,
      }));
      setRows(preview);
      setStep('preview');
      toast.success(`${parsed.length} atividade(s) lida(s) do arquivo`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao ler arquivo';
      toast.error(msg);
    } finally {
      setParsing(false);
    }
  };

  const updateRow = (key: string, patch: Partial<PreviewRow>) => {
    setRows(prev => prev.map(r => {
      if (r._key !== key) return r;
      const next = { ...r, ...patch };
      // Auto-recalc rules
      if (patch.data_inicio !== undefined || patch.data_fim !== undefined) {
        if (next.data_inicio && next.data_fim) {
          next.duracao_dias = diffDays(next.data_inicio, next.data_fim);
        }
      } else if (patch.duracao_dias !== undefined && next.data_inicio && patch.duracao_dias != null) {
        next.data_fim = addDaysISO(next.data_inicio, patch.duracao_dias);
      }
      return next;
    }));
  };

  const removeRow = (key: string) => setRows(prev => prev.filter(r => r._key !== key));

  const addRow = () => setRows(prev => [
    ...prev,
    { _key: makeKey(), nome_atividade: '', data_inicio: null, data_fim: null, duracao_dias: null, observacoes: null, peso: 0 },
  ]);

  const distribuirPesos = () => {
    if (rows.length === 0) return;
    const base = Math.floor(100 / rows.length);
    const rest = 100 - base * (rows.length - 1);
    setRows(prev => prev.map((r, i) => ({ ...r, peso: i === prev.length - 1 ? rest : base })));
    toast.success('Pesos distribuídos uniformemente');
  };

  // Validation
  const validation = useMemo(() => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const namesSeen = new Map<string, number>();
    let hasInvalidDate = false;
    let hasNoName = false;
    let inconsistentDuration = false;
    for (const r of rows) {
      if (!r.nome_atividade.trim()) hasNoName = true;
      const key = r.nome_atividade.trim().toLowerCase();
      if (key) namesSeen.set(key, (namesSeen.get(key) || 0) + 1);
      if (r.data_inicio && r.data_fim) {
        const a = new Date(r.data_inicio).getTime();
        const b = new Date(r.data_fim).getTime();
        if (isNaN(a) || isNaN(b) || b < a) hasInvalidDate = true;
        const calc = diffDays(r.data_inicio, r.data_fim);
        if (r.duracao_dias != null && calc != null && calc !== r.duracao_dias) inconsistentDuration = true;
      }
    }
    const duplicates = [...namesSeen.entries()].filter(([, c]) => c > 1).map(([n]) => n);
    if (hasNoName) errors.push('Existem atividades sem nome.');
    if (hasInvalidDate) errors.push('Há datas inválidas ou com fim anterior ao início.');
    if (duplicates.length) warnings.push(`Atividades duplicadas: ${duplicates.join(', ')}.`);
    if (inconsistentDuration) warnings.push('Algumas durações não correspondem ao intervalo de datas.');
    const totalPeso = rows.reduce((s, r) => s + (r.peso || 0), 0);
    if (totalPeso !== 100 && rows.length > 0) warnings.push(`Soma dos pesos é ${totalPeso}% (recomendado 100%).`);
    return { errors, warnings, totalPeso };
  }, [rows]);

  const summary = useMemo(() => {
    const validInicio = rows.map(r => r.data_inicio).filter(Boolean) as string[];
    const validFim = rows.map(r => r.data_fim).filter(Boolean) as string[];
    const minInicio = validInicio.length ? validInicio.sort()[0] : null;
    const maxFim = validFim.length ? validFim.sort()[validFim.length - 1] : null;
    const totalDuracao = minInicio && maxFim ? diffDays(minInicio, maxFim) : null;
    return { count: rows.length, minInicio, maxFim, totalDuracao, totalPeso: validation.totalPeso };
  }, [rows, validation.totalPeso]);

  const fmtBR = (iso: string | null) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleConfirm = async () => {
    if (!cronogramaId) { toast.error('Cronograma não disponível'); return; }
    if (validation.errors.length > 0) { toast.error(validation.errors[0]); return; }
    if (rows.length === 0) { toast.error('Nenhuma atividade para importar'); return; }
    setSaving(true);
    const payload = rows.map((r, i) => ({
      cronograma_id: cronogramaId,
      nome_atividade: r.nome_atividade.trim(),
      descricao: null,
      data_inicio: r.data_inicio,
      data_fim: r.data_fim,
      percentual_concluido: 0,
      status: 'nao_iniciado',
      ordem: startOrdem + i + 1,
      peso: Math.max(0, Math.min(100, Math.round(r.peso || 0))),
      tipo_atividade: 'original',
      observacoes: r.observacoes || null,
    }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from('cronograma_atividades').insert(payload as any);
    setSaving(false);
    if (error) {
      toast.error('Erro ao importar: ' + error.message);
      return;
    }
    toast.success(`${rows.length} atividade(s) importada(s) com sucesso`);
    onImported();
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Importar Cronograma
          </DialogTitle>
          <DialogDescription>
            Importe atividades a partir de PDF, XLS, XLSX ou CSV. Você poderá revisar e editar antes de salvar.
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Selecione um arquivo com colunas: <strong>Atividade</strong>, <strong>Início</strong>, <strong>Fim</strong>, <strong>Duração</strong> e <strong>Observações</strong> (opcional).
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.xls,.xlsx,.csv"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <Button onClick={() => fileRef.current?.click()} disabled={parsing}>
                {parsing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Lendo...</> : <><Upload className="h-4 w-4 mr-2" />Selecionar Arquivo</>}
              </Button>
              <p className="text-[11px] text-muted-foreground mt-3">Formatos aceitos: PDF · XLS · XLSX · CSV</p>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-xs text-muted-foreground">
                Arquivo: <strong>{fileName}</strong>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={distribuirPesos}>Distribuir pesos</Button>
                <Button size="sm" variant="outline" onClick={addRow}><Plus className="h-3 w-3 mr-1" />Linha</Button>
                <Button size="sm" variant="ghost" onClick={reset}>Trocar arquivo</Button>
              </div>
            </div>

            {/* Validation */}
            {validation.errors.map((e, i) => (
              <Alert key={`e${i}`} variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{e}</AlertDescription></Alert>
            ))}
            {validation.warnings.map((w, i) => (
              <Alert key={`w${i}`} className="border-warning/40 bg-warning/10"><AlertTriangle className="h-4 w-4 text-warning" /><AlertDescription>{w}</AlertDescription></Alert>
            ))}
            {validation.errors.length === 0 && validation.warnings.length === 0 && (
              <Alert className="border-success/40 bg-success/10"><CheckCircle2 className="h-4 w-4 text-success" /><AlertDescription>Tudo certo para importar.</AlertDescription></Alert>
            )}

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
              <div className="rounded-md border p-2"><p className="text-[10px] text-muted-foreground">Atividades</p><p className="text-sm font-bold">{summary.count}</p></div>
              <div className="rounded-md border p-2"><p className="text-[10px] text-muted-foreground">Início</p><p className="text-sm font-bold">{fmtBR(summary.minInicio)}</p></div>
              <div className="rounded-md border p-2"><p className="text-[10px] text-muted-foreground">Fim</p><p className="text-sm font-bold">{fmtBR(summary.maxFim)}</p></div>
              <div className="rounded-md border p-2"><p className="text-[10px] text-muted-foreground">Duração total</p><p className="text-sm font-bold">{summary.totalDuracao ?? '—'} dias</p></div>
              <div className="rounded-md border p-2"><p className="text-[10px] text-muted-foreground">Peso total</p><p className={`text-sm font-bold ${summary.totalPeso === 100 ? 'text-success' : 'text-warning'}`}>{summary.totalPeso}%</p></div>
            </div>

            {/* Editable table */}
            <div className="overflow-x-auto border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Atividade *</TableHead>
                    <TableHead className="w-36">Início</TableHead>
                    <TableHead className="w-36">Fim</TableHead>
                    <TableHead className="w-24">Duração</TableHead>
                    <TableHead className="w-24">Peso (%)</TableHead>
                    <TableHead className="min-w-[160px]">Observações</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r._key}>
                      <TableCell>
                        <Input value={r.nome_atividade} onChange={e => updateRow(r._key, { nome_atividade: e.target.value })} placeholder="Nome" />
                      </TableCell>
                      <TableCell>
                        <Input type="date" value={r.data_inicio || ''} onChange={e => updateRow(r._key, { data_inicio: e.target.value || null })} />
                      </TableCell>
                      <TableCell>
                        <Input type="date" value={r.data_fim || ''} onChange={e => updateRow(r._key, { data_fim: e.target.value || null })} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={0} value={r.duracao_dias ?? ''} onChange={e => updateRow(r._key, { duracao_dias: e.target.value === '' ? null : parseInt(e.target.value) })} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" min={0} max={100} value={r.peso} onChange={e => updateRow(r._key, { peso: parseInt(e.target.value) || 0 })} />
                      </TableCell>
                      <TableCell>
                        <Input value={r.observacoes || ''} onChange={e => updateRow(r._key, { observacoes: e.target.value || null })} placeholder="—" />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => removeRow(r._key)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Dica</Badge>
              Editar data início + fim recalcula a duração. Editar a duração recalcula a data fim.
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={saving}>Cancelar</Button>
          {step === 'preview' && (
            <Button onClick={handleConfirm} disabled={saving || validation.errors.length > 0 || rows.length === 0}>
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importando...</> : `Confirmar Importação (${rows.length})`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
