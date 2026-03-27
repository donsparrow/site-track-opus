
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS tipo_pagamento text NOT NULL DEFAULT 'avista';
ALTER TABLE public.despesas ADD COLUMN IF NOT EXISTS data_vencimento date;
ALTER TABLE public.receitas ADD COLUMN IF NOT EXISTS anexo text;
