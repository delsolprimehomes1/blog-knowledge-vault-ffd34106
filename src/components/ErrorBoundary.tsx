import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("App crashed:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    // Use inline styles to ensure the error page always renders,
    // even if CSS hasn't loaded properly
    return (
      <div style={{
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        color: "#1e293b",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}>
        <main style={{
          width: "100%",
          maxWidth: "32rem",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          backgroundColor: "white",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
        }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "8px", fontSize: "0.875rem", color: "#64748b" }}>
            The app hit a runtime error. Reloading usually fixes this.
          </p>

          {this.state.error?.message && (
            <pre style={{
              marginTop: "16px",
              fontSize: "0.75rem",
              overflow: "auto",
              borderRadius: "6px",
              backgroundColor: "#f1f5f9",
              padding: "12px",
              color: "#334155"
            }}>
              {this.state.error.message}
            </pre>
          )}

          <div style={{ marginTop: "20px", display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <button
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "6px",
                backgroundColor: "#c5a059",
                padding: "8px 16px",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "white",
                border: "none",
                cursor: "pointer"
              }}
              onClick={() => window.location.reload()}
            >
              Reload
            </button>
            <button
              type="button"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "6px",
                border: "1px solid #e2e8f0",
                backgroundColor: "white",
                padding: "8px 16px",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#1e293b",
                cursor: "pointer"
              }}
              onClick={() => this.setState({ hasError: false, error: undefined })}
            >
              Try again
            </button>
          </div>
        </main>
      </div>
    );
  }
}
