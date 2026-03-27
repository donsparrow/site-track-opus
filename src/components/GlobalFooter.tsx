import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function GlobalFooter() {
  const [texto, setTexto] = useState('');

  useEffect(() => {
    supabase
      .from('configuracoes_empresa')
      .select('texto_rodape')
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data?.texto_rodape) setTexto(data.texto_rodape);
      });
  }, []);

  if (!texto) return null;

  return (
    <footer className="w-full border-t border-border bg-muted/30 px-4 py-3">
      <p className="text-center text-xs text-muted-foreground whitespace-pre-line">
        {texto}
      </p>
    </footer>
  );
}
