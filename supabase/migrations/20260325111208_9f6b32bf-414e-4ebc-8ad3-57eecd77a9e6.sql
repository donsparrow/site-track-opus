
-- The previous migration partially applied. Re-create only the updated_at triggers that may not have been created.
-- Use IF NOT EXISTS pattern via DROP IF EXISTS + CREATE
DROP TRIGGER IF EXISTS trg_updated_at_obras ON public.obras;
DROP TRIGGER IF EXISTS trg_updated_at_clientes ON public.clientes;
DROP TRIGGER IF EXISTS trg_updated_at_receitas ON public.receitas;
DROP TRIGGER IF EXISTS trg_updated_at_parcelas ON public.parcelas;
DROP TRIGGER IF EXISTS trg_updated_at_despesas ON public.despesas;
DROP TRIGGER IF EXISTS trg_updated_at_compras_materiais ON public.compras_materiais;
DROP TRIGGER IF EXISTS trg_updated_at_compras_ferramentas ON public.compras_ferramentas;
DROP TRIGGER IF EXISTS trg_updated_at_manutencao_ferramentas ON public.manutencao_ferramentas;
DROP TRIGGER IF EXISTS trg_updated_at_mao_de_obra ON public.mao_de_obra;
DROP TRIGGER IF EXISTS trg_updated_at_atividades_obra ON public.atividades_obra;
DROP TRIGGER IF EXISTS trg_updated_at_imagens ON public.imagens;
DROP TRIGGER IF EXISTS trg_updated_at_relatorios ON public.relatorios;
DROP TRIGGER IF EXISTS trg_updated_at_profiles ON public.profiles;
DROP TRIGGER IF EXISTS trg_updated_at_user_roles ON public.user_roles;

CREATE TRIGGER trg_updated_at_obras BEFORE UPDATE ON public.obras FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_clientes BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_receitas BEFORE UPDATE ON public.receitas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_parcelas BEFORE UPDATE ON public.parcelas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_despesas BEFORE UPDATE ON public.despesas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_compras_materiais BEFORE UPDATE ON public.compras_materiais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_compras_ferramentas BEFORE UPDATE ON public.compras_ferramentas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_manutencao_ferramentas BEFORE UPDATE ON public.manutencao_ferramentas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_mao_de_obra BEFORE UPDATE ON public.mao_de_obra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_atividades_obra BEFORE UPDATE ON public.atividades_obra FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_imagens BEFORE UPDATE ON public.imagens FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_relatorios BEFORE UPDATE ON public.relatorios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_profiles BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_updated_at_user_roles BEFORE UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
