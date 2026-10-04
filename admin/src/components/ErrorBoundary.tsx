import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean; message: string }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };
  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : 'Unexpected error' };
  }
  componentDidCatch(error: unknown) {
    if (typeof console !== 'undefined') console.error('[admin:ErrorBoundary]', error);
    import('../lib/sentry').then(({ captureError }) => captureError(error)).catch(() => undefined);
  }
  reset = () => {
    this.setState({ hasError: false, message: '' });
    if (typeof window !== 'undefined') window.location.reload();
  };
  render() {
    if (this.state.hasError) {
      return (
        <div className="admin-fatal" role="alert">
          <div className="card">
            <h1>Something went wrong</h1>
            <p>{this.state.message}</p>
            <button className="btn btn-primary" onClick={this.reset}>Reload console</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
