import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useAuth } from '@/auth/AuthContext';
import { GoogleLoginButton } from '@/auth/GoogleLoginButton';
import { Loader2 } from 'lucide-react';

export const AuthModal = () => {
  const { showModal, setShowModal, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  if (isAuthenticated) return null;

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // The actual login is handled by GoogleLoginButton
      // This wrapper adds loading state management
    } catch {
      setError('Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="w-[300px] p-6 rounded-xl
                              bg-black/80 backdrop-blur-md
                              border border-white/10">
      {/* Google CTA */}
      <div onClick={handleGoogleLogin} className="relative">
        <GoogleLoginButton />                     {/* existing component */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-white/10">
            <Loader2 className="w-4 h-4 animate-spin text-white/80" />
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 text-[11px] text-center text-red-400">{error}</p>
      )}
    </DialogContent>
  </Dialog>
  );
};