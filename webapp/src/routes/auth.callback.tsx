import { supabase } from "@/auth/SupabaseClient";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

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
    <div className="flex items-center justify-center min-h-screen">
      <span className="text-lg text-gray-600">
        Redirecting to Mission Control..., if nothing happens please click{" "}
        <a href="/mission-control">here</a>
      </span>
    </div>
  );
}
