// Secure Authentication Modal
// Enterprise-grade authentication UI with OAuth integration

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, User, Mail, Lock, Shield } from "lucide-react";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";
import { GoogleLoginButton } from "@/auth/GoogleLoginButton";
import { GitHubLoginButton } from "@/auth/GitHubLoginButton";
import { AuthResult } from "@/types/auth/AuthResult";

interface SecureAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecureAuthModal: React.FC<SecureAuthModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user, isAuthenticated, loginEmailPassword, signUpEmailPassword } =
    useAuth();

  const [isOAuthAvailable] = useState<boolean>(true); // start of a feature flag

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);
  const [oauthGglLoading, setOauthGglLoading] = useState<boolean>(false); // is google OAuth loading
  const [oauthGHloading, setoauthGHloading] = useState<boolean>(false); // is GitHubOAuth loading
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");

  // If user is authenticated, show a different dialog with logout option
  if (isAuthenticated) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-600" />
              Account Status
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <User className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-800">
                You are currently signed in as {user?.email}
              </p>
            </div>

            <Button onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result: AuthResult = await loginEmailPassword(email, password);

      if (result.success) {
        toast.success("Successfully logged in!");
        onClose();
      } else {
        setError(result.error || "Login failed");
        toast.error(result.error || "Login failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    // Basic password strength check
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      setError("Password must contain uppercase, lowercase, and numbers");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const result: AuthResult = await signUpEmailPassword(email, password);

      if (result.success) {
        toast.success("Account created successfully!");
        onClose();
      } else {
        setError(result.error || "Registration failed");
        toast.error(result.error || "Registration failed");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Registration failed";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setError(null);
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab as "login" | "register");
    resetForm();
  };

  const isFormLoading = isLoading || oauthGHloading || oauthGglLoading;

  const onGHClick = () => {
    // function that sets the GH OAuth Loading state to true, which disables the google button
    setoauthGHloading(true);
  };

  const onGGLClick = () => {
    setOauthGglLoading(true);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-green-600" />
            Secure Authentication
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <Shield className="w-4 h-4 text-green-600" />
            <p className="text-sm text-green-800">
              Enterprise-grade security with httpOnly cookies and CSRF
              protection
            </p>
          </div>

          {/* OAuth Buttons */}
          {isOAuthAvailable && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2">
                <GoogleLoginButton
                  disabled={oauthGHloading}
                  onClick={onGGLClick}
                />

                <GitHubLoginButton
                  disabled={oauthGglLoading}
                  onClick={onGHClick}
                />
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Email/Password Forms */}
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">
                <>Sign In</>
              </TabsTrigger>
              <TabsTrigger value="register">
                <>Sign Up</>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      disabled={isFormLoading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      disabled={isFormLoading}
                      autoComplete="current-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isFormLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register" className="space-y-4">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Name (Optional)</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="Enter your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      disabled={isFormLoading}
                      autoComplete="name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      disabled={isFormLoading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="Create a strong password (min 8 chars)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      disabled={isFormLoading}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      disabled={isFormLoading}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <div className="text-xs text-gray-600 space-y-1">
                  <p>Password requirements:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>At least 8 characters</li>
                    <li>Contains uppercase and lowercase letters</li>
                    <li>Contains at least one number</li>
                  </ul>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isFormLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Security Notice */}
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>🔒 Your data is protected with enterprise-grade security</p>
            <p>
              Tokens are stored in secure httpOnly cookies with CSRF protection
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SecureAuthModal;
