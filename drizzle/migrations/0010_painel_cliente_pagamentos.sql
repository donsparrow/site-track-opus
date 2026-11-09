ALTER TABLE public.obras ADD COLUMN IF NOT EXISTS exibir_pagamentos_cliente boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.pagamentos_cliente_obra(_obra_id uuid)
RETURNS TABLE(numero_parcela int, total_parcelas int, valor numeric, data_vencimento date, data_recebimento date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (row_number() OVER (ORDER BY p.data_vencimento, p.numero_parcela, p.id))::int,
    (count(*) OVER ())::int,
    p.valor,
    p.data_vencimento,
    p.data_recebimento
  FROM public.parcelas p
  JOIN public.receitas r ON r.id = p.receita_id
  WHERE r.obra_id = _obra_id
    AND public.can_access_obra(_obra_id)
    AND EXISTS (SELECT 1 FROM public.obras o WHERE o.id = _obra_id AND o.exibir_pagamentos_cliente = true)
  ORDER BY p.data_vencimento, p.numero_parcela, p.id
$$;
REVOKE ALL ON FUNCTION public.pagamentos_cliente_obra(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pagamentos_cliente_obra(uuid) TO authenticated;