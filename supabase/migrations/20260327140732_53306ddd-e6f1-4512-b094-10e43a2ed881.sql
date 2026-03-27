
CREATE TABLE public.cronograma (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  data_inicio date,
  data_fim_prevista date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cronograma ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/trabalhador manage cronograma" ON public.cronograma
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'trabalhador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'trabalhador'::app_role));

CREATE POLICY "Auth view cronograma" ON public.cronograma
  FOR SELECT TO authenticated
  USING (true);

CREATE TABLE public.cronograma_atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cronograma_id uuid NOT NULL REFERENCES public.cronograma(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  nome_atividade text NOT NULL,
  data_inicio date,
  data_fim date,
  percentual_concluido integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'nao_iniciado',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.cronograma_atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/trabalhador manage cronograma_atividades" ON public.cronograma_atividades
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'trabalhador'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'trabalhador'::app_role));

CREATE POLICY "Auth view cronograma_atividades" ON public.cronograma_atividades
  FOR SELECT TO authenticated
  USING (true);
