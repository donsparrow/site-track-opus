
-- Tabela principal de ferramentas/equipamentos
CREATE TABLE public.ferramentas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome text NOT NULL,
  numero_cadastro text NOT NULL,
  tipo text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'disponivel',
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  ultima_manutencao date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (numero_cadastro, empresa_id)
);

ALTER TABLE public.ferramentas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa view ferramentas"
  ON public.ferramentas FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Empresa manage ferramentas"
  ON public.ferramentas FOR ALL TO authenticated
  USING ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) AND empresa_id = get_user_empresa_id(auth.uid()))
  WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE TRIGGER update_ferramentas_updated_at
  BEFORE UPDATE ON public.ferramentas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER set_ferramentas_empresa_id
  BEFORE INSERT ON public.ferramentas
  FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();

-- Tabela de histórico de movimentações
CREATE TABLE public.ferramentas_historico (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ferramenta_id uuid NOT NULL REFERENCES public.ferramentas(id) ON DELETE CASCADE,
  tipo_evento text NOT NULL DEFAULT 'movimentacao',
  descricao text NOT NULL,
  obra_id uuid REFERENCES public.obras(id) ON DELETE SET NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ferramentas_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresa view ferramentas_historico"
  ON public.ferramentas_historico FOR SELECT TO authenticated
  USING (empresa_id = get_user_empresa_id(auth.uid()));

CREATE POLICY "Empresa manage ferramentas_historico"
  ON public.ferramentas_historico FOR INSERT TO authenticated
  WITH CHECK ((has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) AND empresa_id = get_user_empresa_id(auth.uid()));

CREATE TRIGGER set_ferramentas_historico_empresa_id
  BEFORE INSERT ON public.ferramentas_historico
  FOR EACH ROW EXECUTE FUNCTION public.set_empresa_id();

-- Habilitar realtime para ferramentas
ALTER PUBLICATION supabase_realtime ADD TABLE public.ferramentas;
