import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { ImagePlus, Save, X } from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';
import { useSignedUrls } from '../hooks/useSignedUrls';
import type { RelatorioFinal, SecaoExtra } from '../types';
import { resolverSecoes } from '../lib/secoes';
import SecoesEditor from './SecoesEditor';

interface Props {
  relatorio: RelatorioFinal;
  tipoRelatorio?: string;
  editable: boolean;
  saving: boolean;
  uploadingCapa: boolean;
  uploadingTemplate?: boolean;
  onSalvar: (values: Partial<RelatorioFinal>) => void;
  onUploadCapa: (file: File) => void;
  onUploadTemplate: (file: File) => void;
  onRemoverTemplate: () => void;
}

export default function RelatorioFinalEditor({ relatorio, tipoRelatorio = 'entrega_obra', editable, saving, uploadingCapa, uploadingTemplate, onSalvar, onUploadCapa, onUploadTemplate, onRemoverTemplate }: Props) {
  const [form, setForm] = useState<Partial<RelatorioFinal>>(relatorio);
  const capaInput = useRef<HTMLInputElement>(null);
  const templateInput = useRef<HTMLInputElement>(null);
  const urls = useSignedUrls([relatorio.foto_capa_url, relatorio.template_capa_url]);

  useEffect(() => { setForm(relatorio); }, [relatorio]);

  const set = (k: keyof RelatorioFinal, v: string | null) => setForm((f) => ({ ...f, [k]: v }));

  /** Remove colunas legadas do envio: o editor grava apenas `secoes` (e demais dados). */
  const semLegado = (values: Partial<RelatorioFinal>): Partial<RelatorioFinal> => {
    const {
      titulo_introducao, conteudo_introducao, titulo_garantia, conteudo_garantia,
      titulo_aditivo, conteudo_aditivo, titulo_conclusao, conteudo_conclusao, secoes_extras,
      ...resto
    } = values;
    void titulo_introducao; void conteudo_introducao; void titulo_garantia; void conteudo_garantia;
    void titulo_aditivo; void conteudo_aditivo; void titulo_conclusao; void conteudo_conclusao; void secoes_extras;
    return resto;
  };
  const salvar = () => onSalvar(semLegado(form));

  const campos: [keyof RelatorioFinal, string, string?][] = [
    ['cliente_nome', 'Cliente'],
    ['cliente_cpf_cnpj', 'CPF/CNPJ'],
    ['endereco', 'Endereço'],
    ['responsavel', 'Responsável'],
    ['data_inicio', 'Data de início', 'date'],
    ['data_conclusao', 'Data de conclusão', 'date'],
    ['data_vistoria', 'Data da vistoria', 'date'],
    ['link_externo_label', 'Rótulo do link externo'],
    ['link_externo', 'Link externo'],
    ['contrato', 'Contrato'],
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-base">Dados do relatório</CardTitle>
          {editable && (
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving} onClick={salvar}>
              <Save className="h-4 w-4 mr-1" /> {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {campos.map(([key, label, type]) => (
              <div key={key as string}>
                <Label>{label}</Label>
                <Input
                  type={type || 'text'}
                  value={(form[key] as string) || ''}
                  placeholder={key === 'contrato' ? 'Ex.: nº 802/2026, assinado em 25/03/2026' : undefined}
                  disabled={!editable}
                  onChange={(e) => set(key, e.target.value || null)}
                />
              </div>
            ))}
          </div>

          <div>
            <Label>Template da Capa</Label>
            <div className="flex items-start gap-4 mt-1">
              {relatorio.template_capa_url && urls[relatorio.template_capa_url] ? (
                <img src={urls[relatorio.template_capa_url]} alt="Template da capa" className="h-32 w-24 object-cover rounded-lg border" />
              ) : (
                <div className="h-32 w-24 rounded-lg border bg-muted flex items-center justify-center text-center text-xs text-muted-foreground px-1">
                  Sem template
                </div>
              )}
              {editable && (
                <div className="space-y-2">
                  <input
                    ref={templateInput}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUploadTemplate(file);
                      e.target.value = '';
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={uploadingTemplate} onClick={() => templateInput.current?.click()}>
                      <ImagePlus className="h-4 w-4 mr-1" /> {uploadingTemplate ? 'Enviando...' : 'Enviar template'}
                    </Button>
                    {relatorio.template_capa_url && (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={onRemoverTemplate}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground max-w-xs">
                    Imagem de fundo da capa do PDF. Recomendado: PNG 1414x2000px (A4).
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <Label>Foto de capa</Label>
            <div className="flex items-start gap-4 mt-1">
              {relatorio.foto_capa_url && urls[relatorio.foto_capa_url] ? (
                <img src={urls[relatorio.foto_capa_url]} alt="Capa do relatório" className="h-32 w-52 object-cover rounded-lg border" />
              ) : (
                <div className="h-32 w-52 rounded-lg border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  Sem capa
                </div>
              )}
              {editable && (
                <>
                  <input
                    ref={capaInput}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUploadCapa(file);
                      e.target.value = '';
                    }}
                  />
                  <Button variant="outline" size="sm" disabled={uploadingCapa} onClick={() => capaInput.current?.click()}>
                    <ImagePlus className="h-4 w-4 mr-1" /> {uploadingCapa ? 'Enviando...' : 'Escolher capa'}
                  </Button>
                </>
              )}
            </div>
            {editable && relatorio.foto_capa_url && (
              <div className="mt-3 max-w-xs space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Escala da foto na capa</Label>
                  <span className="text-xs text-muted-foreground">{form.foto_capa_escala ?? 100}%</span>
                </div>
                <Slider
                  min={30}
                  max={150}
                  step={5}
                  value={[form.foto_capa_escala ?? 100]}
                  onValueChange={([v]) => setForm((f) => ({ ...f, foto_capa_escala: v }))}
                  onValueCommit={([v]) => onSalvar(semLegado({ ...form, foto_capa_escala: v }))}
                />
                <p className="text-xs text-muted-foreground">
                  100% = preencher área. Menor = foto mais distante. Maior = foto mais próxima.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <SecoesEditor
        secoes={Array.isArray(form.secoes) ? (form.secoes as unknown as SecaoExtra[]) : resolverSecoes(form as RelatorioFinal)}
        editable={editable}
        onChange={(lista) => setForm((f) => ({ ...f, secoes: lista as unknown as RelatorioFinal['secoes'] }))}
      />

      {editable && (
        <div className="sticky bottom-0 z-10 -mx-1 flex justify-end border-t bg-background/95 px-1 py-3 backdrop-blur">
          <Button className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving} onClick={salvar}>
            <Save className="h-4 w-4 mr-1" /> {saving ? 'Salvando...' : 'Salvar laudo'}
          </Button>
        </div>
      )}
    </div>
  );
}
