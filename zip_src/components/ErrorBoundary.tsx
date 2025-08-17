import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Enhanced error logging for crash detection
    console.error('🚨 [ERROR-BOUNDARY] Error caught:', error);
    console.error('🚨 [ERROR-BOUNDARY] Error info:', errorInfo);
    console.error('🚨 [ERROR-BOUNDARY] Component stack:', errorInfo.componentStack);
    console.error('🚨 [ERROR-BOUNDARY] Error stack:', error.stack);
    console.error('🚨 [ERROR-BOUNDARY] Timestamp:', new Date().toISOString());
    
    this.setState({
      error,
      errorInfo
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // Crash detection: render solid red banner instead of themed box
      return (
        <div style={{background:'red',color:'#fff',padding:20,zIndex:9999}}>
          FATAL: {this.state.error?.message}
          <details style={{marginTop:10}}>
            <summary style={{cursor:'pointer'}}>Stack Trace</summary>
            <pre style={{fontSize:12,marginTop:10,background:'rgba(0,0,0,0.3)',padding:10}}>
              {this.state.error?.stack}
            </pre>
          </details>
          <details style={{marginTop:10}}>
            <summary style={{cursor:'pointer'}}>Component Stack</summary>
            <pre style={{fontSize:12,marginTop:10,background:'rgba(0,0,0,0.3)',padding:10}}>
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;