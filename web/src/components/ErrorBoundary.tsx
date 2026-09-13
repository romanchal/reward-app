import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : 'Unexpected error' };
  }

  componentDidCatch(error: unknown) {
    if (typeof console !== 'undefined') console.error('[ErrorBoundary]', error);
  }

  reset = () => {
    this.setState({ hasError: false, message: '' });
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="fatal-shell" role="alert">
          <div className="card fatal-card">
            <h1>Something went wrong</h1>
            <p>{this.state.message}</p>
            <p className="muted">Reload to try again. If the problem persists, check your connection.</p>
            <button className="btn btn-primary" onClick={this.reset}>Reload app</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
