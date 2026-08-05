import { useEffect, useRef, useState } from 'react';

/**
 * Mantém um valor local responsivo (slider) e dispara `commit` 500ms após a última alteração.
 */
export function useDebouncedValue(initial: number, commit: (value: number) => void, delay = 500) {
  const [value, setValue] = useState(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);

  // Sincroniza com o servidor quando não há edição pendente
  useEffect(() => {
    if (!dirty.current) setValue(initial);
  }, [initial]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const onChange = (next: number) => {
    dirty.current = true;
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      dirty.current = false;
      commit(next);
    }, delay);
  };

  return { value, onChange };
}
