import { useCallback, useEffect, useRef, useState } from 'react';
import type { RelatorioFinal } from '../types';
import { camposAuto, diffLaudo } from '../lib/autosave';

export function useLaudoAutosave(relatorio: RelatorioFinal | null | undefined, editable: boolean, salvar: (v: Partial<RelatorioFinal>) => Promise<RelatorioFinal>) {
  const [local, setLocal] = useState<Partial<RelatorioFinal>>({});
  const [estado, setEstado] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [hora, setHora] = useState('');
  const atual = useRef<Partial<RelatorioFinal>>({});
  const salvo = useRef<Partial<RelatorioFinal>>({});
  const identidade = useRef<string>();
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const rodando = useRef<Promise<RelatorioFinal | null> | null>(null);
  const fonte = useRef({ relatorio, editable, salvar });
  fonte.current = { relatorio, editable, salvar };
  useEffect(() => {
    if (identidade.current === relatorio?.id) return;
    identidade.current = relatorio?.id;
    const dados = Object.fromEntries(camposAuto.map(k => [k, relatorio?.[k]]));
    atual.current = dados; salvo.current = dados; setLocal(dados); setEstado('idle');
    clearTimeout(timer.current);
  }, [relatorio?.id]);

  const flush = useCallback(async (): Promise<RelatorioFinal | null> => {
    clearTimeout(timer.current);
    if (rodando.current) { await rodando.current; return flush(); }
    if (!fonte.current.editable || !fonte.current.relatorio || fonte.current.relatorio.status === 'assinado') return fonte.current.relatorio ?? null;
    const diff = diffLaudo(atual.current, salvo.current);
    if (!Object.keys(diff).length) return { ...fonte.current.relatorio, ...atual.current };
    const id = identidade.current;
    setEstado('saving');
    const tarefa = fonte.current.salvar(diff).then(data => {
      if (identidade.current === id) { salvo.current = { ...salvo.current, ...diff }; setEstado('saved'); setHora(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })); }
      return data;
    }).catch(e => { if (identidade.current === id) setEstado('error'); throw e; }).finally(() => { rodando.current = null; });
    rodando.current = tarefa;
    await tarefa;
    return flush();
  }, []);
  const alterar = (values: Partial<RelatorioFinal>, agendar = true) => {
    if (!editable || relatorio?.status === 'assinado') return;
    atual.current = { ...atual.current, ...values }; setLocal(atual.current);
    clearTimeout(timer.current);
    if (agendar) timer.current = setTimeout(() => { void flush().catch(() => {}); }, 1200);
  };
  useEffect(() => {
    const sair = (e: BeforeUnloadEvent) => { if (fonte.current.editable && Object.keys(diffLaudo(atual.current, salvo.current)).length) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', sair);
    return () => { window.removeEventListener('beforeunload', sair); clearTimeout(timer.current); void flush().catch(() => {}); };
  }, [flush]);
  return { form: relatorio ? { ...relatorio, ...local } : null, alterar, flush, estado, hora };
}