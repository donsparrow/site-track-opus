import { useId, useState, type ReactElement } from 'react';
import { Button } from '@/components/ui/button';

export const LIMITE_PAINEL = 3;

/** Título com total quando a lista passa do limite visível. */
export function tituloComTotal(titulo: string, total: number) {
  return total > LIMITE_PAINEL ? `${titulo} (${total})` : titulo;
}

interface Props<T> {
  itens: T[];
  /** Deve retornar um elemento com `key`. */
  render: (item: T) => ReactElement;
  limite?: number;
  as?: 'ul' | 'div';
  className?: string;
  rotuloMais?: (restantes: number) => string;
}

/** Mostra os primeiros itens e um botão "Ver mais (N)" / "Ver menos". */
export default function ListaExpansivel<T>({ itens, render, limite = LIMITE_PAINEL, as = 'ul', className, rotuloMais }: Props<T>) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const visiveis = aberto ? itens : itens.slice(0, limite);
  const restantes = itens.length - limite;
  const Tag = as;
  return (
    <div>
      <Tag id={id} className={className}>{visiveis.map((it) => render(it))}</Tag>
      {restantes > 0 && (
        <Button type="button" variant="link" size="sm" className="mt-2 h-auto px-0 text-accent"
          aria-expanded={aberto} aria-controls={id} onClick={() => setAberto((v) => !v)}>
          {aberto ? 'Ver menos' : rotuloMais ? rotuloMais(restantes) : `Ver mais (${restantes})`}
        </Button>
      )}
    </div>
  );
}
