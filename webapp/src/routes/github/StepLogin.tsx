import React, { useState } from "react";
import { supabase } from "../../auth/SupabaseClient";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Separator } from "../../components/ui/separator";

export default function StepLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("Log in or register with Supabase");
  const [session, setSession] = useState<any>(null);

  const register = async () => {
    setStatus("Registering...");
    const { data, error } = await supabase.auth.signUp({ email, password });
    setStatus(
      error
        ? `Registration failed: ${error.message}`
        : "Registration successful. Check your email."
    );
    await showSession();
  };

  const login = async () => {
    setStatus("Logging in...");
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setStatus(
      error ? `Login failed: ${error.message}` : `Welcome ${data.user?.email}`
    );
    await showSession();
  };

  const logout = async () => {
    setStatus("Logging out...");
    const { error } = await supabase.auth.signOut();
    setStatus(error ? `Logout failed: ${error.message}` : "Logged out");
    await showSession();
  };

  const showSession = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    setSession(session);
  };

  return (
    <section>
      <h2 style={{ fontSize: 18, fontWeight: 600 }}>Supabase Authentication</h2>
      <p style={{ color: "#555" }}>{status}</p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 10,
          maxWidth: 420,
        }}
      >
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Email
          </label>
          <Input
            type="email"
            value={email}
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
            Password
          </label>
          <Input
            type="password"
            value={password}
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button onClick={register}>Register</Button>
          <Button onClick={login}>Login</Button>
          <Button variant="secondary" onClick={logout}>
            Logout
          </Button>
          <Button variant="secondary" onClick={showSession}>
            Show Session
          </Button>
        </div>
      </div>

      <Separator style={{ margin: "16px 0" }} />
    </section>
  );
}

const preStyle: React.CSSProperties = {
  background: "#f8f9fa",
  padding: "1rem",
  whiteSpace: "pre-wrap",
  borderRadius: 6,
  border: "1px solid #e9ecef",
  fontSize: 12,
  maxHeight: 300,
  overflow: "auto",
};
