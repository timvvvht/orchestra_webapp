import { useAuth } from "@/auth/AuthContext";
import { GitHubConnectButton } from "@/components/ui/GitHubConnectButton";
import { Link, useLocation } from "react-router-dom";

export default function Landing() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const authFailed = params.get("error") === "auth_failed";

  const { setShowModal } = useAuth();

  return (
    <main className="min-h-screen relative orchestra-page">
      {/* Background layers */}
      <div className="page-void">
        <div className="page-void-gradient" />
        <div className="page-void-orb-blue" />
        <div className="page-void-orb-purple" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center py-24 px-6">
        <div className="glass-panel content-narrow w-full p-10 text-center">
          <h1 className="text-display mb-8">Orchestra</h1>
          <p className="text-body mb-8">
            Welcome to Orchestra - your AI development environment.
          </p>
          {authFailed ? (
            <>
              <div className="mb-4 p-3 rounded bg-red-100 text-red-700 border border-red-300 text-center">
                Login failed. Please try again.
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="btn-primary inline-block mt-2 px-6 py-2 rounded bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition"
              >
                Retry
              </button>
            </>
          ) : (
            <Link to="/mission-control" className="btn-primary inline-block">
              Open Mission Control
            </Link>
          )}
          <GitHubConnectButton />
        </div>
      </div>
    </main>
  );
}
