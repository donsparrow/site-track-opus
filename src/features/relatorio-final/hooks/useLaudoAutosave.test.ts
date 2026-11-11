import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLaudoAutosave } from './useLaudoAutosave';
import type { RelatorioFinal } from '../types';
const laudo = { id: 'laudo-1', status: 'rascunho', contrato: 'Inicial', cliente_nome: 'Cliente' } as RelatorioFinal;
afterEach(() => vi.useRealTimers());
describe('salvamento automático do laudo', () => {
  it('aguarda 1,2 segundo e salva apenas a alteração', async () => {
    vi.useFakeTimers();
    const salvar = vi.fn(async v => ({ ...laudo, ...v }));
    const { result, unmount } = renderHook(() => useLaudoAutosave(laudo, true, salvar));
    act(() => result.current.alterar({ contrato: 'Novo' }));
    await act(async () => { vi.advanceTimersByTime(1199); });
    expect(salvar).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(salvar).toHaveBeenCalledExactlyOnceWith({ contrato: 'Novo' });
    expect(result.current.estado).toBe('saved');
    unmount();
  });
  it('não sobrescreve a digitação em refetch e flush salva imediatamente', async () => {
    const salvar = vi.fn(async v => ({ ...laudo, ...v }));
    const { result, rerender, unmount } = renderHook(({ r }) => useLaudoAutosave(r, true, salvar), { initialProps: { r: laudo } });
    act(() => result.current.alterar({ contrato: 'Digitando' }));
    rerender({ r: { ...laudo, contrato: 'Servidor antigo' } });
    expect(result.current.form?.contrato).toBe('Digitando');
    await act(async () => { await result.current.flush(); });
    expect(salvar).toHaveBeenCalledExactlyOnceWith({ contrato: 'Digitando' });
    unmount();
  });
  it('mantém alterações após erro para tentar de novo', async () => {
    const salvar = vi.fn().mockRejectedValueOnce(new Error('Conexão')).mockResolvedValue({ ...laudo, contrato: 'Novo' });
    const { result, unmount } = renderHook(() => useLaudoAutosave(laudo, true, salvar));
    act(() => result.current.alterar({ contrato: 'Novo' }));
    await act(async () => { await result.current.flush().catch(() => {}); });
    expect(result.current.estado).toBe('error');
    expect(result.current.form?.contrato).toBe('Novo');
    await act(async () => { await result.current.flush(); });
    expect(salvar).toHaveBeenNthCalledWith(2, { contrato: 'Novo' });
    unmount();
  });
  it('não salva nada quando o laudo está assinado', async () => {
    const salvar = vi.fn();
    const { result, unmount } = renderHook(() => useLaudoAutosave({ ...laudo, status: 'assinado' }, true, salvar));
    act(() => result.current.alterar({ contrato: 'Proibido' }));
    await act(async () => { await result.current.flush(); });
    expect(salvar).not.toHaveBeenCalled();
    expect(result.current.form?.contrato).toBe('Inicial');
    unmount();
  });
  it('serializa alterações feitas enquanto a primeira gravação está em andamento', async () => {
    let liberar: ((r: RelatorioFinal) => void) | undefined;
    const salvar = vi.fn().mockImplementationOnce(() => new Promise<RelatorioFinal>(resolve => { liberar = resolve; })).mockResolvedValue({ ...laudo, contrato: 'Segundo' });
    const { result, unmount } = renderHook(() => useLaudoAutosave(laudo, true, salvar));
    act(() => result.current.alterar({ contrato: 'Primeiro' }));
    let gravacao: Promise<unknown>;
    act(() => { gravacao = result.current.flush(); });
    act(() => result.current.alterar({ contrato: 'Segundo' }));
    await act(async () => { liberar?.({ ...laudo, contrato: 'Primeiro' }); await gravacao; });
    expect(salvar).toHaveBeenNthCalledWith(1, { contrato: 'Primeiro' });
    expect(salvar).toHaveBeenNthCalledWith(2, { contrato: 'Segundo' });
    expect(result.current.form?.contrato).toBe('Segundo');
    unmount();
  });
});