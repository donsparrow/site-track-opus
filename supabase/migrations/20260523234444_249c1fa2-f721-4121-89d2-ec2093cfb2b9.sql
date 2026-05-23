
-- 1) Cronograma atividades: tipo (original|aditivo) e observacoes
ALTER TABLE public.cronograma_atividades
  ADD COLUMN IF NOT EXISTS tipo_atividade text NOT NULL DEFAULT 'original',
  ADD COLUMN IF NOT EXISTS observacoes text;

-- 2) Índice para vinculação diário->cronograma
CREATE INDEX IF NOT EXISTS idx_diario_ativ_cronograma_ativ
  ON public.diario_atividades(cronograma_atividade_id);

-- 3) Tabela de Aditivos da Obra
CREATE TABLE IF NOT EXISTS public.obra_aditivos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  obra_id uuid NOT NULL,
  empresa_id uuid,
  descricao text NOT NULL,
  dias_adicionais integer NOT NULL DEFAULT 0,
  data_aprovacao date,
  justificativa text,
  documento_url text,
  responsavel_aprovacao text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.obra_aditivos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Empresa view obra_aditivos" ON public.obra_aditivos;
CREATE POLICY "Empresa view obra_aditivos"
  ON public.obra_aditivos FOR SELECT TO authenticated
  USING (empresa_id = public.get_user_empresa_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin'));

DROP POLICY IF EXISTS "Empresa insert obra_aditivos" ON public.obra_aditivos;
CREATE POLICY "Empresa insert obra_aditivos"
  ON public.obra_aditivos FOR INSERT TO authenticated
  WITH CHECK ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'trabalhador') OR public.has_role(auth.uid(),'super_admin'))
              AND (empresa_id = public.get_user_empresa_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin')));

DROP POLICY IF EXISTS "Empresa update obra_aditivos" ON public.obra_aditivos;
CREATE POLICY "Empresa update obra_aditivos"
  ON public.obra_aditivos FOR UPDATE TO authenticated
  USING ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
         AND (empresa_id = public.get_user_empresa_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin')));

DROP POLICY IF EXISTS "Empresa delete obra_aditivos" ON public.obra_aditivos;
CREATE POLICY "Empresa delete obra_aditivos"
  ON public.obra_aditivos FOR DELETE TO authenticated
  USING ((public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'super_admin'))
         AND (empresa_id = public.get_user_empresa_id(auth.uid()) OR public.has_role(auth.uid(),'super_admin')));

-- Auto empresa_id e updated_at
DROP TRIGGER IF EXISTS set_empresa_id_obra_aditivos ON public.obra_aditivos;
CREATE TRIGGER set_empresa_id_obra_aditivos
  BEFORE INSERT ON public.obra_aditivos
  FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();

DROP TRIGGER IF EXISTS upd_obra_aditivos_updated_at ON public.obra_aditivos;
CREATE TRIGGER upd_obra_aditivos_updated_at
  BEFORE UPDATE ON public.obra_aditivos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_obra_aditivos_obra ON public.obra_aditivos(obra_id);
