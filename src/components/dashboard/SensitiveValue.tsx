import { ReactNode } from 'react';
import { useValueVisibility } from '@/hooks/useValueVisibility';

interface Props {
  children: ReactNode;
  className?: string;
}

export default function SensitiveValue({ children, className }: Props) {
  const { hidden } = useValueVisibility();
  if (hidden) {
    return <span className={`text-muted-foreground ${className || ''}`}>•••••</span>;
  }
  return <>{children}</>;
}
