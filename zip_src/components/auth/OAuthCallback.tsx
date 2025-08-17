// OAuth Callback Handler
// Handles OAuth redirects for web and Tauri environments

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeCurrentSession } from '@/lib/secureAuth/supabaseIntegration';
import { SecureUser } from '@/lib/secureAuth/types';
import { useACSAuth } from '@/contexts/ACSAuthContext';
import { Loader2, CheckCircle, XCircle, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface OAuthCallbackProps {
  onAuthSuccess?: () => void;
}

export const OAuthCallback: React.FC<OAuthCallbackProps> = ({ onAuthSuccess }) => {
  const navigate = useNavigate();
  const { isBootstrapped, session } = useACSAuth();
  
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing OAuth authentication...');
  const [userInfo, setUserInfo] = useState<Partial<SecureUser> & { provider?: string }>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isBootstrapped) return;        // still waiting INITIAL_SESSION

    if (!session?.user) {
      console.error('🚫 [AuthPage] No session after bootstrap');
      setStatus('error');
      return;
    }

    console.log('🎉 [AuthPage] Session ready, exchanging with ACS…');
    exchangeCurrentSession().then((result) => {
      if (result.success) {
        setStatus('success');
        setUserInfo({ ...result.user, provider: session.user.app_metadata?.provider });
        setTimeout(() => navigate('/', { replace:true }), 2000);
      } else {
        // result.error is only available when success is false
        console.error('🛑 exchange failed', result.error);
        setStatus('error');
        setError(result.error);
      }
    });
  }, [isBootstrapped, session, navigate]);
  
  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <Shield className="w-12 h-12 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              OAuth Authentication
            </h1>
            <p className="text-gray-600 mt-2">
              Secure authentication via {provider}
            </p>
          </div>
          
          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            {status === 'processing' && (
              <div className="flex flex-col items-center">
                <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
                <p className="text-sm text-gray-600 mt-2">Processing...</p>
              </div>
            )}
            
            {status === 'success' && (
              <div className="flex flex-col items-center">
                <CheckCircle className="w-16 h-16 text-green-600" />
                <p className="text-sm text-green-600 mt-2">Success!</p>
              </div>
            )}
            
            {status === 'error' && (
              <div className="flex flex-col items-center">
                <XCircle className="w-16 h-16 text-red-600" />
                <p className="text-sm text-red-600 mt-2">Failed</p>
              </div>
            )}
          </div>
          
          {/* Message */}
          <div className="text-center mb-6">
            <p className="text-lg font-medium text-gray-900 mb-2">
              {message}
            </p>
            
            {status === 'processing' && (
              <p className="text-sm text-gray-600">
                Please wait while we verify your authentication...
              </p>
            )}
          </div>
          
          {/* User Info (Success) */}
          {status === 'success' && userInfo && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-3">
                {userInfo.avatar && (
                  <img 
                    src={userInfo.avatar} 
                    alt="Profile" 
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div>
                  <p className="font-medium text-green-900">{userInfo.name}</p>
                  <p className="text-sm text-green-700">{userInfo.email}</p>
                  <p className="text-xs text-green-600">
                    Signed in via {userInfo.provider}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Error Display */}
          {status === 'error' && error && (
            <Alert variant="destructive" className="mb-6">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Actions */}
          <div className="space-y-3">
            {status === 'success' && (
              <>
                <div className="text-center text-sm text-gray-600 mb-4">
                  Redirecting to Orchestra in 2 seconds...
                </div>
                <Button onClick={handleGoHome} className="w-full">
                  Continue to Orchestra
                </Button>
              </>
            )}
            
            {status === 'error' && (
              <>
                <Button onClick={handleRetry} variant="outline" className="w-full">
                  Try Again
                </Button>
                <Button onClick={handleGoHome} className="w-full">
                  Return to Home
                </Button>
              </>
            )}
            
            {status === 'processing' && (
              <Button onClick={handleGoHome} variant="ghost" className="w-full">
                Cancel
              </Button>
            )}
          </div>
          
          {/* Security Notice */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              🔒 Your authentication is secured with enterprise-grade encryption
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;
