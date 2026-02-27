import Link from "next/link";

export default function HomePage() {
  return (
    <div style={container}>
      <h1 style={title}>Integrated Trade Finance Platform</h1>
      <p style={subtitle}>Choose your role</p>

      <div style={grid}>
        {/* Importer */}
        <Link href="/importer/open-lc" style={{ textDecoration: "none" }}>
          <div style={card}>
            <h2 style={cardTitle}>🧑‍💼 Importer</h2>
            <p style={cardText}>Open Letter of Credit</p>
          </div>
        </Link>

        {/* Exporter */}
        <Link href="/exporter/dashboard" style={{ textDecoration: "none" }}>
          <div style={card}>
            <h2 style={cardTitle}>📦 Exporter</h2>
            <p style={cardText}>Accept LC & Ship Goods</p>
          </div>
        </Link>

        {/* Logistics */}
        <Link href="/logistics/dashboard" style={{ textDecoration: "none" }}>
          <div style={card}>
            <h2 style={cardTitle}>🚚 Logistics</h2>
            <p style={cardText}>Update Shipment Status</p>
          </div>
        </Link>

        {/* Bank */}
        <Link href="/bank/dashboard" style={{ textDecoration: "none" }}>
          <div style={card}>
            <h2 style={cardTitle}>🏦 Bank</h2>
            <p style={cardText}>Verify & Release Payment</p>
          </div>
        </Link>
      </div>

      <p style={warning}>
        ⚠ Demo purpose only – role switching without authentication
      </p>
    </div>
  );
}

/* ================= STYLES ================= */

const container: React.CSSProperties = {
  minHeight: "100vh",
  background: "radial-gradient(circle at top, #111 0%, #000 60%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  color: "#fff",
};

const title: React.CSSProperties = {
  fontSize: "36px",
  fontWeight: "bold",
  marginBottom: "10px",
};

const subtitle: React.CSSProperties = {
  fontSize: "16px",
  opacity: 0.8,
  marginBottom: "40px",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "20px",
  width: "80%",
  maxWidth: "900px",
};

const card: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  borderRadius: "12px",
  padding: "20px",
  textAlign: "center",
  cursor: "pointer",
  border: "1px solid rgba(255,255,255,0.1)",
  transition: "all 0.2s ease",
};

const cardTitle: React.CSSProperties = {
  fontSize: "20px",
  marginBottom: "8px",
  color: "#fff",
};

const cardText: React.CSSProperties = {
  fontSize: "14px",
  opacity: 0.85,
  color: "#ddd",
};

const warning: React.CSSProperties = {
  marginTop: "30px",
  fontSize: "13px",
  opacity: 0.6,
};

