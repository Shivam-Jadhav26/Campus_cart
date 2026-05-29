// CampusCart — DashboardPlaceholder.jsx
import { Link } from "react-router-dom";

function DashboardPlaceholder() {
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
        <div style={{ fontSize: "4rem", marginBottom: "0.5rem" }}>📦</div>
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            color: "#ffffff",
            margin: "0 0 0.75rem",
            letterSpacing: "-0.02em",
          }}
        >
          My Dashboard
        </h1>
        <p
          style={{
            fontSize: "1rem",
            color: "rgba(255, 255, 255, 0.7)",
            lineHeight: 1.6,
            marginBottom: "2rem",
          }}
        >
          This is where you'll manage your listings, track transactions,
          view buyer/seller reviews, and monitor your campus marketplace activity.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "1rem",
            marginBottom: "2rem",
          }}
        >
          {[
            { emoji: "📋", label: "My Listings" },
            { emoji: "💳", label: "Transactions" },
            { emoji: "⭐", label: "Reviews" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "1.25rem 0.75rem",
              }}
            >
              <div style={{ fontSize: "1.5rem", marginBottom: "0.4rem" }}>
                {item.emoji}
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "rgba(255, 255, 255, 0.5)",
                  fontWeight: 500,
                }}
              >
                {item.label}
              </div>
            </div>
          ))}
        </div>

        <Link to="/" style={{ textDecoration: "none" }}>
          <button
            style={{
              padding: "0.65rem 1.75rem",
              fontSize: "0.95rem",
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
            ← Back to Marketplace
          </button>
        </Link>

        <p
          style={{
            marginTop: "2rem",
            fontSize: "0.8rem",
            color: "rgba(255, 255, 255, 0.35)",
            fontWeight: 500,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Dashboard UI . Phase 1 coming soon
        </p>
      </div>
    </div>
  );
}

export default DashboardPlaceholder;
