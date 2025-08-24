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
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SecureAuthModal;
