import { useAuth } from "@/auth/AuthContext";
import { Button } from "@/components/ui/Button";

export function SignOutButton() {
  const { logout, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div
      onClick={logout}
      className="px-4 py-2 text-white/70 hover:text-white cursor-pointer border border-white/20 rounded-md hover:bg-white/10 transition-colors"
    >
      Sign Out
    </div>
  );
}
