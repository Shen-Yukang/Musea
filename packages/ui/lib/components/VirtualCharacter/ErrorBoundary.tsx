import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  maxRetries?: number;
}

export class VirtualCharacterErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId?: NodeJS.Timeout;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error details
    console.error('VirtualCharacter Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    // Update state with error details
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-retry logic for recoverable errors
    this.scheduleRetry();
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private scheduleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, retryCount) * 1000;

      this.retryTimeoutId = setTimeout(() => {
        console.log(`Attempting to recover VirtualCharacter (attempt ${retryCount + 1}/${maxRetries})`);
        this.setState(prevState => ({
          hasError: false,
          error: undefined,
          errorInfo: undefined,
          retryCount: prevState.retryCount + 1,
        }));
      }, delay);
    }
  };

  private handleManualRetry = () => {
    console.log('Manual retry triggered for VirtualCharacter');
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
    });
  };

  private isRecoverableError = (error: Error): boolean => {
    // Define which errors are recoverable
    const recoverableErrors = [
      'Extension context invalidated',
      'Chrome runtime API not available',
      'Network request failed',
      'Storage access denied',
    ];

    return recoverableErrors.some(msg => error.message.includes(msg));
  };

  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallback, maxRetries = 3 } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Check if error is recoverable and we haven't exceeded retry limit
      const isRecoverable = this.isRecoverableError(error);
      const canRetry = retryCount < maxRetries;

      return (
        <div className="virtual-character-error-boundary">
          <div className="error-container p-4 bg-red-50 border border-red-200 rounded-lg shadow-sm">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Virtual Character Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>
                    {isRecoverable
                      ? 'A recoverable error occurred with the virtual character.'
                      : 'An unexpected error occurred with the virtual character.'}
                  </p>
                  {process.env.NODE_ENV === 'development' && (
                    <details className="mt-2">
                      <summary className="cursor-pointer font-medium">Error Details</summary>
                      <pre className="mt-1 text-xs bg-red-100 p-2 rounded overflow-auto">
                        {error.message}
                        {error.stack && `\n\nStack trace:\n${error.stack}`}
                      </pre>
                    </details>
                  )}
                </div>
                <div className="mt-4 flex space-x-2">
                  {isRecoverable && canRetry && (
                    <button
                      onClick={this.handleManualRetry}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                      Retry ({maxRetries - retryCount} attempts left)
                    </button>
                  )}
                  <button
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                    Reload Page
                  </button>
                </div>
                {retryCount > 0 && (
                  <p className="mt-2 text-xs text-red-600">
                    Retry attempts: {retryCount}/{maxRetries}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// Hook version for functional components
export const useVirtualCharacterErrorHandler = () => {
  const handleError = React.useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    console.error('VirtualCharacter error caught by hook:', error);
    console.error('Error info:', errorInfo);

    // Report to error tracking service if available
    if (typeof window !== 'undefined' && (window as any).__EXTENSION_NAMESPACE__?.errorReporter) {
      (window as any).__EXTENSION_NAMESPACE__.errorReporter.report(error, {
        component: 'VirtualCharacter',
        errorInfo,
      });
    }
  }, []);

  return { handleError };
};
