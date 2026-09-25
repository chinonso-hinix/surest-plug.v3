/**
 * Surest Plug - Robust React Error Boundary
 * Prevents any component crash or runtime exception from causing a blank screen.
 * Displays a clean, user-friendly recovery UI while keeping the rest of the application functional.
 */

import React from 'react';

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Surest Plug ErrorBoundary caught error]:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 sm:p-8 bg-white border border-slate-200 rounded-3xl shadow-sm text-center max-w-lg mx-auto my-8">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">
            {this.props.fallbackTitle || 'Something went wrong loading this section'}
          </h3>
          <p className="text-sm text-slate-600 mb-6">
            {this.props.fallbackMessage || 'An unexpected issue occurred. Your account balance and data are completely safe.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Try Again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm rounded-xl transition-all cursor-pointer"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
