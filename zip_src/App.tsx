import { BrowserRouter as Router, Routes, Route, Link, Navigate, useParams } from "react-router-dom";
import { KeyboardShortcutsProvider } from "./hooks/useKeyboardShortcuts";
import KeyboardShortcutsManager from "./components/KeyboardShortcutsManager";
import SearchIntegration from "./components/SearchIntegration";
import { GlobalPerformanceOverlay } from "./components/debug/PerformanceMonitor";
import QuickPerformanceMonitor from "./components/debug/QuickPerformanceMonitor";
import { UserSSEDebugOverlay } from "./components/debug/UserSSEDebugOverlay";
import { GlobalServiceMonitor } from "./components/debug/GlobalServiceMonitor";
import { ServiceStatusIndicator } from "./components/ServiceStatusIndicator";
import SSEEventTooltipOverlay from "./components/debug/SSEEventTooltipOverlay";
import MainLayout from "@/components/MainLayout/MainLayout";
import RootLayout from "@/components/MainLayout/RootLayout";
import { initializeAutoUpdater } from "@/utils/updater";
import SSEDebug from "@/pages/SSEDebug";
import { AppInfrastructureProvider } from "@/providers";

// Import base theme CSS globally
import "@/styles/theme/base-theme.css";

import React, { useEffect, useState, lazy, Suspense } from "react";
import { isOnboardingCompleted } from "@/utils/userPreferences";
import { useSettingsStore } from '@/stores/settingsStore';
// Note: Legacy chat store removed - Orchestra now uses ACS system only
import { useAgentConfigStore } from '@/stores/agentConfigStore'; // Adjust path as needed
// Import the HomePage component
// Note: getOrSetAnonymousUserId removed - Orchestra now requires Google auth via Supabase
import { AuthProvider } from '@/auth/AuthContext'; // NEW PHOENIX AUTH PROVIDER
import { AuthModalEnhanced } from '@/components/AuthModalEnhanced'; // ENHANCED AUTH MODAL
import { DebugConsole } from '@/components/DebugConsole'; // DEBUG CONSOLE LOGS
import { DeepLinkDebugOverlay } from '@/components/DeepLinkDebugOverlay'; // DEEP LINK DEBUG OVERLAY
import { AgentConfigProvider } from '@/context/AgentConfigContext'; // UNIFIED AGENT CONFIG PROVIDER
import { ChatUIProvider } from '@/context/ChatUIContext'; // CHAT UI PROVIDER
import { SelectionProvider } from '@/context/SelectionContext'; // SELECTION PROVIDER
import ErrorBoundary from '@/components/ErrorBoundary';

// Lazy load heavy components for better initial load performance
const ChatRoute = lazy(() => import("@/routes/ChatRoute"));
const VaultPageComponent = lazy(() => import("./pages/VaultPage"));
const HomePageComponent = lazy(() => import("./pages/Home"));
const ExtensionSystemTestPage = lazy(() => import("./pages/ExtensionSystemTestPage"));
const InboxPage = lazy(() => import("@/components/inbox/InboxPage"));
const MissionsPage = lazy(() => import("@/components/missions/MissionsPage"));
const ResourceTestPage = lazy(() => import("./pages/ResourceTestPage"));
const ThemeSettings = lazy(() => import("./pages/ThemeSettings"));
const LandingPageWrapper = lazy(() => import("./pages/LandingPage"));
const LandingExperimental = lazy(() => import("./pages/LandingExperimental"));
const DesignSystemDemo = lazy(() => import("./pages/DesignSystemDemo"));
// const OnboardingElegant = lazy(() => import("@/components/OnboardingElegant"));
const OnboardingSimple = lazy(() => import("@/components/OnboardingSimple"));
const AgentConfigsPage = lazy(() => import('./pages/AgentConfigsPage'));
const TestChatSidebar = lazy(() => import('../test-components/TestChatSidebar'));

