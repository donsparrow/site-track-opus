
-- Attach trigger for auto-generating parcelas on receitas insert
DROP TRIGGER IF EXISTS trg_auto_generate_parcelas ON public.receitas;
CREATE TRIGGER trg_auto_generate_parcelas
  AFTER INSERT ON public.receitas
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_parcelas();

-- Attach trigger for auto-despesa on compras_materiais insert
DROP TRIGGER IF EXISTS trg_auto_despesa_material ON public.compras_materiais;
CREATE TRIGGER trg_auto_despesa_material
  AFTER INSERT ON public.compras_materiais
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_despesa_material();

-- Attach trigger for auto-despesa on manutencao_ferramentas insert
DROP TRIGGER IF EXISTS trg_auto_despesa_manutencao ON public.manutencao_ferramentas;
CREATE TRIGGER trg_auto_despesa_manutencao
  AFTER INSERT ON public.manutencao_ferramentas
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_despesa_manutencao();

-- Attach trigger for auto-despesa on mao_de_obra insert
DROP TRIGGER IF EXISTS trg_auto_despesa_mao_obra ON public.mao_de_obra;
CREATE TRIGGER trg_auto_despesa_mao_obra
  AFTER INSERT ON public.mao_de_obra
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_despesa_mao_obra();

-- Attach updated_at triggers to all relevant tables
DROP TRIGGER IF EXISTS trg_updated_at_obras ON public.obras;
CREATE TRIGGER trg_updated_at_obras BEFORE UPDATE ON public.obras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_clientes ON public.clientes;
CREATE TRIGGER trg_updated_at_clientes BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_receitas ON public.receitas;
CREATE TRIGGER trg_updated_at_receitas BEFORE UPDATE ON public.receitas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_despesas ON public.despesas;
CREATE TRIGGER trg_updated_at_despesas BEFORE UPDATE ON public.despesas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_parcelas ON public.parcelas;
CREATE TRIGGER trg_updated_at_parcelas BEFORE UPDATE ON public.parcelas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_profiles ON public.profiles;
CREATE TRIGGER trg_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_diario_obra ON public.diario_obra;
CREATE TRIGGER trg_updated_at_diario_obra BEFORE UPDATE ON public.diario_obra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_imagens ON public.imagens;
CREATE TRIGGER trg_updated_at_imagens BEFORE UPDATE ON public.imagens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_atividades_obra ON public.atividades_obra;
CREATE TRIGGER trg_updated_at_atividades_obra BEFORE UPDATE ON public.atividades_obra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_compras_materiais ON public.compras_materiais;
CREATE TRIGGER trg_updated_at_compras_materiais BEFORE UPDATE ON public.compras_materiais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_compras_ferramentas ON public.compras_ferramentas;
CREATE TRIGGER trg_updated_at_compras_ferramentas BEFORE UPDATE ON public.compras_ferramentas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_manutencao_ferramentas ON public.manutencao_ferramentas;
CREATE TRIGGER trg_updated_at_manutencao_ferramentas BEFORE UPDATE ON public.manutencao_ferramentas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_mao_de_obra ON public.mao_de_obra;
CREATE TRIGGER trg_updated_at_mao_de_obra BEFORE UPDATE ON public.mao_de_obra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_configuracoes_empresa ON public.configuracoes_empresa;
CREATE TRIGGER trg_updated_at_configuracoes_empresa BEFORE UPDATE ON public.configuracoes_empresa FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_user_roles ON public.user_roles;
CREATE TRIGGER trg_updated_at_user_roles BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Attach handle_new_user trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Add foreign keys that are missing from the schema
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'assinaturas_relatorio_id_fkey') THEN
    ALTER TABLE public.assinaturas ADD CONSTRAINT assinaturas_relatorio_id_fkey FOREIGN KEY (relatorio_id) REFERENCES public.relatorios(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'diario_equipe_diario_id_fkey') THEN
    ALTER TABLE public.diario_equipe ADD CONSTRAINT diario_equipe_diario_id_fkey FOREIGN KEY (diario_id) REFERENCES public.diario_obra(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'diario_atividades_diario_id_fkey') THEN
    ALTER TABLE public.diario_atividades ADD CONSTRAINT diario_atividades_diario_id_fkey FOREIGN KEY (diario_id) REFERENCES public.diario_obra(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'diario_materiais_diario_id_fkey') THEN
    ALTER TABLE public.diario_materiais ADD CONSTRAINT diario_materiais_diario_id_fkey FOREIGN KEY (diario_id) REFERENCES public.diario_obra(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'diario_ocorrencias_diario_id_fkey') THEN
    ALTER TABLE public.diario_ocorrencias ADD CONSTRAINT diario_ocorrencias_diario_id_fkey FOREIGN KEY (diario_id) REFERENCES public.diario_obra(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'diario_imagens_diario_id_fkey') THEN
    ALTER TABLE public.diario_imagens ADD CONSTRAINT diario_imagens_diario_id_fkey FOREIGN KEY (diario_id) REFERENCES public.diario_obra(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'diario_paralisacoes_diario_id_fkey') THEN
    ALTER TABLE public.diario_paralisacoes ADD CONSTRAINT diario_paralisacoes_diario_id_fkey FOREIGN KEY (diario_id) REFERENCES public.diario_obra(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'diario_obra_obra_id_fkey') THEN
    ALTER TABLE public.diario_obra ADD CONSTRAINT diario_obra_obra_id_fkey FOREIGN KEY (obra_id) REFERENCES public.obras(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'relatorio_versoes_relatorio_id_fkey') THEN
    ALTER TABLE public.relatorio_versoes ADD CONSTRAINT relatorio_versoes_relatorio_id_fkey FOREIGN KEY (relatorio_id) REFERENCES public.relatorios(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'relatorio_logs_relatorio_id_fkey') THEN
    ALTER TABLE public.relatorio_logs ADD CONSTRAINT relatorio_logs_relatorio_id_fkey FOREIGN KEY (relatorio_id) REFERENCES public.relatorios(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'relatorio_logs_versao_id_fkey') THEN
    ALTER TABLE public.relatorio_logs ADD CONSTRAINT relatorio_logs_versao_id_fkey FOREIGN KEY (versao_id) REFERENCES public.relatorio_versoes(id);
  END IF;
END $$;
