CREATE OR REPLACE FUNCTION public.relatorios_numeros(p_ids uuid[])
RETURNS TABLE(relatorio_id uuid, numero integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH numerados AS (
    SELECT r.id, r.obra_id, r.empresa_id, r.status,
           row_number() OVER (PARTITION BY r.obra_id ORDER BY r.created_at, r.id)::int AS numero
    FROM public.relatorios r
    WHERE r.obra_id IN (SELECT obra_id FROM public.relatorios WHERE id = ANY(p_ids))
  )
  SELECT n.id, n.numero
  FROM numerados n
  WHERE n.id = ANY(p_ids)
    AND (
      (n.empresa_id = public.get_user_empresa_id(auth.uid()) AND public.is_operacional(auth.uid()))
      OR (public.can_access_obra(n.obra_id) AND n.status = 'assinado')
    );
$$;
REVOKE ALL ON FUNCTION public.relatorios_numeros(uuid[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.relatorios_numeros(uuid[]) TO authenticated;