ALTER TABLE public.relatorios ADD COLUMN IF NOT EXISTS versao_layout smallint NOT NULL DEFAULT 1;
ALTER TABLE public.relatorios ALTER COLUMN versao_layout SET DEFAULT 2;
ALTER TABLE public.assinaturas ADD COLUMN IF NOT EXISTS assinado_em timestamptz;
ALTER TABLE public.assinaturas ALTER COLUMN assinado_em SET DEFAULT now();
ALTER TABLE public.assinaturas ALTER COLUMN data_assinatura SET DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date;