// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const migration = readFileSync('drizzle/migrations/0013_laudos_trava_visibilidade_data_emissao.sql', 'utf8');
const aberto = '00000000-0000-0000-0000-000000000001';
const assinado = '00000000-0000-0000-0000-000000000002';
let db: PGlite;

beforeEach(async () => {
  db = new PGlite();
  await db.exec(`
    CREATE ROLE authenticated;
    CREATE SCHEMA auth;
    CREATE TYPE public.app_role AS ENUM ('admin','super_admin','sindico','cliente','trabalhador');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-0000-0000-000000000099'::uuid $$;
    CREATE FUNCTION public.has_role(uuid,public.app_role) RETURNS boolean LANGUAGE sql AS $$ SELECT $2::text = current_setting('test.role',true) $$;
    CREATE FUNCTION public.can_access_obra(uuid) RETURNS boolean LANGUAGE sql AS $$ SELECT $1 = '00000000-0000-0000-0000-000000000010'::uuid $$;
    CREATE TABLE public.relatorios_finais (
      id uuid PRIMARY KEY, obra_id uuid, status text DEFAULT 'nao_assinado',
      assinatura_empresa_url text, assinatura_sindico_url text,
      assinatura_sindico_nome text, assinatura_sindico_cargo text, assinatura_sindico_data date,
      secoes jsonb, secoes_extras jsonb, contrato text, updated_at timestamptz
    );
    CREATE TABLE public.relatorio_final_fotos (id uuid PRIMARY KEY, relatorio_id uuid REFERENCES public.relatorios_finais(id), legenda text);
    GRANT SELECT,INSERT,UPDATE,DELETE ON public.relatorios_finais,public.relatorio_final_fotos TO authenticated;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    ALTER TABLE public.relatorios_finais ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.relatorio_final_fotos ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Externo view relatorios_finais" ON public.relatorios_finais FOR SELECT TO authenticated USING (true);
    CREATE POLICY "Externo assina relatorios_finais" ON public.relatorios_finais FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "Externo view relatorio_final_fotos" ON public.relatorio_final_fotos FOR SELECT TO authenticated USING (true);
    CREATE FUNCTION public.sync_status_relatorio_final() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN NEW.status := CASE WHEN NEW.assinatura_empresa_url IS NOT NULL AND NEW.assinatura_sindico_url IS NOT NULL THEN 'assinado' ELSE 'nao_assinado' END; RETURN NEW; END $$;
    CREATE TRIGGER trg_sync_status_relatorio_final BEFORE INSERT OR UPDATE ON public.relatorios_finais FOR EACH ROW EXECUTE FUNCTION public.sync_status_relatorio_final();
  `);
  await db.exec(migration);
  await db.exec(`
    CREATE TRIGGER trg_guard_relatorio_final_sindico BEFORE UPDATE ON public.relatorios_finais FOR EACH ROW EXECUTE FUNCTION public.guard_relatorio_final_sindico();
    SET test.role = 'admin';
    INSERT INTO public.relatorios_finais(id,obra_id,contrato,secoes) VALUES ('${aberto}','00000000-0000-0000-0000-000000000010','original','[]');
    INSERT INTO public.relatorios_finais(id,obra_id,assinatura_empresa_url,assinatura_sindico_url) VALUES ('${assinado}','00000000-0000-0000-0000-000000000010','empresa.png','sindico.png');
  `);
});
afterEach(async () => { await db.close(); });

