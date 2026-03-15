import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary for catching and handling errors gracefully
 * Provides fallback UI when components fail to render
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="w-full max-w-md bg-card rounded-lg border border-border shadow-lg p-8">
            <div className="flex items-center justify-center w-12 h-12 bg-destructive/10 rounded-lg mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold text-foreground text-center mb-2">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {this.state.error?.message || 'An unexpected error occurred. Please try refreshing the page.'}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={this.handleReset}
                className="flex-1"
              >
                Try Again
              </Button>
              <Button
                onClick={() => window.location.href = '/'}
                className="flex-1"
              >
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
