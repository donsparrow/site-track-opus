import type { RelatorioFinal } from '../types';
import { useSignedUrls } from '../hooks/useSignedUrls';
import './capaPreview.css';
const fmt = (d: string | null | undefined) => d ? new Date(`${d}T00:00:00`).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
export default function CapaPreview({ values: r, obraNome }: { values: Partial<RelatorioFinal>; obraNome: string }) {
  const urls = useSignedUrls([r.template_capa_url, r.foto_capa_url]);
  const template = !!r.template_capa_url;
  return <div className="laudo-capa-preview" aria-label="Prévia da capa">
    {template && urls[r.template_capa_url || ''] && <img className="laudo-capa-fundo" src={urls[r.template_capa_url || '']} alt="Template da capa" decoding="async" />}
    <div className={`laudo-capa-titulo ${template ? '' : 'laudo-capa-barra'}`}>{r.tipo_relatorio === 'vistoria_previa' ? 'RELATÓRIO DE VISTORIA PRÉVIA' : template ? 'RELATÓRIO DE VISTORIA PÓS-OBRA' : 'RELATÓRIO FINAL DE OBRA'}{!template && <p>{obraNome}</p>}</div>
    <div className="laudo-capa-foto">{urls[r.foto_capa_url || ''] && <img src={urls[r.foto_capa_url || '']} alt="Foto de capa" style={{ transform: `scale(${(r.foto_capa_escala ?? 100) / 100})` }} decoding="async" />}</div>
    <div className="laudo-capa-dados"><p>CLIENTE: {r.cliente_nome} — {r.endereco}</p><p>DATA DE EMISSÃO: {fmt(r.data_emissao)}</p>{r.data_vistoria && <p>DATA DA VISTORIA: {fmt(r.data_vistoria)}</p>}{r.contrato && <p>CONTRATO: {r.contrato}</p>}</div>
  </div>;
}