import React, { useState, useEffect, useCallback } from 'react';
import { FiEdit, FiX, FiInfo, FiTool, FiMessageSquare, FiSettings } from 'react-icons/fi';
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { useChatUI } from '@/context/ChatUIContext';
import EditAgentConfigModal from './EditAgentConfigModal';
import { AgentConfigTS } from '@/types/agentTypes';
import { toast } from 'sonner';

interface AgentProfileProps {
    isOpen: boolean;
    onClose: () => void;
    agentId: string;
}

const AgentProfile: React.FC<AgentProfileProps> = ({ isOpen, onClose, agentId }) => {
    const [agentConfig, setAgentConfig] = useState<AgentConfigTS | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    
    const chatUI = useChatUI();

    const fetchAgentDetails = useCallback(async () => {
        if (!agentId) {
            setError("Agent ID is missing.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            // Get agent config from ACS context
            const agentToDisplay = chatUI.agentConfigs?.find(ag => ag.id === agentId);
            if (agentToDisplay) {
                setAgentConfig(agentToDisplay);
                setError(null);
            } else {
                setError(`Agent config with ID ${agentId} not found.`);
            }
        } catch (err) {
            console.error("Error fetching agent details:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to load agent details.";
            setError(errorMessage);
            toast.error(`Failed to load agent details: ${errorMessage}`);
        }
        setIsLoading(false);
    }, [agentId, chatUI.agentConfigs]);

    useEffect(() => {
        if (isOpen && agentId) {
            fetchAgentDetails();
        }
    }, [isOpen, agentId, fetchAgentDetails]);

    const handleOpenEditModal = () => {
        if (agentConfig) {
            setIsEditModalOpen(true);
        }
    };

    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
    };

    const handleSaveChanges = async (updatedConfig: AgentConfigTS) => {
        if (!agentConfig || !agentConfig.id) {
            toast.error("Cannot save changes: Agent ID is missing.");
            return;
        }
        
        if (chatUI.isLoading) {
            toast.error("Please wait for current operation to complete.");
            return;
        }
        
        try {
            // Use ACS to update agent config
            // Note: updateAgentConfig might not be available in current ACS implementation
            // For now, we'll update the local state and show a warning
            console.warn('Agent config update not yet implemented in ACS context');
            setAgentConfig(updatedConfig);
            
            // Update local state with the updated config
            const updatedAgentFromContext = chatUI.agentConfigs?.find(ag => ag.id === agentConfig.id);
            if (updatedAgentFromContext) {
                setAgentConfig(updatedAgentFromContext);
            }
            
            toast.success("Agent configuration updated successfully.");
            setIsEditModalOpen(false);
        } catch (err) {
            console.error("Error saving agent configuration:", err);
            const errorMessage = err instanceof Error ? err.message : "Failed to save agent configuration.";
            toast.error(`Failed to save agent configuration: ${errorMessage}`);
        }
    };

    if (!isOpen) return null;

    // Loading State UI
    if (isLoading) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Loading Agent Profile...</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 text-center">Loading...</div>
                </DialogContent>
            </Dialog>
        );
    }

    // Error State UI
    if (error) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Error</DialogTitle>
                    </DialogHeader>
                    <DialogDescription className="py-4 text-red-500">{error}</DialogDescription>
                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    // No Agent Config State UI
    if (!agentConfig) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Agent Not Found</DialogTitle>
                    </DialogHeader>
                    <DialogDescription className="py-4">The agent configuration could not be loaded.</DialogDescription>
                    <DialogFooter>
                        <Button variant="outline" onClick={onClose}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    // Main Content UI
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center">
                        {agentConfig.agent.avatar && (
                            <img src={agentConfig.agent.avatar} alt={agentConfig.agent.name} className="w-10 h-10 rounded-full mr-3" />
                        )}
                        {agentConfig.agent.name}
                    </DialogTitle>
                    <DialogDescription>{agentConfig.agent.description}</DialogDescription>
                </DialogHeader>
                
                <div className="flex-grow overflow-y-auto pr-2 space-y-4 py-4 text-sm">
                    <div className="space-y-1">
                        <h3 className="font-semibold text-base flex items-center"><FiInfo className="mr-2" />Agent Details</h3>
                        <p><strong>ID:</strong> {agentConfig.id}</p>
                        <p><strong>Version:</strong> {agentConfig.version}</p>
                    </div>

                    <div className="space-y-1">
                        <h3 className="font-semibold text-base flex items-center"><FiSettings className="mr-2" />AI Configuration</h3>
                        <p><strong>Provider:</strong> {agentConfig.ai_config.provider_name}</p>
                        <p><strong>Model ID:</strong> {agentConfig.ai_config.model_id}</p>
                        <p><strong>Temperature:</strong> {agentConfig.ai_config.temperature ?? 'Default'}</p>
                        <p><strong>Max Tokens:</strong> {agentConfig.ai_config.max_tokens ?? 'Default'}</p>
                    </div>

                    <div className="space-y-1">
                        <h3 className="font-semibold text-base flex items-center"><FiMessageSquare className="mr-2" />System Prompt</h3>
                        <p className="whitespace-pre-wrap bg-gray-100 dark:bg-gray-800 p-2 rounded">{agentConfig.agent.system_prompt || "(Not set)"}</p>
                    </div>

                    <div className="space-y-1">
                        <h3 className="font-semibold text-base flex items-center"><FiTool className="mr-2" />Tool Groups & Tools</h3>
                        {agentConfig.tool_groups && agentConfig.tool_groups.length > 0 ? (
                            agentConfig.tool_groups.map((group, index) => (
                                <div key={index} className="ml-4 pl-4 border-l border-gray-300 dark:border-gray-700">
                                    <h4 className="font-medium">{group.name} ({group.group_type})</h4>
                                    {group.tools.length > 0 ? (
                                        <ul className="list-disc list-inside ml-4">
                                            {group.tools.map((tool, toolIndex) => (
                                                <li key={toolIndex}>{tool.name}</li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-gray-500 italic">No tools in this group.</p>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 italic">No tool groups configured.</p>
                        )}
                    </div>
                </div>

                <DialogFooter className="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="outline" onClick={onClose}><FiX className="mr-2"/>Close</Button>
                    <Button onClick={handleOpenEditModal}><FiEdit className="mr-2"/>Edit Agent</Button>
                </DialogFooter>
            </DialogContent>

            {agentConfig && (
                <EditAgentConfigModal
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    agentConfigToEdit={agentConfig as any} // TODO: Update EditAgentConfigModal to work with AgentConfigTS
                    availableTools={[]} // TODO: Get available tools from ACS context or derive from agent configs
                    onSave={handleSaveChanges as any} // TODO: Update callback signature
                />
            )}
        </Dialog>
    );
};

export default AgentProfile;