const DebugBYOKPage = lazy(() => import('./pages/DebugBYOK'));
const TestCodeBlocks = lazy(() => import('./pages/TestCodeBlocks'));
const AgentStorePage = lazy(() => import('./pages/AgentStorePage'));
// const TestInkStyleEditor = lazy(() => import('./pages/TestInkStyleEditor'));
const AuthCallbackPage = lazy(() => import('@/pages/AuthCallback'));
const SSEDebugTest = lazy(() => import('./pages/SSEDebugTest'));
const ChatMainDebug = lazy(() => import('./routes/ChatMainDebug'));
const SimpleChatDebug = lazy(() => import('./routes/SimpleChatDebug'));
const ChatDebugRefined = lazy(() => import('./routes/ChatDebugRefined'));
const SSEMockDebugPage = lazy(() => import('./pages/SSEMockDebugPage'));
const DebugIndex = lazy(() => import('./pages/DebugIndex'));
const ScmDebugPage = lazy(() => import('./pages/ScmDebugPage'));
const UserSSEPanel = lazy(() => import('./components/debug/UserSSEPanel'));
const UserSSETestPanel = lazy(() => import('./components/debug/UserSSETestPanel'));
const UserSSETestPanelWorkaround = lazy(() => import('./components/debug/UserSSETestPanelWorkaround'));
const EventsPlaygroundRoute = lazy(() => import('./routes/playground/EventsPlaygroundRoute'));
const AutoResizeTest = lazy(() => import('./components/test/AutoResizeTest'));
const ToolApprovalTest = lazy(() => import('./pages/ToolApprovalTest'));
const RealToolApprovalTest = lazy(() => import('./pages/RealToolApprovalTest'));
const PreferenceIntegrationTest = lazy(() => import('./pages/PreferenceIntegrationTest'));
// const MissionControl = lazy(() => import('./components/MissionControlSplitScreen.bak'));
const MissionControlV2 = lazy(() => import('./components/mission-control-v2/MissionControlV2'));
const ChatMainCanonicalLegacyTest = lazy(() => import('./components/debug/ChatMainCanonicalLegacyTest'));
const PlansPage = lazy(() => import('./pages/PlansPage'));
const McpPlayground = lazy(() => import('./components/mcp/McpPlayground'));
const AnimationsPage = lazy(() => import('./app/animations/page'));
const TestMermaidPage = lazy(() => import('./pages/TestMermaidPage'));
const ToolSchemaPage = lazy(() => import('./pages/ToolSchemaPage'));
const GitLogPage = lazy(() => import('./pages/GitLogPage'));

// Loading component for lazy-loaded routes
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-black">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      <p className="text-white/60 text-sm">Loading...</p>
    </div>
  </div>
);

// Import the Theme Provider
import { ThemeProvider } from "@/components/theme/theme-provider";

// Import the Toast Provider
import { ToastProvider } from "@/components/ui/toast";

// Home page component wrapper
function HomePage() {
  const UserFirehoseTestPanel = lazy(() => import('./components/debug/UserFirehoseTestPanel'));
  return (
    <Suspense fallback={<PageLoader />}>
      <HomePageComponent />
    </Suspense>
  );
}


// Vault page component
function VaultPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <VaultPageComponent />
    </Suspense>
  );
}

// Settings page component
function SettingsPage() {
  // Import the SimpleSettings component instead of the full Settings component
  const SimpleSettings = React.lazy(() => import('./pages/SimpleSettings'));

  return (
    <div className="p-0">
      <React.Suspense fallback={<PageLoader />}>
        <SimpleSettings />
      </React.Suspense>
    </div>
  );
}

// Unified Chat interface page component (ACS-based with migration support)
function WhatsAppPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ChatRoute />
    </Suspense>
  );
}

// Redirect component for legacy ACS chat routes
function RedirectToChat() {
  const { sessionId } = useParams<{ sessionId: string }>();
  return <Navigate to={`/chat/${sessionId}`} replace />;
}

// Inbox page component
function InboxPageWrapper() {
  return <InboxPage />;
}

// Missions page component
function MissionsPageWrapper() {
  return <MissionsPage />;
}

// Extension System Test page component
function ExtensionSystemTestPageWrapper() {
  return <ExtensionSystemTestPage />;
}

// Resource Test page component
function ResourceTestPageWrapper() {
  return <ResourceTestPage />;
}

