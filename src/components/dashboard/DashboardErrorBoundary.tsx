import { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}
interface State { hasError: boolean; error?: Error }

export default class DashboardErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[DashboardErrorBoundary]', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="border-destructive/40">
          <CardContent className="p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                {this.props.fallbackTitle || 'Não foi possível carregar este conteúdo.'}
              </p>
              {this.state.error?.message && (
                <p className="text-xs text-muted-foreground mt-1 truncate">{this.state.error.message}</p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={this.reset}>Recarregar</Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}
