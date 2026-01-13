/**
 * Loading fallback component for Suspense
 * Shows a loading indicator while lazy-loaded components are being loaded
 */

export function LoadingFallback() {
  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "200px",
      width: "100%",
    }}>
      <div style={{
        textAlign: "center",
      }}>
        <div style={{
          border: "4px solid #f3f3f3",
          borderTop: "4px solid #3498db",
          borderRadius: "50%",
          width: "40px",
          height: "40px",
          animation: "spin 1s linear infinite",
          margin: "0 auto 10px",
        }} />
        <div style={{
          color: "#666",
          fontSize: "14px",
        }}>
          Loading...
        </div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

