
-- Create documentos_pastas table
CREATE TABLE public.documentos_pastas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  nome_pasta text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.documentos_pastas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view documentos_pastas" ON public.documentos_pastas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/trabalhador manage documentos_pastas" ON public.documentos_pastas
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'trabalhador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'trabalhador'::app_role));

-- Create documentos_arquivos table
CREATE TABLE public.documentos_arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pasta_id uuid NOT NULL REFERENCES public.documentos_pastas(id) ON DELETE CASCADE,
  nome_arquivo text NOT NULL,
  tipo text NOT NULL DEFAULT 'pdf',
  url_arquivo text NOT NULL,
  tamanho bigint DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.documentos_arquivos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view documentos_arquivos" ON public.documentos_arquivos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin/trabalhador manage documentos_arquivos" ON public.documentos_arquivos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'trabalhador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'trabalhador'::app_role));
