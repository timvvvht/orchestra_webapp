import React from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Separator } from "../../components/ui/separator";

const steps = [
  { to: "/github/connect/config", label: "1) Configure ACS" },
  { to: "/github/connect/login", label: "2) Supabase Login" },
  { to: "/github/connect/exchange", label: "3) Exchange Cookies" },
  { to: "/github/connect/install", label: "4) Install & Verify" },
];

export default function GitHubWizardLayout() {
  const location = useLocation();
  return (
    <div style={{ maxWidth: 960, margin: "2rem auto", padding: "0 1rem" }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
        GitHub Access Wizard
      </h1>
      <p style={{ color: "#555", marginBottom: 16 }}>
        Grant Orchestra Agents access to your repositories via Supabase → ACS →
        GitHub App.
      </p>

      <nav style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {steps.map((s) => (
          <NavLink
            key={s.to}
            to={s.to}
            style={({ isActive }) => ({
              padding: "8px 12px",
              borderRadius: 6,
              textDecoration: "none",
              background: isActive ? "#e9f2ff" : "#f6f7f9",
              border: "1px solid #e1e4e8",
              color: "#111",
              fontWeight: isActive ? 600 : 500,
            })}
          >
            {s.label}
          </NavLink>
        ))}
      </nav>

      <Separator style={{ margin: "16px 0" }} />

      <Outlet />
    </div>
  );
}
