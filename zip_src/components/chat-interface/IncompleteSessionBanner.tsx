/**
 * Banner component that warns users about incomplete session metadata
 * and provides options to fix the session.
 */

import React, { useState } from 'react';
import { AlertTriangle, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { isSessionMetadataComplete, repairSessionMetadata } from '@/utils/buildSessionMetadata';
import { updateChatSession } from '@/services/supabase/chatService';
import { ChatSession } from '@/types/chatTypes';

interface IncompleteSessionBannerProps {
  session: ChatSession;
  onSessionUpdated?: (updatedSession: ChatSession) => void;
  onDismiss?: () => void;
}

export const IncompleteSessionBanner: React.FC<IncompleteSessionBannerProps> = ({
  session,
  onSessionUpdated,
  onDismiss
}) => {
  const [isFixing, setIsFixing] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if the session metadata is incomplete
  const isIncomplete = !isSessionMetadataComplete(session.metadata);

  // Don't render if session is complete or banner is dismissed
  if (!isIncomplete || isDismissed) {
    return null;
  }

  const handleFixSession = async () => {
    try {
      setIsFixing(true);
      
      // Repair the metadata
      const repairedMetadata = repairSessionMetadata(session.metadata);
      
      // Update the session with complete metadata
      const updatedSession = await updateChatSession(session.id, {
        specialty: repairedMetadata.specialty,
        model: repairedMetadata.model,
        tools: repairedMetadata.tools,
        systemPrompt: repairedMetadata.system_prompt,
        temperature: repairedMetadata.temperature,
        avatar: repairedMetadata.avatar
      });
      
      console.log('[IncompleteSessionBanner] Fixed session metadata:', {
        sessionId: session.id,
        repairedFields: Object.keys(repairedMetadata)
      });
      
      // Notify parent component
      if (onSessionUpdated) {
        onSessionUpdated(updatedSession);
      }
      
      // Auto-dismiss after successful fix
      setIsDismissed(true);
    } catch (error) {
      console.error('[IncompleteSessionBanner] Error fixing session:', error);
      // Could show an error toast here
    } finally {
      setIsFixing(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) {
      onDismiss();
    }
  };

  const getMissingFields = () => {
    if (!session.metadata || typeof session.metadata !== 'object') {
      return ['all metadata'];
    }

    const requiredFields = ['model', 'tools', 'specialty', 'avatar', 'system_prompt', 'temperature'];
    const missing: string[] = [];

    requiredFields.forEach(field => {
      const value = session.metadata[field];
      
      switch (field) {
        case 'model':
        case 'specialty':
        case 'avatar':
        case 'system_prompt':
          if (!value || typeof value !== 'string' || value.length === 0) {
            missing.push(field);
          }
          break;
        case 'tools':
          if (!Array.isArray(value)) {
            missing.push(field);
          }
          break;
        case 'temperature':
          if (typeof value !== 'number' || value < 0 || value > 2) {
            missing.push(field);
          }
          break;
      }
    });

    return missing;
  };

  const missingFields = getMissingFields();

  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <p className="font-medium text-amber-800 dark:text-amber-200">
            Incomplete Session Configuration
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            This session is missing: {missingFields.join(', ')}. 
            This may cause issues with AI responses.
          </p>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFixSession}
            disabled={isFixing}
            className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:hover:bg-amber-900"
          >
            {isFixing ? (
              <>
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                Fixing...
              </>
            ) : (
              'Fix Session'
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-400 dark:hover:text-amber-200 dark:hover:bg-amber-900"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};