describe('regras de laudos no PostgreSQL', () => {
  it.each(['sindico', 'cliente'])('%s não vê rascunho nem suas fotos, mas vê após assinatura da empresa', async (role) => {
    await db.exec(`INSERT INTO public.relatorio_final_fotos VALUES ('00000000-0000-0000-0000-000000000020','${aberto}','foto'); SET test.role='${role}'; SET ROLE authenticated;`);
    expect((await db.query(`SELECT id FROM public.relatorios_finais WHERE id='${aberto}'`)).rows).toHaveLength(0);
    expect((await db.query('SELECT id FROM public.relatorio_final_fotos')).rows).toHaveLength(0);
    await db.exec(`RESET ROLE; SET test.role='admin'; UPDATE public.relatorios_finais SET assinatura_empresa_url='empresa.png' WHERE id='${aberto}'; SET test.role='${role}'; SET ROLE authenticated;`);
    expect((await db.query(`SELECT id FROM public.relatorios_finais WHERE id='${aberto}'`)).rows).toHaveLength(1);
    expect((await db.query('SELECT id FROM public.relatorio_final_fotos')).rows).toHaveLength(1);
  });

  it.each(['sindico','cliente'])('%s só altera os quatro campos de assinatura, ignorando conteúdo e status', async (role) => {
    await db.exec(`UPDATE public.relatorios_finais SET assinatura_empresa_url='empresa.png' WHERE id='${aberto}'; SET test.role='${role}'; SET ROLE authenticated;
      UPDATE public.relatorios_finais SET contrato='invadido',secoes='[1]',secoes_extras='[2]',data_emissao='2000-01-01',status='assinado',assinatura_sindico_url='cliente.png',assinatura_sindico_nome='Cliente',assinatura_sindico_cargo='Fiscal',assinatura_sindico_data='2026-11-11' WHERE id='${aberto}';`);
    const { rows } = await db.query(`SELECT contrato,secoes,secoes_extras,status,assinatura_sindico_nome,assinatura_sindico_cargo,assinatura_sindico_data FROM public.relatorios_finais WHERE id='${aberto}'`);
    expect(rows[0]).toEqual({ contrato:'original', secoes:[], secoes_extras:null, status:'assinado', assinatura_sindico_nome:'Cliente', assinatura_sindico_cargo:'Fiscal', assinatura_sindico_data:expect.anything() });
  });

  it.each(['admin','super_admin','sindico','cliente'])('%s não pode editar conteúdo nem remover assinaturas depois de assinado', async (role) => {
    await db.exec(`SET test.role='${role}'`);
    await expect(db.exec(`UPDATE public.relatorios_finais SET contrato='alterado',status='nao_assinado' WHERE id='${assinado}'`)).rejects.toThrow('Laudo assinado: alterações bloqueadas.');
    await expect(db.exec(`UPDATE public.relatorios_finais SET assinatura_empresa_url=NULL WHERE id='${assinado}'`)).rejects.toThrow('Laudo assinado: alterações bloqueadas.');
    await expect(db.exec(`UPDATE public.relatorios_finais SET assinatura_sindico_url=NULL WHERE id='${assinado}'`)).rejects.toThrow('Laudo assinado: alterações bloqueadas.');
    await db.exec(`UPDATE public.relatorios_finais SET status='nao_assinado',updated_at=now() WHERE id='${assinado}'`);
    expect((await db.query(`SELECT status FROM public.relatorios_finais WHERE id='${assinado}'`)).rows[0]).toEqual({status:'assinado'});
  });

  it('bloqueia inserir, editar, mover e excluir fotos de um laudo assinado', async () => {
    await db.exec(`INSERT INTO public.relatorio_final_fotos VALUES ('00000000-0000-0000-0000-000000000020','${aberto}','foto'); UPDATE public.relatorios_finais SET assinatura_empresa_url='e',assinatura_sindico_url='s' WHERE id='${aberto}';`);
    for (const sql of [
      `INSERT INTO public.relatorio_final_fotos VALUES ('00000000-0000-0000-0000-000000000021','${assinado}','foto')`,
      `UPDATE public.relatorio_final_fotos SET legenda='alterada'`,
      `UPDATE public.relatorio_final_fotos SET relatorio_id='${assinado}'`,
      `DELETE FROM public.relatorio_final_fotos`,
    ]) await expect(db.exec(sql)).rejects.toThrow('Laudo assinado: fotos bloqueadas.');
  });

  it('fixa emissão na assinatura, mantém em edições e permite remover antes da segunda assinatura', async () => {
    await db.exec(`UPDATE public.relatorios_finais SET assinatura_empresa_url='empresa.png' WHERE id='${aberto}'`);
    const { rows } = await db.query(`SELECT data_emissao = (now() AT TIME ZONE 'America/Sao_Paulo')::date AS hoje FROM public.relatorios_finais WHERE id='${aberto}'`);
    expect(rows[0]).toEqual({hoje:true});
    await db.exec(`UPDATE public.relatorios_finais SET contrato='editável',data_emissao='2000-01-01' WHERE id='${aberto}'`);
    expect((await db.query(`SELECT data_emissao = (now() AT TIME ZONE 'America/Sao_Paulo')::date AS hoje FROM public.relatorios_finais WHERE id='${aberto}'`)).rows[0]).toEqual({hoje:true});
    await db.exec(`UPDATE public.relatorios_finais SET assinatura_empresa_url=NULL WHERE id='${aberto}'`);
    expect((await db.query(`SELECT data_emissao,status FROM public.relatorios_finais WHERE id='${aberto}'`)).rows[0]).toEqual({data_emissao:null,status:'nao_assinado'});
  });

  it('não preenche emissão de laudos antigos já assinados', async () => {
    await db.exec(`UPDATE public.relatorios_finais SET updated_at=now() WHERE id='${assinado}'`);
    expect((await db.query(`SELECT data_emissao FROM public.relatorios_finais WHERE id='${assinado}'`)).rows[0]).toEqual({data_emissao:null});
  });
});