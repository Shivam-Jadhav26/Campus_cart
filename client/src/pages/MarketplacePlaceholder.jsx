// CampusCart — MarketplacePlaceholder.jsx
import { Link } from "react-router-dom";

function MarketplacePlaceholder() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
        fontFamily: "'Inter', sans-serif",
        padding: "2rem",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "520px",
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "24px",
          padding: "3rem 2.5rem",
          boxShadow: "0 24px 64px rgba(0, 0, 0, 0.3)",
        }}
      >
        <div style={{ fontSize: "4rem", marginBottom: "0.5rem" }}>🛒</div>
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            color: "#ffffff",
            margin: "0 0 0.75rem",
            letterSpacing: "-0.02em",
          }}
        >
          CampusCart
        </h1>
        <p
          style={{
            fontSize: "1.1rem",
            color: "rgba(255, 255, 255, 0.7)",
            lineHeight: 1.6,
            marginBottom: "2rem",
          }}
        >
          A campus centric peer to peer marketplace where students buy, sell,
          and trade textbooks, electronics, lab gear, and more safely within
          their campus community.
        </p>

        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/login" style={{ textDecoration: "none" }}>
            <button
              style={{
                padding: "0.75rem 2rem",
                fontSize: "1rem",
                fontWeight: 600,
                color: "#fff",
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                border: "none",
                borderRadius: "12px",
                cursor: "pointer",
                transition: "transform 0.2s, box-shadow 0.2s",
                boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.boxShadow = "0 8px 24px rgba(99, 102, 241, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.boxShadow = "0 4px 14px rgba(99, 102, 241, 0.4)";
              }}
            >
              Login
            </button>
          </Link>
          <Link to="/register" style={{ textDecoration: "none" }}>
            <button
              style={{
                padding: "0.75rem 2rem",
                fontSize: "1rem",
                fontWeight: 600,
                color: "rgba(255, 255, 255, 0.9)",
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "12px",
                cursor: "pointer",
                transition: "transform 0.2s, background 0.2s",
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-2px)";
                e.target.style.background = "rgba(255, 255, 255, 0.14)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
                e.target.style.background = "rgba(255, 255, 255, 0.08)";
              }}
            >
              Register
            </button>
          </Link>
        </div>

        <p
          style={{
            marginTop: "2.5rem",
            fontSize: "0.8rem",
            color: "rgba(255, 255, 255, 0.35)",
            fontWeight: 500,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Marketplace UI — Phase 1 coming soon
        </p>
      </div>
    </div>
  );
}

export default MarketplacePlaceholder;
