import { supabase } from "@/auth/SupabaseClient";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Parse hash fragment for tokens
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const access_token = params.get("access_token");
        const refresh_token =
          params.get("refresh_token") || params.get("provider_refresh_token");
        const expires_in = params.get("expires_in");

        if (access_token && refresh_token) {
          // Set the session manually
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) {
            console.error("Auth callback error:", error);
            navigate("/?error=auth_failed");
            return;
          }
          if (data.session) {
            console.log("Authentication successful:", data.session.user.email);
            navigate("/mission-control");
            return;
          }
        }

        // Fallback: check if session is already set
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          console.log("Authentication successful:", data.session.user.email);
          navigate("/mission-control");
        } else {
          console.log("No session found");
          navigate("/");
        }
      } catch (error) {
        console.error("Auth callback failed:", error);
        navigate("/?error=auth_failed");
      }
    };
    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <span className="text-lg text-gray-600">
        Redirecting to Mission Control..., if nothing happens please click{" "}
        <a href="/mission-control">here</a>
      </span>
    </div>
  );
}
