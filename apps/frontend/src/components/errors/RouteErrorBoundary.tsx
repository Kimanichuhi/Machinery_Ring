import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type RouteErrorBoundaryProps = {
  children: React.ReactNode;
  section: string;
};

type RouteErrorBoundaryState = {
  error: Error | null;
};

// Browsers phrase dynamic-import/chunk-load failures differently, but they all
// mean the same thing: the module graph the page loaded is stale (dev server
// restarted, or a deploy shipped new hashed chunk filenames).
const CHUNK_LOAD_ERROR_PATTERN =
  /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i;

function isChunkLoadError(error: Error): boolean {
  return CHUNK_LOAD_ERROR_PATTERN.test(error.message);
}

export class RouteErrorBoundary extends React.Component<RouteErrorBoundaryProps, RouteErrorBoundaryState> {
  state: RouteErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  componentDidMount() {
    // A successful mount means this route's chunk is reachable again —
    // clear the guard so a future genuine failure still gets one auto-reload.
    sessionStorage.removeItem(`chunk-reload-${this.props.section}`);
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.section}:`, error, errorInfo);

    // React.lazy() caches the rejected import promise forever, so clearing
    // local state and re-rendering re-throws the exact same error. A real
    // reload is the only way to recover, so do it automatically once — but
    // guard against a reload loop if the module genuinely can't be reached.
    if (isChunkLoadError(error)) {
      const reloadKey = `chunk-reload-${this.props.section}`;
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, '1');
        window.location.reload();
      }
    }
  }

  private handleRetry = () => {
    if (this.state.error && isChunkLoadError(this.state.error)) {
      window.location.reload();
      return;
    }
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    const chunkError = isChunkLoadError(this.state.error);

    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <Card className="w-full max-w-xl border-destructive/30">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{this.props.section} could not load</CardTitle>
                <CardDescription>
                  {chunkError
                    ? 'A newer version of the app is available. Reloading the page will fix this.'
                    : 'This section hit an error, but the rest of the dashboard is still available.'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
              {this.state.error.message || 'An unexpected error occurred.'}
            </p>
            <Button onClick={this.handleRetry} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              {chunkError ? 'Reload page' : 'Try again'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
}
