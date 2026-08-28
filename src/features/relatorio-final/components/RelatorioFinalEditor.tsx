import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImagePlus, Save, X } from 'lucide-react';
import RichTextEditor from '@/components/RichTextEditor';
import { useSignedUrls } from '../hooks/useSignedUrls';
import { SECOES } from '../types';
import type { RelatorioFinal } from '../types';

interface Props {
  relatorio: RelatorioFinal;
  editable: boolean;
  saving: boolean;
  uploadingCapa: boolean;
  uploadingTemplate?: boolean;
  onSalvar: (values: Partial<RelatorioFinal>) => void;
  onUploadCapa: (file: File) => void;
  onUploadTemplate: (file: File) => void;
  onRemoverTemplate: () => void;
}

export default function RelatorioFinalEditor({ relatorio, editable, saving, uploadingCapa, uploadingTemplate, onSalvar, onUploadCapa, onUploadTemplate, onRemoverTemplate }: Props) {
  const [form, setForm] = useState<Partial<RelatorioFinal>>(relatorio);
  const capaInput = useRef<HTMLInputElement>(null);
  const templateInput = useRef<HTMLInputElement>(null);
  const urls = useSignedUrls([relatorio.foto_capa_url, relatorio.template_capa_url]);

  useEffect(() => { setForm(relatorio); }, [relatorio]);

  const set = (k: keyof RelatorioFinal, v: string | null) => setForm((f) => ({ ...f, [k]: v }));

  const campos: [keyof RelatorioFinal, string, string?][] = [
    ['cliente_nome', 'Cliente'],
    ['cliente_cpf_cnpj', 'CPF/CNPJ'],
    ['endereco', 'Endereço'],
    ['responsavel', 'Responsável'],
    ['data_inicio', 'Data de início', 'date'],
    ['data_conclusao', 'Data de conclusão', 'date'],
    ['link_externo_label', 'Rótulo do link externo'],
    ['link_externo', 'Link externo'],
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display text-base">Dados do relatório</CardTitle>
          {editable && (
            <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" disabled={saving} onClick={() => onSalvar(form)}>
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
          </div>
        </CardContent>
      </Card>

      {SECOES.map((s) => (
        <Card key={s.key}>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <Input
              className="max-w-sm font-display font-semibold"
              value={(form[s.titulo] as string) || ''}
              placeholder={s.label}
              disabled={!editable}
              onChange={(e) => set(s.titulo, e.target.value)}
            />
            {editable && (
              <Button size="sm" variant="outline" disabled={saving} onClick={() => onSalvar(form)}>
                <Save className="h-4 w-4 mr-1" /> Salvar
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <RichTextEditor
              value={(form[s.conteudo] as string) || ''}
              editable={editable}
              onChange={(html) => set(s.conteudo, html === '<p></p>' ? null : html)}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
