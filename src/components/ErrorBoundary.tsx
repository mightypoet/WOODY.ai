import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a0a0a] text-white p-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Something went wrong.</h1>
          <p className="text-zinc-500 mb-8 max-w-md">
            The application encountered an unexpected error. Please try refreshing the page.
          </p>
          <div className="bg-zinc-900 p-4 rounded-lg text-left overflow-auto max-w-2xl w-full mb-8">
            <code className="text-red-400 text-sm">
              {this.state.error?.toString()}
            </code>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
