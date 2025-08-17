// ACS Authentication Context (Supabase OAuth Version)
   import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
   import { supabase, SupabaseSession, SupabaseUser } from '@/lib/supabaseClient';

   // -----------------------------------------------------------------------------
   // Types
   // -----------------------------------------------------------------------------

   export interface ACSAuthContextType {
     isAuthenticated: boolean;
     user: SupabaseUser | null;
     session: SupabaseSession | null;
     isBootstrapped: boolean;         // new flag – first auth event received
     /** Either authenticated user ID or anonymous fallback */
     userId: string;
     // Modal state (UI)
     showAuthModal: boolean;
     setShowAuthModal: (show: boolean) => void;
   }

   const ACSAuthContext = createContext<ACSAuthContextType | undefined>(undefined);

   // -----------------------------------------------------------------------------
   // Helper – fallback anonymous ID (persisted in localStorage)
   // -----------------------------------------------------------------------------

   function getOrSetAnonymousUserId(): string {
     const key = 'orchestra_anonymous_user_id';
     const existing = localStorage.getItem(key);
     if (existing) return existing;
     const id = `anon_${crypto.randomUUID()}`;
     localStorage.setItem(key, id);
     return id;
   }

   // -----------------------------------------------------------------------------
   // Provider
   // -----------------------------------------------------------------------------

   export const ACSAuthProvider = ({ children }: { children: ReactNode }) => {
     const [session, setSession] = useState<SupabaseSession | null>(null);
     const [user, setUser] = useState<SupabaseUser | null>(null);
     const [booted, setBooted] = useState(false);
     const [showAuthModal, setShowAuthModal] = useState(false);

     // Initialise on mount
     useEffect(() => {
       const { data: sub } = supabase.auth.onAuthStateChange((evt, newSess) => {
         console.log('🔔 AuthEvent', evt);
         if (evt === 'INITIAL_SESSION' || evt === 'SIGNED_IN' || evt === 'TOKEN_REFRESHED') {
           setSession(newSess);
           setUser(newSess?.user ?? null);
         }
         if (!booted) setBooted(true);
       });
       return () => sub.subscription.unsubscribe();
     }, [booted]);

     const contextValue: ACSAuthContextType = {
       isAuthenticated: !!user,
       user,
       session,
       isBootstrapped: booted,
       userId: user?.id ?? getOrSetAnonymousUserId(),
       showAuthModal,
       setShowAuthModal,
     };

     return <ACSAuthContext.Provider value={contextValue}>{children}</ACSAuthContext.Provider>;
   };

   // -----------------------------------------------------------------------------
   // Hook
   // -----------------------------------------------------------------------------

   export const useACSAuth = () => {
     const ctx = useContext(ACSAuthContext);
     if (!ctx) throw new Error('useACSAuth must be used within ACSAuthProvider');
     return ctx;
   };

   export default ACSAuthContext;