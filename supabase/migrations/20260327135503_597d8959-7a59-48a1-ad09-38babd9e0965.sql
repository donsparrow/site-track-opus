
CREATE TABLE public.financeiro_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_registro text NOT NULL DEFAULT 'receita',
  registro_id uuid NOT NULL,
  tipo_anexo text NOT NULL DEFAULT 'nota_fiscal',
  nome_arquivo text NOT NULL,
  url_arquivo text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.financeiro_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/trabalhador manage financeiro_anexos" ON public.financeiro_anexos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'trabalhador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'trabalhador'::app_role));

CREATE POLICY "Auth view financeiro_anexos" ON public.financeiro_anexos
  FOR SELECT TO authenticated
  USING (true);
