// /Users/tim/Code/orchestra/src/pages/AgentConfigsPage.tsx
import React, { useEffect, useState, useMemo } from 'react';
import { useAgentConfigStore } from '@/stores/agentConfigStore';
import type { AgentConfigTS, AvailableToolDefinitionTS } from '@/types/agentConfig';
import AgentConfigForm from '@/components/agent-config/AgentConfigForm';
import { 
    Sparkles, 
    Plus, 
    Search, 
    Edit3, 
    Trash2, 
    Bot, 
    Cpu, 
    Package,
    ChevronRight,
    Zap,
    Brain,
    Code2,
    Database,
    Globe,
    Terminal,
    FileCode,
    Wrench
} from 'lucide-react';

const AgentConfigsPage: React.FC = () => {
    const {
        agentConfigs, 
        fetchAgentConfigs, 
        availableTools,
        fetchAvailableTools,
        isLoading, 
        error,
        clearCurrentEditingConfig
    } = useAgentConfigStore();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [showForm, setShowForm] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedToolGroup, setSelectedToolGroup] = useState<string | null>(null);

    useEffect(() => {
        if (!showForm) {
            fetchAgentConfigs();
            fetchAvailableTools();
        }
    }, [fetchAgentConfigs, fetchAvailableTools, showForm]);

    const handleEdit = (configId: string) => {
        setEditingId(configId);
        setShowForm(true);
    };

    const handleDelete = (configId: string) => {
        console.log("Delete config (not implemented yet):", configId);
        // TODO: Implement with a beautiful confirmation modal
    };

    const handleCreateNew = () => {
        setEditingId(null); 
        setShowForm(true);
    };

    const handleFormSaveSuccess = () => {
        setShowForm(false);
        setEditingId(null);
        clearCurrentEditingConfig();
        fetchAgentConfigs();
    };

    const handleFormCancel = () => {
        setShowForm(false);
        setEditingId(null);
        clearCurrentEditingConfig();
    };

    // Filter agents based on search
    const configsArray = useMemo(() => {
        const configs = Object.values(agentConfigs);
        if (!searchQuery.trim()) return configs;
        
        const query = searchQuery.toLowerCase();
        return configs.filter(config => 
            config.agent.name.toLowerCase().includes(query) ||
            config.agent.description.toLowerCase().includes(query) ||
            config.id.toLowerCase().includes(query)
        );
    }, [agentConfigs, searchQuery]);

    // Group tools by category
    const toolGroups = useMemo(() => {
        const groups: Record<string, AvailableToolDefinitionTS[]> = {};
        availableTools.forEach(tool => {
            const group = tool.group || 'Other';
            if (!groups[group]) groups[group] = [];
            groups[group].push(tool);
        });
        return groups;
    }, [availableTools]);

    // Get icon for tool groups
    const getToolGroupIcon = (group: string) => {
        const icons: Record<string, React.ReactNode> = {
            'Code': <Code2 className="w-5 h-5" />,
            'Data': <Database className="w-5 h-5" />,
            'Web': <Globe className="w-5 h-5" />,
            'System': <Terminal className="w-5 h-5" />,
            'File': <FileCode className="w-5 h-5" />,
            'Other': <Wrench className="w-5 h-5" />
        };
        return icons[group] || icons['Other'];
    };

    // Get gradient for agent cards based on index
    const getAgentGradient = (index: number) => {
        const gradients = [
            'from-blue-600/20 to-purple-600/20',
            'from-purple-600/20 to-pink-600/20',
            'from-pink-600/20 to-red-600/20',
            'from-green-600/20 to-blue-600/20',
            'from-orange-600/20 to-yellow-600/20',
            'from-indigo-600/20 to-purple-600/20'
        ];
        return gradients[index % gradients.length];
    };
    
    if (showForm) {
        return (
            <div className="min-h-screen bg-black">
                <AgentConfigForm 
                    configId={editingId} 
                    onSaveSuccess={handleFormSaveSuccess}
                    onCancel={handleFormCancel} 
                />
            </div>
        );
    }

    // Loading state with sophisticated spinner
    if (isLoading && Object.keys(agentConfigs).length === 0 && availableTools.length === 0) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4">
                    <div className="relative">
                        <div className="w-16 h-16 mx-auto rounded-full border-2 border-white/20 border-t-white/60 animate-spin" />
                        <div className="absolute inset-0 w-16 h-16 mx-auto rounded-full border-2 border-purple-500/20 border-t-purple-500/60 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                    </div>
                    <p className="text-white/60 font-light">Loading agent configurations...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-center space-y-4 max-w-md">
                    <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
                        <Zap className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-light text-white">Something went wrong</h3>
                    <p className="text-white/60">{error}</p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white font-light transition-all"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Animated background */}
            <div className="fixed inset-0 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-black to-slate-950" />
                <div 
                    className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"
                    style={{ animation: 'float 20s ease-in-out infinite' }}
                />
                <div 
                    className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"
                    style={{ animation: 'float 25s ease-in-out infinite reverse' }}
                />
            </div>

            {/* Main content */}
            <div className="relative z-10 px-6 md:px-12 py-8 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-12">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-4xl md:text-5xl font-extralight tracking-tight mb-2">
                                Agent Configurations
                            </h1>
                            <p className="text-white/50 font-light">
                                Design and manage your AI assistants
                            </p>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCreateNew}
                            className="group relative px-6 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-2xl font-light transition-all duration-300 border border-white/20 hover:border-white/30"
                        >
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            <div className="relative flex items-center gap-2">
                                <Plus className="w-5 h-5" />
                                <span>Create New Agent</span>
                            </div>
                        </motion.button>
                    </div>

                    {/* Search bar */}
                    <div className="relative max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search agents..."
                            className="w-full pl-12 pr-4 py-3 bg-white/5 backdrop-blur-sm rounded-2xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all border border-white/10 focus:border-white/20"
                        />
                    </div>
                </div>

                {/* Agents Grid */}
                {configsArray.length === 0 && !isLoading ? (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-20"
                    >
                        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 flex items-center justify-center">
                            <Bot className="w-12 h-12 text-white/60" />
                        </div>
                        <h3 className="text-2xl font-light mb-2">No agents yet</h3>
                        <p className="text-white/50 mb-8">Create your first AI assistant to get started</p>
                        <button
                            onClick={handleCreateNew}
                            className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-2xl font-light transition-all"
                        >
                            Create First Agent
                        </button>
                    </motion.div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
                        <AnimatePresence mode="popLayout">
                            {configsArray.map((config, index) => (
                                <motion.div
                                    key={config.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    whileHover={{ y: -4 }}
                                    className="group relative"
                                >
                                    {/* Card gradient border */}
                                    <div className={`absolute -inset-0.5 bg-gradient-to-r ${getAgentGradient(index)} rounded-3xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300`} />
                                    
                                    {/* Card content */}
                                    <div className="relative bg-white/[0.03] backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden">
                                        {/* Avatar section */}
                                        <div className="p-6 pb-4">
                                            <div className="flex items-start gap-4">
                                                <div className="relative">
                                                    <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-500 to-purple-500">
                                                        {config.agent.avatar ? (
                                                            <img
                                                                src={config.agent.avatar.startsWith('/') || config.agent.avatar.startsWith('http')
                                                                    ? config.agent.avatar
                                                                    : `/assets/avatars/${config.agent.avatar}`}
                                                                alt={config.agent.name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Bot className="w-8 h-8 text-white/80" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500/20 border-2 border-black flex items-center justify-center">
                                                        <div className="w-2 h-2 rounded-full bg-green-500" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-xl font-normal text-white truncate">
                                                        {config.agent.name}
                                                    </h3>
                                                    <p className="text-sm text-white/50 mt-1 line-clamp-2">
                                                        {config.agent.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Metadata */}
                                        <div className="px-6 pb-4 space-y-3">
                                            {/* Model */}
                                            <div className="flex items-center gap-2 text-sm">
                                                <Brain className="w-4 h-4 text-white/40" />
                                                <span className="text-white/60 font-mono">
                                                    {config.ai_config.model_id}
                                                </span>
                                            </div>

                                            {/* Tools count */}
                                            <div className="flex items-center gap-2 text-sm">
                                                <Package className="w-4 h-4 text-white/40" />
                                                <span className="text-white/60">
                                                    {config.tool_groups?.reduce((acc, group) => acc + group.tools.length, 0) || 0} tools
                                                </span>
                                            </div>

                                            {/* Skills */}
                                            {config.agent.metadata?.skills && config.agent.metadata.skills.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-3">
                                                    {config.agent.metadata.skills.slice(0, 3).map((skill, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="text-xs px-2 py-1 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-blue-300/70 border border-blue-500/20"
                                                        >
                                                            {skill}
                                                        </span>
                                                    ))}
                                                    {config.agent.metadata.skills.length > 3 && (
                                                        <span className="text-xs text-white/40">
                                                            +{config.agent.metadata.skills.length - 3}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="border-t border-white/10 p-4 flex items-center justify-between">
                                            <button
                                                onClick={() => handleEdit(config.id)}
                                                className="flex items-center gap-2 px-4 py-2 text-sm bg-white/5 hover:bg-white/10 rounded-xl transition-all"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                                <span>Edit</span>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(config.id)}
                                                className="p-2 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {/* Available Tools Section */}
                {availableTools.length > 0 && (
                    <div className="mt-16">
                        <div className="mb-8">
                            <h2 className="text-3xl font-extralight tracking-tight mb-2">
                                Available Tools
                            </h2>
                            <p className="text-white/50 font-light">
                                Enhance your agents with powerful capabilities
                            </p>
                        </div>

                        {/* Tool Groups */}
                        <div className="space-y-6">
                            {Object.entries(toolGroups).map(([group, tools]) => (
                                <motion.div
                                    key={group}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="relative"
                                >
                                    {/* Group header */}
                                    <button
                                        onClick={() => setSelectedToolGroup(selectedToolGroup === group ? null : group)}
                                        className="w-full flex items-center justify-between p-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white/60">
                                                {getToolGroupIcon(group)}
                                            </div>
                                            <div className="text-left">
                                                <h3 className="text-lg font-normal text-white">{group}</h3>
                                                <p className="text-sm text-white/50">{tools.length} tools available</p>
                                            </div>
                                        </div>
                                        <ChevronRight 
                                            className={`w-5 h-5 text-white/40 transition-transform ${
                                                selectedToolGroup === group ? 'rotate-90' : ''
                                            }`}
                                        />
                                    </button>

                                    {/* Tools grid */}
                                    <AnimatePresence>
                                        {selectedToolGroup === group && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 pl-4">
                                                    {tools.map((tool) => (
                                                        <motion.div
                                                            key={tool.name}
                                                            whileHover={{ scale: 1.02 }}
                                                            className="p-4 bg-white/[0.02] backdrop-blur-sm rounded-2xl border border-white/10 hover:border-white/20 transition-all"
                                                        >
                                                            <h4 className="font-normal text-white mb-2">
                                                                {tool.name}
                                                            </h4>
                                                            <p className="text-sm text-white/50 line-clamp-2">
                                                                {tool.description}
                                                            </p>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* CSS animations */}
            <style jsx>{`
                @keyframes float {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    33% { transform: translate(30px, -30px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                }
            `}</style>
        </div>
    );
};

export default AgentConfigsPage;
