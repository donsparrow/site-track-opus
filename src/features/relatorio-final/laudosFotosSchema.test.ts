import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
const migration = readFileSync('drizzle/migrations/0014_laudos_grupos_orientacao_capa.sql','utf8');
const locks = readFileSync('drizzle/migrations/0013_laudos_trava_visibilidade_data_emissao.sql','utf8');
it('novas colunas preservam legado, limites e as travas existentes', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE authenticated; CREATE SCHEMA auth; CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
      CREATE TYPE public.app_role AS ENUM ('admin','super_admin','sindico','cliente');
      CREATE FUNCTION public.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT $2::text = 'admin' $$;
      CREATE FUNCTION public.can_access_obra(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
      CREATE TABLE public.relatorios_finais(id uuid PRIMARY KEY,obra_id uuid,status text,assinatura_empresa_url text,assinatura_sindico_url text,assinatura_sindico_nome text,assinatura_sindico_cargo text,assinatura_sindico_data date,updated_at timestamptz);
      CREATE TABLE public.relatorio_final_fotos(id uuid PRIMARY KEY,relatorio_id uuid);
      CREATE POLICY "Externo view relatorios_finais" ON public.relatorios_finais FOR SELECT USING(true);
      CREATE POLICY "Externo assina relatorios_finais" ON public.relatorios_finais FOR UPDATE USING(true);
      CREATE POLICY "Externo view relatorio_final_fotos" ON public.relatorio_final_fotos FOR SELECT USING(true);
      INSERT INTO public.relatorios_finais(id,status) VALUES('00000000-0000-0000-0000-000000000001','rascunho');
      INSERT INTO public.relatorio_final_fotos VALUES('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001');`);
    await db.exec(locks); await db.exec(migration);
    expect((await db.query('SELECT grupos_fotos,capa_texto_escala FROM public.relatorios_finais')).rows[0]).toEqual({grupos_fotos:null,capa_texto_escala:100});
    expect((await db.query('SELECT orientacao,rotacao FROM public.relatorio_final_fotos')).rows[0]).toEqual({orientacao:'horizontal',rotacao:0});
    await db.exec(`UPDATE public.relatorios_finais SET capa_texto_escala=75,grupos_fotos='[{"chave":"pre_obra","titulo":"Fachada — antes"},{"chave":"uuid","titulo":"Cobertura"}]'; UPDATE public.relatorio_final_fotos SET orientacao='vertical',rotacao=90;`);
    expect((await db.query('SELECT grupos_fotos FROM public.relatorios_finais')).rows[0]).toEqual({grupos_fotos:[{chave:'pre_obra',titulo:'Fachada — antes'},{chave:'uuid',titulo:'Cobertura'}]});
    for(const value of [59,101]) await expect(db.exec(`UPDATE public.relatorios_finais SET capa_texto_escala=${value}`)).rejects.toThrow();
    for(const value of [45,360]) await expect(db.exec(`UPDATE public.relatorio_final_fotos SET rotacao=${value}`)).rejects.toThrow();
    await expect(db.exec(`UPDATE public.relatorio_final_fotos SET orientacao='quadrada'`)).rejects.toThrow();
    await db.exec(`UPDATE public.relatorios_finais SET status='assinado',assinatura_empresa_url='empresa',assinatura_sindico_url='cliente'`);
    for(const sql of [`UPDATE public.relatorios_finais SET grupos_fotos='[]'`,`UPDATE public.relatorios_finais SET capa_texto_escala=100`]) await expect(db.exec(sql)).rejects.toThrow('Laudo assinado: alterações bloqueadas.');
    for(const sql of [`UPDATE public.relatorio_final_fotos SET orientacao='horizontal'`,`UPDATE public.relatorio_final_fotos SET rotacao=180`]) await expect(db.exec(sql)).rejects.toThrow('Laudo assinado: fotos bloqueadas.');
  } finally { await db.close(); }
});