function App() {
  const [showVaultSetupModal, setShowVaultSetupModal] = useState(false);
  const [isDebugConsoleOpen, setIsDebugConsoleOpen] = useState(false);
  const vaultPath = useSettingsStore((state) => state.settings.vault.path);
  const areSettingsLoading = useSettingsStore((state) => state.isLoading);
  const initSettings = useSettingsStore((state) => state.initSettings); // Ensure initSettings is available
  // Show onboarding modal if onboarding has not been completed yet
  const [showOnboardingModal, setShowOnboardingModal] = useState(!isOnboardingCompleted());

  // Effect to initialize settings and then check for vault path
  useEffect(() => {
    const checkVaultPath = async () => {
      console.log("[App.tsx] Initializing settings for vault path check...");
      await initSettings(); // Make sure settings are loaded first
      // After settings are loaded (isLoading will become false), check the vault path
    };
    checkVaultPath();
  }, [initSettings]);

  // Initialize auto-updater on app startup
  useEffect(() => {
    console.log("[App.tsx] Initializing auto-updater...");
    initializeAutoUpdater();
  }, []);

  // Note: LocalToolOrchestrator initialization moved to AppInfrastructureProvider
  // to run synchronously before React children render, preventing timing issues


  // Effect to decide whether to show VaultSetupModal OR OnboardingModal after settings are loaded
  useEffect(() => {
    if (!areSettingsLoading) {
      const onboardingCompleted = isOnboardingCompleted();
      const currentVaultPath = useSettingsStore.getState().settings.vault.path; // Get latest vault path
      console.log("[App.tsx] Settings loading complete. Onboarding completed flag:", onboardingCompleted, "Current vault path:", currentVaultPath);

      // Skip modal logic if onboarding is currently in progress
      // This prevents the effect from reacting to vault path changes during onboarding
      if (showOnboardingModal) {
        console.log("[App.tsx] Onboarding in progress, skipping modal logic");
        return;
      }

      // Only show modals on initial load, not when settings change during onboarding
      // This prevents the VaultSetupModal from appearing after onboarding completes
      // const isInitialLoad = !onboardingCompleted;

      // if (isInitialLoad) {
      //   // First time loading and onboarding not completed - show onboarding
      //   console.log("[App.tsx] Initial load with onboarding not completed. Showing OnboardingModal.");
      //   // setShowOnboardingModal(true); // ONBOARDING DISABLED
      //   setShowVaultSetupModal(false);
      // } else if (onboardingCompleted && !currentVaultPath && !showVaultSetupModal) {
      //   // Onboarding was marked complete, but there's no vault path (e.g. localStorage cleared)
      //   // Only show VaultSetupModal if it's not already showing (prevents flashing)
      //   console.warn("[App.tsx] Onboarding completed but no vault path. Showing VaultSetupModal as fallback.");
      //   setShowVaultSetupModal(true);
      //   setShowOnboardingModal(false);
      // } else if (currentVaultPath) {
      //   // If vault path exists, ensure no modals are shown
      //   console.log("[App.tsx] Vault path exists. No modals needed.");
      //   setShowOnboardingModal(false);
      //   setShowVaultSetupModal(false);
      // }
    }
    // Remove vaultPath from dependencies to prevent re-renders during onboarding
    // The effect will still run when areSettingsLoading changes after initial load
  }, [areSettingsLoading, initSettings, showOnboardingModal, showVaultSetupModal]);

  // Note: Anonymous user ID system removed - Orchestra now requires Google auth via Supabase

  // Agent Config Store Initialization Hook
  const { fetchAgentConfigs, fetchAvailableTools, agentConfigs, availableTools } = useAgentConfigStore();

  useEffect(() => {
    console.log("App useEffect: Fetching initial agent configs and available tools...");
    fetchAgentConfigs();
    fetchAvailableTools();
  }, [fetchAgentConfigs, fetchAvailableTools]);

  // useEffect(() => {

  //   // Log when data is loaded
  //   if (Object.keys(agentConfigs).length > 0) {
  //       console.log("Agent Configs loaded in store:", agentConfigs);
  //   }
  //   if (availableTools.length > 0) {
  //       console.log("Available Tools loaded in store:", availableTools);
  //   }
  // }, [agentConfigs, availableTools]);

  // Note: Legacy chat store initialization removed - Orchestra uses ACS system only

  const handleOnboardingComplete = () => {
    console.log("[App.tsx] Onboarding complete. Hiding modal and navigating.");

    // Get the current vault path
    const currentVaultPath = useSettingsStore.getState().settings.vault.path;

    if (currentVaultPath) {
      // If vault path is set, navigate to the landing page
      console.log("[App.tsx] Vault path is set. Navigating to landing page.");

      // First hide the modal to prevent flash
      setShowOnboardingModal(false);

      // // Use a small timeout to ensure the modal is fully hidden before navigation
      // setTimeout(() => {
      //   window.location.href = '/landing';
      // }, 100);
    } else {
      // If vault path is not set (which shouldn't happen), show a warning
      console.warn("[App.tsx] Vault path not set after onboarding. This shouldn't happen.");

      // Hide onboarding modal first
      setShowOnboardingModal(false);

      // Small delay before showing the vault setup modal
      setTimeout(() => {
        // Fallback to showing the vault setup modal
        setShowVaultSetupModal(true);
      }, 100);
    }
  };

  // Function to handle file selection from search
  const handleFileSelect = (path: string) => {
    console.log('ud83dudd0d App: Selected file from search:', path);

    // Navigate to the vault page and open the selected file
    // First, store the file path in localStorage to be picked up by VaultPage
    localStorage.setItem('selectedFilePath', path);
    console.log('ud83dudd0d App: Stored file path in localStorage:', path);

    // Then navigate to the vault page
    // Using React Router's navigate would be better, but for simplicity we'll use window.location
    console.log('ud83dudd0d App: Navigating to /vault');
    window.location.href = '/vault';
  };

  return (
    <ErrorBoundary>
      <AppInfrastructureProvider>
        <KeyboardShortcutsProvider>
          <ThemeProvider>
            <ToastProvider>
              <AuthProvider>

                {/* {showOnboardingModal && (
          <Suspense fallback={<PageLoader />}>
            <OnboardingSimple onComplete={handleOnboardingComplete} />
          </Suspense>
        )} */}

                {/* Performance monitoring overlay */}
                <GlobalPerformanceOverlay />
                {/* {import.meta.env.DEV && <QuickPerformanceMonitor />} */}

                {/* SSE Event Tooltip Overlay for debugging */}
                {/* {import.meta.env.DEV && <SSEEventTooltipOverlay />} */}

                {/* User-specific SSE debug overlay */}
                {/* {import.meta.env.DEV && <UserSSEDebugOverlay />} */}

                {/* Global Auth Modal - Enhanced Version */}
                <AuthModalEnhanced />

                {/* Debug Console - shows runtime logs (keyboard shortcut only) */}
                <DebugConsole onToggle={setIsDebugConsoleOpen} />

                {/* Deep Link Debug Overlay - shows deep link events in real time */}
                {/* <DeepLinkDebugOverlay /> */}
                <Router>
                  {/* KeyboardShortcutsManager must be inside Router context */}
                  <KeyboardShortcutsManager />
                  {/* SearchIntegration for global search functionality */}
                  <SearchIntegration onFileSelect={handleFileSelect} />

                  <Suspense fallback={<PageLoader />}>
                    {/* Unified ChatUIProvider and SelectionProvider for all routes */}
                    <ChatUIProvider>
                      <SelectionProvider persistToStorage={true}>
                        <Routes>
                          {/* RootLayout wraps ALL routes to ensure AppHeader is always present */}
                          <Route path="/" element={<RootLayout />}>
                            {/* Routes that need agent configs wrapped with AgentConfigProvider */}
                            <Route index element={
                              <MainLayout title="Orchestra">
                                <AgentConfigProvider cacheDuration={5 * 60 * 1000}>
                                  <MissionControlV2 />
                                </AgentConfigProvider>
                              </MainLayout>
                            } />
                            <Route path="landing" element={
                              <AgentConfigProvider cacheDuration={5 * 60 * 1000}>
                                <LandingPageWrapper />
                              </AgentConfigProvider>
                            } />
                            <Route path="chat/:sessionId" element={
                              <MainLayout title="Orchestra">
                                <AgentConfigProvider cacheDuration={5 * 60 * 1000}>
                                  <ChatRoute />
                                </AgentConfigProvider>
                              </MainLayout>
                            } />
                            <Route path="chat" element={
                              <MainLayout title="Orchestra">
                                <AgentConfigProvider cacheDuration={5 * 60 * 1000}>
                                  <ChatRoute />
                                </AgentConfigProvider>
                              </MainLayout>
                            } />

                            {/* Routes that don't need agent configs */}
                            {/* <Route path="landing-experimental" element={<LandingExperimental />} /> */}
                            {/* <Route path="design-system-demo" element={<DesignSystemDemo />} /> */}
                            {/* <Route path="dashboard" element={<HomePage />} /> */}
                            {/* <Route path="inbox" element={<InboxPage />} /> */}
                            {/* <Route path="missions" element={<MissionsPage />} /> */}
                            <Route path="vault" element={
                              <MainLayout title="Orchestra">
                                <VaultPage />
                              </MainLayout>
                            } />
                            <Route path="settings" element={
                              <MainLayout title="Orchestra">
                                <SettingsPage />
                              </MainLayout>
                            } />
                            {/* <Route path="mission-control" element={
                            <MainLayout title="Orchestra">
                              <AgentConfigProvider cacheDuration={5 * 60 * 1000}>
                                <MissionControl />
                              </AgentConfigProvider>
                            </MainLayout>
                          } /> */}
                            <Route path="mission-control-v2" element={
                              <MainLayout title="Orchestra">
                                <AgentConfigProvider cacheDuration={5 * 60 * 1000}>
                                  <MissionControlV2 />
                                </AgentConfigProvider>
                              </MainLayout>
                            } />
                            <Route path="plans" element={
                              <MainLayout title="Plans">
                                <PlansPage />
                              </MainLayout>
                            } />
                            <Route path="mcp-playground" element={
                              <MainLayout title="MCP Playground">
                                <McpPlayground />
                              </MainLayout>
                            } />
                            <Route path="animations" element={
                              <MainLayout title="Animations">
                                <AnimationsPage />
                              </MainLayout>
                            } />
                            <Route path="test-mermaid" element={<TestMermaidPage />} />
                            <Route path="demo/mermaid" element={<TestMermaidPage />} />
                            <Route path="tools-schema" element={<ToolSchemaPage />} />
                            <Route path="git-log" element={
                              <MainLayout title="Git Log">
                                <GitLogPage />
                              </MainLayout>
                            } />

                            {/* Legacy ACS routes redirect to unified routes */}
                            {/* <Route path="chat-acs/:sessionId" element={<RedirectToChat />} /> */}
                            {/* <Route path="whatsapp-acs" element={<Navigate to="/whatsapp" replace />} /> */}
                            {/* Supabase OAuth Callback Route */}
                            <Route path="auth/callback" element={<AuthCallbackPage />} />

                            {/* Component Testing Routes */}
                            <Route path="playground/events" element={<EventsPlaygroundRoute />} />
                            <Route path="auto-resize-test" element={<AutoResizeTest />} />
                            <Route path="tool-approval-test" element={<ToolApprovalTest />} />
                            <Route path="real-tool-approval-test" element={<RealToolApprovalTest />} />
                            <Route path="preference-integration-test" element={<PreferenceIntegrationTest />} />
                            <Route path="chat-main-canonical-legacy-test" element={
                              <MainLayout title="Orchestra">
                                <AgentConfigProvider cacheDuration={5 * 60 * 1000}>
                                  <ChatMainCanonicalLegacyTest />
                                </AgentConfigProvider>
                              </MainLayout>
                            } />
                            <Route path="test-chat-sidebar" element={<TestChatSidebar />} />


                            <Route path="extension-test" element={<ExtensionSystemTestPage />} />
                            <Route path="resource-test" element={<ResourceTestPage />} />
                            <Route path="theme" element={<ThemeSettings />} />
                            <Route path="agent-store" element={<AgentStorePage />} />
                            <Route path="agent-configs" element={<AgentConfigsPage />} />
                            <Route path="debug" element={<DebugBYOKPage />} />
                            <Route path="debug/scm" element={
                              <MainLayout title="SCM Debug">
                                <ScmDebugPage />
                              </MainLayout>
                            } />
                            <Route path="chat-debug" element={<SimpleChatDebug />} />
                            <Route path="chat-debug-refined" element={<ChatDebugRefined />} />
                            <Route path="chat-debug-full" element={<ChatMainDebug />} />
                            <Route path="sse-mock-debug" element={<SSEMockDebugPage />} />
                            <Route path="debug/user-stream" element={<UserSSEPanel />} />
                            {/* <Route path="ink-editor-test" element={<TestInkStyleEditor />} /> */}
                            <Route path="dev/native-tools" element={
                              <MainLayout title="Native Tools">
                                <NativeToolConsole />
                              </MainLayout>
                            } />
                          </Route>
                        </Routes>
                      </SelectionProvider>
                    </ChatUIProvider>
                  </Suspense>
                </Router>
              </AuthProvider>
            </ToastProvider>
          </ThemeProvider>
        </KeyboardShortcutsProvider>
      </AppInfrastructureProvider>
    </ErrorBoundary>
  );
}

// TEMP: TauriDebugOverlay for direct Tauri bridge test
import TauriDebugOverlay from '@/components/settings/TauriDebugOverlay';
import NativeToolConsole from "./pages/NativeToolConsole";

const ShowDebugOverlay = import.meta.env.DEV || true;

export default function AppWithDebugOverlayWrapper(props: any) {
  return <>
    {/* {ShowDebugOverlay && <TauriDebugOverlay />} */}
    <App {...props} />

    {/* Global Service Monitoring - Always Active */}
    {/* <ServiceStatusIndicator position="top-right" size="small" /> */}
    {/* {ShowDebugOverlay && <GlobalServiceMonitor isVisible={true} />} */}
  </>;
}
