import React, { useState, useEffect, useRef } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

// Define Rich Content Parts
interface TextPart {
    type: 'text';
    text: string;
}

interface ToolCallPart {
    type: 'tool_call';
    toolName: string;
    toolCallId: string;
    input: any; // Can be string or parsed object from JSON
}

interface ToolResultPart {
    type: 'tool_result';
    toolName: string; 
    toolCallId: string;
    output: string; 
    isError?: boolean;
}

type RichContentPart = TextPart | ToolCallPart | ToolResultPart;

interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: RichContentPart[];
    name?: string | null; 
}

interface AgentEventPayload {
    session_id: string;
    type: 'chunk' | 'final_message_history' | 'tool_call' | 'tool_result' | 'error' | 'done' | 'final_assistant_message';
    message_id?: string;
    delta?: string;
    history?: any[]; 
    tool_name?: string;
    tool_input?: string;
    tool_call_id?: string;
    tool_output?: string;
    error?: string; // This can indicate an error in tool_result or a general error
    role?: 'user' | 'assistant' | 'system' | 'tool';
    content?: RichContentPart[]; 
}

const PythonWorkerTest: React.FC = () => {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [currentResponse, setCurrentResponse] = useState<string>('');
    const [isResponding, setIsResponding] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [inputMessage, setInputMessage] = useState<string>('');

    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, currentResponse]);

    useEffect(() => {
        const initSession = async () => {
            try {
                const newSessionId = await invoke<string>('start_new_test_session');
                setSessionId(newSessionId);
                console.log('Test session started with ID:', newSessionId);
                setMessages([{id: 'init-log', role: 'system', content: [{type: 'text', text: `Session started: ${newSessionId}`}]}]);
            } catch (err) {
                console.error('Error starting new test session:', err);
                const errorText = `Failed to start session: ${err instanceof Error ? err.message : String(err)}`;
                setError(errorText);
                setMessages([{id: 'init-error', role: 'system', content: [{type: 'text', text: errorText}]}]);
            }
        };
        initSession();
    }, []);

    useEffect(() => {
        if (!sessionId) return;
        let unlisten: UnlistenFn | undefined;
        const setupListener = async () => {
            try {
                unlisten = await listen<AgentEventPayload>('agent_event', (event) => {
                    console.log(`${new Date().toLocaleString()} 📣 Frontend received agent_event:`, event.payload);
                    const payload = event.payload;
                    if (payload.session_id !== sessionId) return;

                    switch (payload.type) {
                        case 'chunk':
                            if (payload.delta) setCurrentResponse(prev => prev + payload.delta);
                            break;
                        case 'final_message_history':
                            if (payload.history) {
                                const newMessages = payload.history.map((msg: any) => ({
                                    id: msg.id || Math.random().toString(36).substring(7),
                                    role: msg.role,
                                    content: msg.content, 
                                    name: msg.name
                                }));
                                setMessages(newMessages);
                                setCurrentResponse('');
                                setIsResponding(false);
                                setError(null);
                            }
                            break;
                        case 'final_assistant_message':
                            if (payload.role === 'assistant' && payload.content) {
                                const assistantMsg: Message = {
                                    id: payload.message_id || Math.random().toString(36).substring(7),
                                    role: 'assistant',
                                    content: payload.content, 
                                    name: undefined
                                };
                                setMessages(prev => [...prev, assistantMsg]);
                                setCurrentResponse('');
                            }
                            break;
                        case 'error':
                            // General error, not a tool result error (that's handled in 'tool_result' case)
                            if (payload.error && !payload.tool_call_id) { 
                                const errorText = `Backend Error: ${payload.error}`;
                                setError(errorText);
                                setMessages(prev => [...prev, {id: Math.random().toString(36).substring(7), role: 'system', content: [{type: 'text', text: errorText}]}]);
                                setIsResponding(false);
                                setCurrentResponse('');
                            }
                            break;
                        case 'done':
                            if (currentResponse.trim()) {
                                setMessages(prev => [
                                    ...prev,
                                    {
                                        id: payload.message_id || Math.random().toString(36).substring(7),
                                        role: 'assistant',
                                        content: [{ type: 'text', text: currentResponse }],
                                        name: null
                                    }
                                ]);
                            }
                            setCurrentResponse('');
                            setIsResponding(false);
                            break;
                        case 'tool_call':
                            if (payload.tool_call_id && payload.tool_name) {
                                let parsedInput = {};
                                try {
                                    // Ensure tool_input is a string before parsing, or handle if it could be an object
                                    if (payload.tool_input && typeof payload.tool_input === 'string') {
                                        parsedInput = JSON.parse(payload.tool_input);
                                    } else if (payload.tool_input) { // If it's already an object
                                        parsedInput = payload.tool_input;
                                    }
                                } catch (e) {
                                    console.error("Failed to parse tool_input JSON:", e, payload.tool_input);
                                    parsedInput = { error: "Invalid JSON input", raw: payload.tool_input };
                                }
                                const toolCallMsg: Message = {
                                    id: payload.message_id || `tc_${payload.tool_call_id}_${Date.now()}`,
                                    role: 'assistant', 
                                    content: [{
                                        type: 'tool_call',
                                        toolCallId: payload.tool_call_id,
                                        toolName: payload.tool_name,
                                        input: parsedInput,
                                    } as ToolCallPart],
                                };
                                setMessages(prev => [...prev, toolCallMsg]);
                            }
                            break;
                        case 'tool_result':
                            if (payload.tool_call_id && payload.tool_output !== undefined) {
                                const toolResultMsg: Message = {
                                    id: payload.message_id || `tr_${payload.tool_call_id}_${Date.now()}`,
                                    role: 'tool',
                                    name: payload.tool_name || 'unknown_tool',
                                    content: [{
                                        type: 'tool_result',
                                        toolCallId: payload.tool_call_id,
                                        toolName: payload.tool_name || 'unknown_tool',
                                        output: String(payload.tool_output), // Ensure output is a string
                                        isError: payload.error ? true : false, 
                                    } as ToolResultPart],
                                };
                                setMessages(prev => [...prev, toolResultMsg]);
                            }
                            break;
                        default:
                            const unknownPayload = payload as any;
                            console.warn('Received unhandled agent_event type:', unknownPayload.type);
                    }
                });
            } catch (err) {
                console.error("Failed to set up Tauri event listener:", err);
                const errorMsg = err instanceof Error ? err.message : String(err);
                setError(`Listener setup error: ${errorMsg}`);
            }
        };
        setupListener();
        return () => { if (unlisten) unlisten(); };
    }, [sessionId]);

    const handleSendMessage = async () => {
        if (!inputMessage.trim() || !sessionId || isResponding) return;
        const userMsg: Message = {
            id: Math.random().toString(36).substring(2),
            role: 'user',
            content: [{ type: 'text', text: inputMessage }],
        };
        setMessages(prev => [...prev, userMsg]);
        setIsResponding(true);
        setError(null);
        const messageToSend = inputMessage;
        setInputMessage('');
        try {
            await invoke('send_message', { sid: sessionId, text: messageToSend });
        } catch (err) {
            console.error("Error invoking send_message:", err);
            const errorMsg = err instanceof Error ? err.message : String(err);
            setError(errorMsg);
            setMessages(prev => [...prev, {id: Math.random().toString(36).substring(2), role: 'system', content: [{type: 'text', text: `Error sending: ${errorMsg}`}]}]);
            setIsResponding(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'sans-serif' }}>
            <h2 style={{ textAlign: 'center', borderBottom: '1px solid #ccc', paddingBottom: '10px' }}>Python Worker Test UI</h2>
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '10px', borderBottom: '1px solid #eee' }}>
                {messages.map((msg) => (
                    <div key={msg.id} style={{
                        marginBottom: '10px',
                        padding: '8px 12px',
                        borderRadius: '7px',
                        backgroundColor: msg.role === 'user' ? '#007bff' : 
                                         (msg.role === 'assistant' ? '#f0f0f0' : 
                                         (msg.role === 'tool' ? '#fff9c4' : // Lighter yellow for tool messages
                                         '#e2e3e5')), // Default for system
                        color: msg.role === 'user' ? 'white' : 'black',
                        textAlign: msg.role === 'user' ? 'right' : 'left',
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '70%',
                        marginLeft: msg.role === 'user' ? 'auto' : (msg.role === 'tool' ? '30px' : '0'), // Indent tool messages
                        marginRight: msg.role === 'assistant' ? 'auto' : (msg.role === 'tool' ? 'auto' : '0'),
                    }}>
                        <strong style={{ display: 'block', fontSize: '0.8em', marginBottom: '3px' }}>
                            {msg.role === 'tool' ? `${msg.role.toUpperCase()} (${msg.name || 'N/A'})` : msg.role.toUpperCase()}
                        </strong>
                        {msg.content.map((part, index) => {
                            if (part.type === 'text') {
                                return <span key={index} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{part.text}</span>;
                            } else if (part.type === 'tool_call') {
                                return (
                                    <div key={index} style={{
                                        padding: '8px',
                                        margin: '5px 0',
                                        backgroundColor: '#e9ecef', 
                                        borderRadius: '4px',
                                        border: '1px solid #ced4da'
                                    }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '0.9em', color: '#495057' }}>
                                            Tool Call: {part.toolName} 
                                            <span style={{fontSize: '0.8em', color: '#6c757d', marginLeft: '5px'}}>(ID: {part.toolCallId})</span>
                                        </div>
                                        <pre style={{
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            backgroundColor: '#f8f9fa',
                                            padding: '10px',
                                            borderRadius: '4px',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            fontSize: '0.85em',
                                            border: '1px solid #dee2e6'
                                        }}>
                                            Input: {typeof part.input === 'string' ? part.input : JSON.stringify(part.input, null, 2)}
                                        </pre>
                                    </div>
                                );
                            } else if (part.type === 'tool_result') {
                                return (
                                    <div key={index} style={{
                                        padding: '8px',
                                        margin: '5px 0',
                                        backgroundColor: part.isError ? '#ffe0e0' : '#e6ffed', 
                                        borderRadius: '4px',
                                        border: `1px solid ${part.isError ? '#d32f2f' : '#66bb6a'}`
                                    }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '0.9em', color: part.isError ? '#c62828' : '#2e7d32' }}>
                                            Result from {part.toolName} 
                                            <span style={{fontSize: '0.8em', color: '#6c757d', marginLeft: '5px'}}>(ID: {part.toolCallId})</span>
                                        </div>
                                        <pre style={{
                                            whiteSpace: 'pre-wrap',
                                            wordBreak: 'break-word',
                                            backgroundColor: '#f8f9fa',
                                            padding: '10px',
                                            borderRadius: '4px',
                                            maxHeight: '200px',
                                            overflowY: 'auto',
                                            fontSize: '0.85em',
                                            border: '1px solid #dee2e6'
                                        }}>
                                            Output: {part.output}
                                        </pre>
                                    </div>
                                );
                            }
                            return <span key={index}>Unsupported content part: {String((part as any).type)}</span>;
                        })}
                    </div>
                ))}
                {isResponding && currentResponse && (
                    <div style={{
                        marginBottom: '10px', padding: '8px 12px', borderRadius: '7px',
                        backgroundColor: '#f0f0f0', color: 'black', textAlign: 'left',
                        alignSelf: 'flex-start', maxWidth: '70%', marginRight: 'auto'
                    }}>
                        <strong style={{ display: 'block', fontSize: '0.8em', marginBottom: '3px' }}>ASSISTANT</strong>
                        <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{currentResponse}</span>
                        <span style={{ animation: 'blinker 1s linear infinite', marginLeft: '2px' }}>▋</span>
                    </div>
                )}
                {error && (
                    <div style={{
                        padding: '8px 12px', borderRadius: '7px', backgroundColor: '#ffdddd',
                        color: '#d8000c', marginBottom: '10px'
                    }}>
                        <strong>Error:</strong> {error}
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div style={{ padding: '10px', borderTop: '1px solid #ccc', backgroundColor: '#f8f9fa' }}>
                <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isResponding && handleSendMessage()}
                    disabled={isResponding || !sessionId}
                    placeholder={!sessionId ? "Initializing session..." : "Type your message..."}
                    style={{ width: 'calc(100% - 70px)', padding: '10px', borderRadius: '5px', border: '1px solid #ccc', marginRight: '5px' }}
                />
                <button
                    onClick={handleSendMessage}
                    disabled={isResponding || !inputMessage.trim() || !sessionId}
                    style={{ width: '60px', padding: '10px', borderRadius: '5px', border: 'none', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' }}
                >
                    Send
                </button>
            </div>
            {/* Basic CSS for blinker animation */}
            <style>{`
                @keyframes blinker {
                    50% { opacity: 0; }
                }
            `}</style>
        </div>
    );
};


export default function PythonWorkerTestPage() {
    return (
        <div className="container mx-auto"> 
            <PythonWorkerTest    />
        </div>
    );
}