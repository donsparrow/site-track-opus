import { describe, expect, it } from 'vitest';
import type { SecaoExtra } from '../types';
import { escaparHtml, importarSecoes, substituirNome, textoPuro } from './importarTexto';

const bloco = (id: string, titulo: string, conteudo: string, ordem = 0): SecaoExtra =>
  ({ id, titulo, conteudo, ordem });

describe('substituirNome', () => {
  it('troca o nome sem diferenciar maiúsculas/minúsculas', () => {
    expect(substituirNome('Obra da GALÁXIA Shopping', 'galáxia shopping', 'Espíndula')).toBe('Obra da Espíndula');
  });

  it('troca também a versão escapada para HTML', () => {
    expect(substituirNome('<p>J&amp;A Engenharia</p>', 'J&A Engenharia', 'Flix TV')).toBe('<p>Flix TV</p>');
  });

  it('não faz nada quando um nome falta ou os dois são iguais', () => {
    expect(substituirNome('Espíndula', null, 'X')).toBe('Espíndula');
    expect(substituirNome('Espíndula', 'A', '  ')).toBe('Espíndula');
    expect(substituirNome('Espíndula', 'espíndula', 'Espíndula')).toBe('Espíndula');
  });

  it('não interpreta $ do nome de destino como referência da regex', () => {
    expect(substituirNome('obra X', 'X', 'A$B')).toBe('obra A$B');
  });
});

describe('importarSecoes', () => {
  const atuais = [bloco('a', 'Introdução', '<p>Texto atual</p>', 0)];
  const origem = [
    bloco('x', 'Vistoria Galáxia', '<p>Cliente J&A Engenharia</p>', 0),
    bloco('v', 'Bloco vazio', '<p></p>', 1),
  ];
  const saida = importarSecoes(atuais, origem, {
    obraOrigem: 'Galáxia',
    obraAtual: 'Espíndula',
    clienteOrigem: 'J&A Engenharia',
    clienteAtual: 'Flix TV',
  });

  it('acrescenta no fim sem alterar os blocos atuais', () => {
    expect(saida).toHaveLength(2);
    expect(saida[0]).toEqual(atuais[0]);
  });

  it('ignora blocos sem texto', () => {
    expect(saida.some(s => s.titulo === 'Bloco vazio')).toBe(false);
  });

  it('troca obra e cliente no título e no conteúdo', () => {
    expect(saida[1].titulo).toBe('Vistoria Espíndula');
    expect(saida[1].conteudo).toBe('<p>Cliente Flix TV</p>');
  });

  it('gera id novo para o bloco importado e reindexa a ordem', () => {
    expect(saida[1].id).not.toBe('x');
    expect(saida.map(s => s.ordem)).toEqual([0, 1]);
  });
});

describe('textoPuro', () => {
  it('remove a formatação e junta os espaços', () => {
    expect(textoPuro('<p>Boa&nbsp;tarde<br/>tudo</p>')).toBe('Boa tarde tudo');
    expect(textoPuro(null)).toBe('');
  });

  it('escapa o & para comparação no HTML', () => {
    expect(escaparHtml('J&A')).toBe('J&amp;A');
  });
});
