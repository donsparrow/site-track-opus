ALTER TABLE public.relatorios_finais ADD COLUMN IF NOT EXISTS fotos_por_pagina smallint;
UPDATE public.relatorios_finais SET fotos_por_pagina = 2 WHERE assinatura_empresa_url IS NULL;
ALTER TABLE public.relatorios_finais ALTER COLUMN fotos_por_pagina SET DEFAULT 2;
ALTER TABLE public.relatorios_finais ADD CONSTRAINT relatorios_finais_fotos_por_pagina_check CHECK (fotos_por_pagina IS NULL OR fotos_por_pagina IN (2,4,6,8));