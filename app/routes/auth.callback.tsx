import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../auth/SupabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          navigate("/landing?error=auth_failed");
          return;
        }

        if (data.session) {
          console.log("Authentication successful:", data.session.user.email);
          navigate("/mission-control");
        } else {
          console.log("No session found");
          navigate("/landing");
        }
      } catch (error) {
        console.error("Auth callback failed:", error);
        navigate("/landing?error=auth_failed");
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
        <p>Completing authentication...</p>
      </div>
    </div>
  );
}
