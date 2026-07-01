import React from "react";

/* Last-resort catch for render errors in any page. Without this, one throwing
   component blanks the whole app — on an installed PWA there's no console, so
   users just see a dead screen. Class component: error boundaries have no hook
   equivalent. */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="wrap" style={{ paddingTop: 24 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="disp" style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>
            SOMETHING BROKE
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
            This screen hit an error. Reloading usually fixes it — your data and
            settings are safe.
          </p>
          <button className="btn accent" onClick={() => window.location.reload()}>
            ↻ Reload
          </button>
        </div>
      </div>
    );
  }
}
