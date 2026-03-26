
-- Drop and recreate all triggers to ensure they're properly attached

-- Auto generate parcelas
DROP TRIGGER IF EXISTS trg_auto_generate_parcelas ON public.receitas;
CREATE TRIGGER trg_auto_generate_parcelas AFTER INSERT ON public.receitas FOR EACH ROW EXECUTE FUNCTION public.auto_generate_parcelas();

-- Auto despesa material
DROP TRIGGER IF EXISTS trg_auto_despesa_material ON public.compras_materiais;
CREATE TRIGGER trg_auto_despesa_material AFTER INSERT ON public.compras_materiais FOR EACH ROW EXECUTE FUNCTION public.auto_despesa_material();

-- Auto despesa manutencao
DROP TRIGGER IF EXISTS trg_auto_despesa_manutencao ON public.manutencao_ferramentas;
CREATE TRIGGER trg_auto_despesa_manutencao AFTER INSERT ON public.manutencao_ferramentas FOR EACH ROW EXECUTE FUNCTION public.auto_despesa_manutencao();

-- Auto despesa mao de obra
DROP TRIGGER IF EXISTS trg_auto_despesa_mao_obra ON public.mao_de_obra;
CREATE TRIGGER trg_auto_despesa_mao_obra AFTER INSERT ON public.mao_de_obra FOR EACH ROW EXECUTE FUNCTION public.auto_despesa_mao_obra();

-- updated_at triggers (only for tables that don't have them yet)
DROP TRIGGER IF EXISTS trg_updated_at_clientes ON public.clientes;
CREATE TRIGGER trg_updated_at_clientes BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_receitas ON public.receitas;
CREATE TRIGGER trg_updated_at_receitas BEFORE UPDATE ON public.receitas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_parcelas ON public.parcelas;
CREATE TRIGGER trg_updated_at_parcelas BEFORE UPDATE ON public.parcelas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_despesas ON public.despesas;
CREATE TRIGGER trg_updated_at_despesas BEFORE UPDATE ON public.despesas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_compras_materiais ON public.compras_materiais;
CREATE TRIGGER trg_updated_at_compras_materiais BEFORE UPDATE ON public.compras_materiais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_compras_ferramentas ON public.compras_ferramentas;
CREATE TRIGGER trg_updated_at_compras_ferramentas BEFORE UPDATE ON public.compras_ferramentas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_manutencao_ferramentas ON public.manutencao_ferramentas;
CREATE TRIGGER trg_updated_at_manutencao_ferramentas BEFORE UPDATE ON public.manutencao_ferramentas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_mao_de_obra ON public.mao_de_obra;
CREATE TRIGGER trg_updated_at_mao_de_obra BEFORE UPDATE ON public.mao_de_obra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_atividades_obra ON public.atividades_obra;
CREATE TRIGGER trg_updated_at_atividades_obra BEFORE UPDATE ON public.atividades_obra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_relatorios ON public.relatorios;
CREATE TRIGGER trg_updated_at_relatorios BEFORE UPDATE ON public.relatorios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_imagens ON public.imagens;
CREATE TRIGGER trg_updated_at_imagens BEFORE UPDATE ON public.imagens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_profiles ON public.profiles;
CREATE TRIGGER trg_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_updated_at_user_roles ON public.user_roles;
CREATE TRIGGER trg_updated_at_user_roles BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
