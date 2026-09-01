ALTER TABLE public.relatorios_finais DROP CONSTRAINT IF EXISTS relatorios_finais_obra_id_key;
ALTER TABLE public.relatorios_finais DROP CONSTRAINT IF EXISTS relatorios_finais_obra_tipo_unique;
ALTER TABLE public.relatorios_finais ADD CONSTRAINT relatorios_finais_obra_tipo_unique UNIQUE (obra_id, tipo_relatorio);

ALTER TABLE public.relatorio_final_fotos DROP CONSTRAINT IF EXISTS relatorio_final_fotos_tipo_check;

ALTER TABLE public.relatorios_finais ADD COLUMN IF NOT EXISTS secoes_extras JSONB NOT NULL DEFAULT '[]'::jsonb;