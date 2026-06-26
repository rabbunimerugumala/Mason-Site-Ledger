import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Trash2 } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      window.location.reload();
    } catch (e) {
      console.error("Failed to clear localStorage", e);
      window.location.reload();
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans text-gray-900">
          <div className="w-full max-w-md bg-white rounded-2xl border-3 border-gray-950 p-6 shadow-2xl space-y-6">
            
            {/* Header Icon */}
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0 text-red-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-red-600">App Load Error</span>
                <h2 className="text-xl font-black text-gray-950 uppercase tracking-tight">Something Went Wrong</h2>
              </div>
            </div>

            {/* Friendly message */}
            <div className="space-y-2">
              <p className="text-base font-bold text-gray-800 leading-relaxed">
                The application encountered an unexpected issue and could not display this screen.
              </p>
              <p className="text-xs text-gray-500 font-medium">
                This might be caused by temporary connection problems, private browsing restrictions, or corrupted local browser storage.
              </p>
            </div>

            {/* Details Box */}
            {this.state.error && (
              <div className="p-3 bg-gray-50 border border-gray-300 rounded-xl text-left font-mono text-xs text-red-700 overflow-auto max-h-40 space-y-1">
                <p className="font-extrabold">{this.state.error.toString()}</p>
                {this.state.errorInfo && (
                  <pre className="text-[10px] text-gray-500 whitespace-pre-wrap font-sans leading-tight">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full py-3.5 px-4 bg-royal-green text-white text-base font-black uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 animate-spin-reverse" />
                Try Reopening App
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="w-full py-3 px-4 border-2 border-red-500 text-red-800 text-sm font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                title="Clears saved sites and transactions from this phone's memory to fix starting issues."
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                Reset App Data & Restart
              </button>
            </div>
            
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
