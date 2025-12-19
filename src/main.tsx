import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Inline ErrorBoundary to avoid import issues
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false, error: undefined as Error | undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App crashed:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div style={{
        minHeight: "100vh",
        backgroundColor: "#f8fafc",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "system-ui, sans-serif"
      }}>
        <div style={{
          maxWidth: "32rem",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          backgroundColor: "white",
          padding: "24px"
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
              padding: "12px"
            }}>
              {this.state.error.message}
            </pre>
          )}
          <button
            type="button"
            style={{
              marginTop: "20px",
              borderRadius: "6px",
              backgroundColor: "#c5a059",
              padding: "8px 16px",
              fontSize: "0.875rem",
              color: "white",
              border: "none",
              cursor: "pointer"
            }}
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      </div>
    );
  }
}

// Mount the app with error handling
const rootElement = document.getElementById("root");

if (rootElement) {
  rootElement.innerHTML = "";
  
  try {
    const root = createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Failed to initialize React:", error);
    rootElement.innerHTML = `
      <div style="padding: 40px; font-family: system-ui;">
        <h1 style="color: #dc2626;">Failed to mount</h1>
        <pre style="background: #f1f5f9; padding: 16px; border-radius: 8px;">${error}</pre>
      </div>
    `;
  }
}
