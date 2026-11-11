import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { RelatorioFinal } from '../types';
import { useSignedUrls } from '../hooks/useSignedUrls';
import './capaPreview.css';
const fmt = (d: string | null | undefined) => d ? new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
export default function CapaPreview({ values: r, obraNome }: { values: Partial<RelatorioFinal>; obraNome: string }) {
  const urls = useSignedUrls([r.template_capa_url, r.foto_capa_url]);
  const template = !!r.template_capa_url;
  const [imagem, setImagem] = useState({ src: '', ratio: 180/145 });
  const src = urls[r.foto_capa_url || ''];
  const ratio = imagem.src === src ? imagem.ratio : 180/145;
  const escala = (r.foto_capa_escala ?? 100) / 100;
  const w = Math.min(180, 145 * ratio) * escala; const h = w / ratio;
  const textoEscala = template ? (r.capa_texto_escala ?? 100) / 100 : 1;
  return <div className="laudo-capa-preview" aria-label="Prévia da capa">
    {template && urls[r.template_capa_url || ''] && <img className="laudo-capa-fundo" src={urls[r.template_capa_url || '']} alt="Template da capa" decoding="async" />}
    <div className={`laudo-capa-titulo ${template ? '' : 'laudo-capa-barra'}`}>{r.tipo_relatorio === 'vistoria_previa' ? 'RELATÓRIO DE VISTORIA PRÉVIA' : template ? 'RELATÓRIO DE VISTORIA PÓS-OBRA' : 'RELATÓRIO FINAL DE OBRA'}{!template && <p>{obraNome}</p>}</div>
    <div className="laudo-capa-foto">{src && <><img src={src} alt="Foto de capa" style={{ width: `${w / 180 * 100}%`, height: `${h / 145 * 100}%` }} onLoad={e => setImagem({ src, ratio: e.currentTarget.naturalWidth / e.currentTarget.naturalHeight })} decoding="async" /><span className="laudo-capa-foto-borda" style={{ width: `${Math.min(w, 180) / 180 * 100}%`, height: `${Math.min(h, 145) / 145 * 100}%` }} /></>}</div>
    <div className={`laudo-capa-dados ${template ? 'laudo-capa-dados-template' : ''}`} style={{ '--texto-escala': textoEscala } as CSSProperties}><p className="laudo-capa-cliente">CLIENTE: {r.cliente_nome}{r.endereco ? ` — ${r.endereco}` : ''}</p><p className="laudo-capa-emissao">DATA DE EMISSÃO: {fmt(r.data_emissao)}</p>{r.data_vistoria && <p className="laudo-capa-vistoria">DATA DA VISTORIA: {fmt(r.data_vistoria)}</p>}{r.contrato && <p className="laudo-capa-contrato">CONTRATO: {r.contrato}</p>}</div>
  </div>;
}