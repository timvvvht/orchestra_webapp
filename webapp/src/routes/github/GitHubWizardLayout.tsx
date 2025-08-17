import React, { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Separator } from "../../components/ui/separator";
import { Button } from "../../components/ui/Button";

const steps = [
  { to: "/github/connect/config", label: "1) Configure ACS" },
  { to: "/github/connect/login", label: "2) Supabase Login" },
  { to: "/github/connect/exchange", label: "3) Exchange Cookies" },
  { to: "/github/connect/install", label: "4) Install & Verify" },
];

export default function GitHubWizardLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const currentIndex = steps.findIndex((step) => step.to === location.pathname);
  const canGoBack = currentIndex > 0;
  const canGoNext = currentIndex < steps.length - 1;

  useEffect(() => {
    const handleStepSuccess = () => {
      const currentPath = window.location.pathname;
      console.log("Received stepSuccess event, current path:", currentPath);
      const currentIndex = steps.findIndex((step) => step.to === currentPath);
      const nextStep = steps[currentIndex + 1];
      console.log("Current index:", currentIndex, "Next step:", nextStep);
      if (nextStep) {
        setTimeout(() => {
          console.log("Navigating to:", nextStep.to);
          navigate(nextStep.to);
        }, 2000);
      }
    };

    window.addEventListener("stepSuccess", handleStepSuccess);
    return () => window.removeEventListener("stepSuccess", handleStepSuccess);
  }, [navigate]);

  return (
    <div style={{ maxWidth: 960, margin: "2rem auto", padding: "0 1rem" }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8 }}>
        GitHub Access Wizard
      </h1>
      <p style={{ color: "#555", marginBottom: 16 }}>
        Grant Orchestra Agents access to your repositories via Supabase → ACS →
        GitHub App.
      </p>

      <Outlet />

      <div className="flex gap-12 min-w-full mt-24 justify-between">
        <Button
          onClick={() => navigate(steps[currentIndex - 1].to)}
          disabled={!canGoBack}
          className="cursor-pointer"
        >
          Back
        </Button>
        <Button
          onClick={() => navigate(steps[currentIndex + 1].to)}
          disabled={!canGoNext}
          className="cursor-pointer"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
