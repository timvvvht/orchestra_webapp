import React from "react";
import { useChatUI } from "@/context/ChatUIContext";
import { useParams } from "react-router-dom";

/**
 * Debug component to help diagnose session details loading issues
 * Add this temporarily to your ChatHeader or main chat component
 */
export const SessionDetailsDebug: React.FC = () => {
  const chatUI = useChatUI();
  const { sessionId: urlSessionId } = useParams<{ sessionId?: string }>();

  return null;
  // return (
  //   <div className="fixed top-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs font-mono z-[9999] max-w-md">
  //     <h3 className="text-yellow-400 font-bold mb-2">🐛 Session Details Debug</h3>

  //     <div className="space-y-1">
  //       <div><strong>URL Session ID:</strong> {urlSessionId || 'undefined'}</div>
  //       <div><strong>Current Session ID:</strong> {chatUI.currentSessionId || 'undefined'}</div>
  //       <div><strong>Is Authenticated:</strong> {chatUI.isAuthenticated ? '✅' : '❌'}</div>
  //       <div><strong>Is Initialized:</strong> {chatUI.isInitialized ? '✅' : '❌'}</div>
  //       <div><strong>Is Loading:</strong> {chatUI.isLoading ? '⏳' : '✅'}</div>
  //       <div><strong>Has Error:</strong> {chatUI.error ? '❌' : '✅'}</div>
  //       {chatUI.error && <div className="text-red-400">Error: {chatUI.error}</div>}

  //       <div className="border-t border-white/20 pt-2 mt-2">
  //         <strong>Current Session Data:</strong>
  //         {chatUI.currentSession ? (
  //           <div className="ml-2 space-y-1">
  //             <div>Name: {chatUI.currentSession.name || 'undefined'}</div>
  //             <div>Agent CWD: {chatUI.currentSession.agent_cwd || 'undefined'}</div>
  //             <div>Agent Config ID: {chatUI.currentSession.agent_config_id || 'undefined'}</div>
  //             <div>Messages: {chatUI.currentSession.messages?.length || 0}</div>
  //           </div>
  //         ) : (
  //           <div className="text-red-400 ml-2">No session data</div>
  //         )}
  //       </div>

  //       <div className="border-t border-white/20 pt-2 mt-2">
  //         <strong>Sessions List:</strong> {chatUI.sessions?.length || 0} sessions
  //       </div>

  //       <div className="border-t border-white/20 pt-2 mt-2">
  //         <strong>User:</strong> {chatUI.user?.email || 'Not logged in'}
  //       </div>

  //       <div className="border-t border-white/20 pt-2 mt-2">
  //         <button
  //           onClick={async () => {
  //             console.log('🧪 [TEST] Manual refresh triggered');
  //             try {
  //               await chatUI.refresh();
  //               console.log('✅ [TEST] Manual refresh completed');
  //             } catch (error) {
  //               console.error('❌ [TEST] Manual refresh failed:', error);
  //             }
  //           }}
  //           className="w-full px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded text-xs text-blue-300 transition-colors"
  //         >
  //           🧪 Manual Refresh (Test loadSessionDetails)
  //         </button>
  //       </div>
  //     </div>
  //   </div>
  // );
};

export default SessionDetailsDebug;
