import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { OAuthButton } from '@/components/auth/OAuthButton';
import { useACSAuth } from '@/contexts/ACSAuthContext';
import { supabase } from '@/lib/supabase/client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void;
}

export const ACSAuthModal: React.FC<Props> = ({ isOpen, onClose, onAuthSuccess }) => {
  const acsAuth = useACSAuth();
  
  // Don't render if auth not bootstrapped or user is already authenticated
  if (!acsAuth.isBootstrapped || acsAuth.isAuthenticated) return null;
  
  console.log('🔐 [ACSAuthModal] Rendering modal:', { isOpen, acsAuth: acsAuth.isAuthenticated });
  
  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback/${provider}`,
      },
    });
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      console.log('🔐 [ACSAuthModal] Dialog state changed:', open);
      if (!open) onClose();
    }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">Sign in to Orchestra</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-4">
          {(['google', 'github'] as const).map((provider) => (
            <OAuthButton
              key={provider}
              provider={provider}
              onSuccess={() => {
                console.log('🎉 [ACSAuthModal] OAuth success for provider:', provider);
                onAuthSuccess?.();
              }}
              onClick={() => handleOAuthLogin(provider)}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ACSAuthModal;