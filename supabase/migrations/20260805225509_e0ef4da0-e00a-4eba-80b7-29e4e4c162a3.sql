CREATE OR REPLACE FUNCTION public.pasta_obra_acessivel(_pasta_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documentos_pastas p
    WHERE p.id = _pasta_id AND public.can_access_obra(p.obra_id)
  )
$$;

CREATE OR REPLACE FUNCTION public.pasta_visivel_cliente(_pasta_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.documentos_arquivos a
    WHERE a.pasta_id = _pasta_id AND a.visivel_cliente = true
  )
$$;

DROP POLICY IF EXISTS "Cliente view documentos_pastas com arquivos liberados" ON public.documentos_pastas;
CREATE POLICY "Cliente view documentos_pastas com arquivos liberados"
ON public.documentos_pastas FOR SELECT TO authenticated
USING (public.can_access_obra(obra_id) AND public.pasta_visivel_cliente(id));

DROP POLICY IF EXISTS "Cliente view documentos_arquivos liberados" ON public.documentos_arquivos;
CREATE POLICY "Cliente view documentos_arquivos liberados"
ON public.documentos_arquivos FOR SELECT TO authenticated
USING (visivel_cliente = true AND public.pasta_obra_acessivel(pasta_id));

REVOKE ALL ON FUNCTION public.pasta_obra_acessivel(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pasta_visivel_cliente(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pasta_obra_acessivel(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pasta_visivel_cliente(uuid) TO authenticated;