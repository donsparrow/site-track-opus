
-- 1. Configurações da empresa
CREATE TABLE public.configuracoes_empresa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa text NOT NULL DEFAULT '',
  cnpj text,
  endereco text,
  telefone text,
  email text,
  logo_url text,
  site text,
  instagram text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.configuracoes_empresa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view configuracoes" ON public.configuracoes_empresa FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin manage configuracoes" ON public.configuracoes_empresa FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- 2. Diário de obra
CREATE TABLE public.diario_obra (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id uuid NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  data date NOT NULL DEFAULT CURRENT_DATE,
  clima text NOT NULL DEFAULT 'sol',
  temperatura text,
  horario_inicio time,
  horario_fim time,
  observacoes_gerais text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.diario_obra ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view diario_obra" ON public.diario_obra FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/trabalhador insert diario_obra" ON public.diario_obra FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'));
CREATE POLICY "Admin/trabalhador update diario_obra" ON public.diario_obra FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'));
CREATE POLICY "Admin delete diario_obra" ON public.diario_obra FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- 3. Subtabelas do diário
CREATE TABLE public.diario_equipe (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diario_id uuid NOT NULL REFERENCES public.diario_obra(id) ON DELETE CASCADE,
  nome_funcionario text NOT NULL,
  funcao text,
  horas_trabalhadas numeric(5,2) DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.diario_equipe ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view diario_equipe" ON public.diario_equipe FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/trabalhador manage diario_equipe" ON public.diario_equipe FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'));

CREATE TABLE public.diario_atividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diario_id uuid NOT NULL REFERENCES public.diario_obra(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  status text NOT NULL DEFAULT 'andamento',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.diario_atividades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view diario_atividades" ON public.diario_atividades FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/trabalhador manage diario_atividades" ON public.diario_atividades FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'));

CREATE TABLE public.diario_materiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diario_id uuid NOT NULL REFERENCES public.diario_obra(id) ON DELETE CASCADE,
  material text NOT NULL,
  quantidade numeric(10,2) DEFAULT 0,
  unidade text DEFAULT 'un',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.diario_materiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view diario_materiais" ON public.diario_materiais FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/trabalhador manage diario_materiais" ON public.diario_materiais FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'));

CREATE TABLE public.diario_ocorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diario_id uuid NOT NULL REFERENCES public.diario_obra(id) ON DELETE CASCADE,
  descricao text NOT NULL,
  impacto text NOT NULL DEFAULT 'baixo',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.diario_ocorrencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view diario_ocorrencias" ON public.diario_ocorrencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/trabalhador manage diario_ocorrencias" ON public.diario_ocorrencias FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'));

CREATE TABLE public.diario_imagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diario_id uuid NOT NULL REFERENCES public.diario_obra(id) ON DELETE CASCADE,
  url text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.diario_imagens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view diario_imagens" ON public.diario_imagens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/trabalhador manage diario_imagens" ON public.diario_imagens FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'));

-- 4. Paralisações
CREATE TABLE public.diario_paralisacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diario_id uuid NOT NULL REFERENCES public.diario_obra(id) ON DELETE CASCADE,
  motivo text NOT NULL,
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  total_dias integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.diario_paralisacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view diario_paralisacoes" ON public.diario_paralisacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/trabalhador manage diario_paralisacoes" ON public.diario_paralisacoes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'));

-- 5. Assinaturas
CREATE TABLE public.assinaturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relatorio_id uuid NOT NULL REFERENCES public.relatorios(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'responsavel_tecnico',
  nome_assinante text NOT NULL,
  cargo text,
  data_assinatura date NOT NULL DEFAULT CURRENT_DATE,
  tipo_assinatura text NOT NULL DEFAULT 'imagem',
  assinatura_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assinaturas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view assinaturas" ON public.assinaturas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/trabalhador manage assinaturas" ON public.assinaturas FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'));

-- 6. Versões do relatório
CREATE TABLE public.relatorio_versoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relatorio_id uuid NOT NULL REFERENCES public.relatorios(id) ON DELETE CASCADE,
  numero_versao integer NOT NULL DEFAULT 1,
  criado_por uuid NOT NULL,
  data_criacao timestamptz NOT NULL DEFAULT now(),
  descricao_alteracao text,
  status text NOT NULL DEFAULT 'rascunho',
  snapshot_dados jsonb
);
ALTER TABLE public.relatorio_versoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view relatorio_versoes" ON public.relatorio_versoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/trabalhador manage relatorio_versoes" ON public.relatorio_versoes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador')) WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'));

-- 7. Logs
CREATE TABLE public.relatorio_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  relatorio_id uuid NOT NULL REFERENCES public.relatorios(id) ON DELETE CASCADE,
  versao_id uuid REFERENCES public.relatorio_versoes(id),
  usuario_id uuid NOT NULL,
  acao text NOT NULL DEFAULT 'criou',
  data timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.relatorio_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view relatorio_logs" ON public.relatorio_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin/trabalhador insert relatorio_logs" ON public.relatorio_logs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'trabalhador'));

-- 8. Add columns to relatorios
ALTER TABLE public.relatorios ADD COLUMN IF NOT EXISTS prazo_contratual_dias_uteis integer DEFAULT 0;
ALTER TABLE public.relatorios ADD COLUMN IF NOT EXISTS dias_parados integer DEFAULT 0;
ALTER TABLE public.relatorios ADD COLUMN IF NOT EXISTS dias_trabalhados integer DEFAULT 0;
ALTER TABLE public.relatorios ADD COLUMN IF NOT EXISTS prazo_ajustado integer DEFAULT 0;
ALTER TABLE public.relatorios ADD COLUMN IF NOT EXISTS saldo_prazo integer DEFAULT 0;

-- 9. Updated_at triggers for new tables
CREATE TRIGGER trg_updated_at_configuracoes_empresa BEFORE UPDATE ON public.configuracoes_empresa FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_diario_obra BEFORE UPDATE ON public.diario_obra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
