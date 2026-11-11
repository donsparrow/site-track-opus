import { describe, expect, it } from 'vitest';
import { defaultsNovoLaudo, resolverGruposFotos, gruposEntrega } from './gruposFotos';
import { geometriaFoto, proximaRotacao, quadroFoto } from './fotoQuadro';
import { diffLaudo } from './autosave';
describe('divisões persistentes e legado', () => {
  it('entrega antiga mantém Pré-obra/Pós-obra', () => expect(resolverGruposFotos({ tipo_relatorio:'entrega_obra', grupos_fotos:null }, [])).toEqual(gruposEntrega));
  it('vistoria antiga ordena ambientes pt-BR', () => expect(resolverGruposFotos({ tipo_relatorio:'vistoria_previa', grupos_fotos:null }, [{tipo:'Sala'},{tipo:'Cozinha'},{tipo:'Sala'}])).toEqual([{chave:'Cozinha',titulo:'Cozinha'},{chave:'Sala',titulo:'Sala'}]));
  it('mantém ordem, nomes e divisões vazias salvas sem mudar chave', () => {
    const json = [{chave:'cobertura',titulo:'Cobertura'},{chave:'pre_obra',titulo:'Fachada — antes'}];
    expect(resolverGruposFotos({tipo_relatorio:'entrega_obra',grupos_fotos:json},[{tipo:'pre_obra'}])).toEqual(json);
  });
  it('acrescenta fotos fora da lista sem ocultá-las', () => expect(resolverGruposFotos({tipo_relatorio:'entrega_obra',grupos_fotos:[]},[{tipo:'pre_obra'},{tipo:'extra'}])).toEqual([{chave:'extra',titulo:'extra'},{chave:'pre_obra',titulo:'Pré-obra'}]));
  it('JSON inválido usa legado', () => expect(resolverGruposFotos({tipo_relatorio:'entrega_obra',grupos_fotos:[{chave:'x'}]},[])).toEqual(gruposEntrega));
  it('criação entrega/vistoria grava divisões e herda escala do mesmo template', () => {
    expect(defaultsNovoLaudo('entrega_obra',{template_capa_url:'modelo',capa_texto_escala:75})).toEqual({grupos_fotos:gruposEntrega,capa_texto_escala:75});
    expect(defaultsNovoLaudo('vistoria_previa',null)).toEqual({grupos_fotos:[],capa_texto_escala:100});
  });
  it('autosave inclui escala 75 mas não divisões', () => expect(diffLaudo({capa_texto_escala:75,grupos_fotos:[]},{capa_texto_escala:100,grupos_fotos:null})).toEqual({capa_texto_escala:75}));
});
describe('quadros e rotação', () => {
  it('horizontal usa largura disponível e 95mm', () => expect(quadroFoto('horizontal',180)).toEqual({largura:180,altura:95}));
  it('vertical usa 93.75x125mm', () => expect(quadroFoto('vertical',180)).toEqual({largura:93.75,altura:125}));
  it('girar 90 fecha ciclo 0/90/180/270/0', () => expect([0,90,180,270].map(proximaRotacao)).toEqual([90,180,270,0]));
  it('cover preserva proporção e qualidade original de 4000px', () => {
    const g = geometriaFoto(4000,3000,180/95,0);
    expect(g.outW).toBe(4000); expect(g.outH).toBe(2111);
    expect(g.drawW/g.drawH).toBeCloseTo(4/3); expect(g.drawW).toBeGreaterThanOrEqual(g.outW); expect(g.drawH).toBeGreaterThanOrEqual(g.outH);
  });
  it('foto menor mantém resolução original', () => expect(geometriaFoto(1200,800,180/95,0).outW).toBe(1200));
  it('rotação troca eixos antes do recorte', () => {
    const g = geometriaFoto(4000,3000,3/4,90); expect(g.outW).toBe(3000); expect(g.outH).toBe(4000); expect(g.drawW/g.drawH).toBeCloseTo(4/3);
  });
});
