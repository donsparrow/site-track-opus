import { cn } from '@/lib/utils';

interface GlobalFooterProps {
  variant?: 'default' | 'overlay';
}

export default function GlobalFooter({ variant = 'default' }: GlobalFooterProps) {
  return (
    <footer
      className={cn(
        'w-full px-4 py-3',
        variant === 'overlay'
          ? 'bg-black/50 backdrop-blur-sm'
          : 'border-t border-border bg-muted/30'
      )}
    >
      <p
        className={cn(
          'text-center text-xs',
          variant === 'overlay'
            ? 'text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]'
            : 'text-muted-foreground'
        )}
      >
        © 2026 Grupo J&A Engenharia LTDA. Soluções inteligentes em engenharia.
      </p>
    </footer>
  );
}
