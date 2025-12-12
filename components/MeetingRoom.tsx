import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Blob } from '@google/genai';
import { Video, Mic, MicOff, PhoneOff, ListVideo, Sparkles, Loader2, CheckSquare, AlertCircle, Users, Radio, LogOut, Power, Clock, Briefcase, Copy, Check, Info } from 'lucide-react';
import { summarizeMeeting } from '../services/geminiService';
import { MeetingSession, LiveMeeting } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface MeetingRoomProps {
    onEndMeeting: (session: MeetingSession) => void;
    previousSessions: MeetingSession[];
    liveMeeting: LiveMeeting | null;
    onStartLiveMeeting: (topic: string) => void;
    onJoinLiveMeeting: () => void;
    onStopLiveMeeting: () => void;
}

const MeetingRoom: React.FC<MeetingRoomProps> = ({ 
    onEndMeeting, 
    previousSessions, 
    liveMeeting, 
    onStartLiveMeeting, 
    onJoinLiveMeeting, 
    onStopLiveMeeting
}) => {
    const { user } = useAuth();
    const [view, setView] = useState<'Lobby' | 'Live' | 'Summary'>('Lobby');
    const [isConnecting, setIsConnecting] = useState(false);
    const [isLive, setIsLive] = useState(false);
    const [transcript, setTranscript] = useState<{ role: 'user' | 'model', text: string }[]>([]);
    const [startTime, setStartTime] = useState<number>(0);
    const [elapsed, setElapsed] = useState(0);
    const [error, setError] = useState<string | null>(null);

    // Summary State
    const [summaryData, setSummaryData] = useState<{summary: string, actionItems: string[]} | null>(null);
    const [isSummarizing, setIsSummarizing] = useState(false);

    // Admin Controls State
    const [meetingTopic, setMeetingTopic] = useState('');
    const [isCopied, setIsCopied] = useState(false);

    // Media Refs
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isMuted, setIsMuted] = useState(false);

    // Gemini Live Refs
    const aiRef = useRef<GoogleGenAI | null>(null);
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const inputContextRef = useRef<AudioContext | null>(null);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);
    const frameIntervalRef = useRef<number | null>(null);
    
    // Transcriptions buffers
    const currentInputTransRef = useRef('');
    const currentOutputTransRef = useRef('');

    const isHost = user?.role === 'ADMIN' || user?.role === 'MANAGER';

    useEffect(() => {
        // Init AI client only once on mount
        const key = process.env.API_KEY;
        if (!key) {
             setError("System Error: API Key missing in environment variables.");
             return;
        }
        aiRef.current = new GoogleGenAI({ apiKey: key });

        // Cleanup on unmount
        return () => {
            cleanup();
            stopCamera();
        };
    }, []);

    // Watch for remote meeting termination
    useEffect(() => {
        if (view === 'Live' && (!liveMeeting || !liveMeeting.isActive)) {
            console.log("Meeting ended remotely");
            setIsLive(false);
            cleanup();
            stopCamera();
            setView('Lobby');
            alert("The secure session has been terminated by the host.");
        }
    }, [liveMeeting, view]);

    useEffect(() => {
        let timer: any;
        if (isLive) {
            timer = setInterval(() => {
                setElapsed(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isLive, startTime]);

    // Re-attach stream to video element when view changes
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [view, stream]);

    const startCamera = async () => {
        try {
            setError(null);
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setStream(mediaStream);
        } catch (e) {
            console.error("Camera access failed", e);
            setError("Could not access camera/microphone. Please check permissions.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleStartMeeting = async () => {
        if (!user) return;
        if (!stream) {
            setError("Camera must be enabled before joining the secure uplink.");
            return;
        }

        const isMeetingActive = liveMeeting && liveMeeting.isActive;
        const shouldStartNew = isHost && !isMeetingActive;

        if (shouldStartNew) {
            if (!meetingTopic.trim()) {
                setError("Please define a meeting topic.");
                return;
            }
            onStartLiveMeeting(meetingTopic);
        } else {
            onJoinLiveMeeting();
        }

        setView('Live');
        await connectToGemini();
    };

    const connectToGemini = async () => {
        if (!aiRef.current || !stream) {
             setError("Initialization failed. Missing stream or API client.");
             return;
        }
        setIsConnecting(true);
        setError(null);
        setTranscript([]); 
        currentInputTransRef.current = '';
        currentOutputTransRef.current = '';
        
        try {
            const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
            const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
            
            await inputCtx.resume();
            await outputCtx.resume();

            inputContextRef.current = inputCtx;
            audioContextRef.current = outputCtx;
            
            const responseModality = Modality?.AUDIO || 'AUDIO';

            const sessionPromise = aiRef.current.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                callbacks: {
                    onopen: () => {
                        console.log("Gemini Live Connected");
                        setIsLive(true);
                        setStartTime(Date.now());
                        setIsConnecting(false);
                        
                        const source = inputCtx.createMediaStreamSource(stream);
                        const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
                        scriptProcessor.onaudioprocess = (e) => {
                            if (isMuted) return; 
                            const inputData = e.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                        };
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(inputCtx.destination);
                        
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvasRef.current = canvas;
                        
                        frameIntervalRef.current = window.setInterval(async () => {
                            if (videoRef.current && ctx) {
                                canvas.width = videoRef.current.videoWidth;
                                canvas.height = videoRef.current.videoHeight;
                                ctx.drawImage(videoRef.current, 0, 0);
                                const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
                                sessionPromise.then(session => {
                                    session.sendRealtimeInput({ 
                                        media: { mimeType: 'image/jpeg', data: base64 } 
                                    });
                                });
                            }
                        }, 1000);
                    },
                    onmessage: async (msg: LiveServerMessage) => {
                         const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                         if (audioData) {
                             const audioBuffer = await decodeAudioData(decode(audioData), outputCtx, 24000, 1);
                             const source = outputCtx.createBufferSource();
                             source.buffer = audioBuffer;
                             source.connect(outputCtx.destination);
                             
                             const now = outputCtx.currentTime;
                             nextStartTimeRef.current = Math.max(nextStartTimeRef.current, now);
                             source.start(nextStartTimeRef.current);
                             nextStartTimeRef.current += audioBuffer.duration;
                             
                             sourcesRef.current.add(source);
                             source.onended = () => sourcesRef.current.delete(source);
                         }
                         
                         if (msg.serverContent?.outputTranscription) {
                             currentOutputTransRef.current += msg.serverContent.outputTranscription.text;
                         }
                         if (msg.serverContent?.inputTranscription) {
                             currentInputTransRef.current += msg.serverContent.inputTranscription.text;
                         }
                         
                         if (msg.serverContent?.turnComplete) {
                             // Use functional updates to ensure we have the latest transcript state
                             setTranscript(prev => {
                                 const newItems = [];
                                 if (currentInputTransRef.current) {
                                     newItems.push({ role: 'user', text: currentInputTransRef.current } as const);
                                 }
                                 if (currentOutputTransRef.current) {
                                     newItems.push({ role: 'model', text: currentOutputTransRef.current } as const);
                                 }
                                 return [...prev, ...newItems];
                             });
                             currentInputTransRef.current = '';
                             currentOutputTransRef.current = '';
                             nextStartTimeRef.current = 0;
                         }
                    },
                    onclose: () => {
                        console.log("Session Closed");
                    },
                    onerror: (e) => {
                        console.error("Live Error", e);
                        setError("Connection Lost. Reconnecting...");
                        setIsLive(false);
                        cleanup();
                    }
                },
                config: {
                    responseModalities: [responseModality as any],
                    inputAudioTranscription: {}, 
                    outputAudioTranscription: {},
                    systemInstruction: `You are an AI Meeting Facilitator for a professional discussion between Management (Admin) and Staff (Employees). 
                    The current user is ${user?.name} (${user?.role}). 
                    The meeting topic is: ${meetingTopic || liveMeeting?.topic || 'General Discussion'}. 
                    
                    Your goals:
                    1. Help clarify communication between management and employees.
                    2. Note down action items if mentioned.
                    3. Be objective, professional, and supportive.
                    4. If the user asks, summarize what was just said.`
                }
            });
            sessionPromiseRef.current = sessionPromise;
        } catch (e) {
            console.error("Connection setup error", e);
            setError("Failed to initialize session. Check Network and API Key.");
            setIsConnecting(false);
            cleanup();
        }
    };

    const cleanup = () => {
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }
        if (inputContextRef.current) {
            inputContextRef.current.close();
            inputContextRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        sourcesRef.current.forEach(s => s.stop());
        sourcesRef.current.clear();
        sessionPromiseRef.current = null;
    };

    const handleLeaveCall = async () => {
        setIsLive(false);
        cleanup();
        stopCamera();
        
        // Prepare final transcript by flushing any pending buffers
        const finalTranscript = [...transcript];
        if (currentInputTransRef.current.trim()) {
            finalTranscript.push({ role: 'user', text: currentInputTransRef.current });
        }
        if (currentOutputTransRef.current.trim()) {
            finalTranscript.push({ role: 'model', text: currentOutputTransRef.current });
        }
        
        // Move to summary view
        setView('Summary');
        setIsSummarizing(true);
        
        // Ensure we actually have content before calling API
        if (finalTranscript.length > 0) {
            try {
                // Call the service which now handles errors internally and returns a safe object
                const summary = await summarizeMeeting(finalTranscript);
                setSummaryData(summary);
                
                const session: MeetingSession = {
                    id: Math.random().toString(36).substr(2, 9),
                    date: Date.now(),
                    durationSeconds: elapsed,
                    transcript: finalTranscript,
                    summary: summary.summary,
                    actionItems: summary.actionItems
                };
                onEndMeeting(session);
            } catch (e) {
                console.error("Critical Summary Error in UI:", e);
                // Fallback for UI if something catastrophic happens
                setSummaryData({ summary: "Summary Unavailable.", actionItems: [] });
            } finally {
                setIsSummarizing(false);
            }
        } else {
             setSummaryData({ summary: "No conversation detected. Ensure microphone was active.", actionItems: [] });
             setIsSummarizing(false);
        }
    };

    const handleTerminateSession = () => {
        if (confirm("WARNING: This will disconnect all participants and delete the session. Proceed?")) {
            onStopLiveMeeting();
            // We don't need to manually change view here because the useEffect on liveMeeting will trigger.
        }
    }

    const copyUplinkCode = () => {
        if (!liveMeeting) return;
        const code = btoa(JSON.stringify(liveMeeting));
        navigator.clipboard.writeText(code);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }

    function createBlob(data: Float32Array): Blob {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            int16[i] = data[i] * 32768;
        }
        let binary = '';
        const len = int16.buffer.byteLength;
        const bytes = new Uint8Array(int16.buffer);
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return {
            data: btoa(binary),
            mimeType: 'audio/pcm;rate=16000',
        };
    }
    
    function decode(base64: string) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) {
        const dataInt16 = new Int16Array(data.buffer);
        const frameCount = dataInt16.length / numChannels;
        const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < frameCount; i++) {
                channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
            }
        }
        return buffer;
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    if (view === 'Summary') {
        return (
            <div className="h-full flex flex-col p-6 animate-fade-in items-center justify-center">
                <div className="bg-zinc-900 border border-zinc-700 p-8 max-w-2xl w-full shadow-2xl relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-transparent"></div>
                     
                     <div className="text-center mb-8">
                         <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-700">
                             <CheckSquare size={32} className="text-green-500" />
                         </div>
                         <h2 className="text-2xl font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">Session Concluded</h2>
                         <p className="text-zinc-500 font-mono text-sm mt-1">Duration: {formatTime(elapsed)}</p>
                     </div>

                     {isSummarizing ? (
                         <div className="flex flex-col items-center justify-center py-8">
                             <Loader2 size={32} className="text-orange-500 animate-spin mb-4" />
                             <p className="text-zinc-400 font-mono text-xs uppercase tracking-widest animate-pulse">Processing Transcript Analysis...</p>
                         </div>
                     ) : (
                         <div className="space-y-6">
                             <div>
                                 <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Meeting Summary</h3>
                                 <p className="text-zinc-200 leading-relaxed font-mono text-sm">{summaryData?.summary}</p>
                             </div>
                             {summaryData?.actionItems && summaryData.actionItems.length > 0 && (
                                 <div>
                                     <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Action Items</h3>
                                     <ul className="space-y-2">
                                         {summaryData.actionItems.map((item, idx) => (
                                             <li key={idx} className="flex items-start gap-2 text-sm text-zinc-300 font-mono">
                                                 <span className="text-orange-500 mt-1">▹</span> {item}
                                             </li>
                                         ))}
                                     </ul>
                                 </div>
                             )}
                         </div>
                     )}

                     <div className="mt-8 pt-6 border-t border-zinc-800 flex justify-center">
                         <button 
                            onClick={() => setView('Lobby')}
                            className="bg-zinc-800 hover:bg-zinc-700 text-white px-6 py-2 uppercase font-bold tracking-wider font-['Chakra_Petch'] border border-zinc-700 hover:border-white transition-all"
                         >
                             Return to Lobby
                         </button>
                     </div>
                </div>
            </div>
        );
    }

    if (view === 'Lobby') {
        return (
            <div className="h-full flex flex-col p-6 animate-fade-in">
                 <div className="flex justify-between items-end border-b border-zinc-800 pb-6 mb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2 font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-3">
                            <Users size={32} className="text-cyan-500" />
                            Management Sync
                        </h2>
                        <p className="text-zinc-500 font-mono text-sm">Collaborative workspace for Admin & Staff.</p>
                    </div>
                    {liveMeeting && liveMeeting.isActive && (
                         <div className="flex items-center gap-3">
                             <div className="flex items-center gap-3 bg-red-950/30 border border-red-900 px-4 py-2 rounded-sm animate-pulse">
                                <Radio size={16} className="text-red-500" />
                                <span className="text-red-400 font-bold font-mono text-sm uppercase">LIVE: {liveMeeting.topic}</span>
                             </div>
                             {isHost && (
                                 <div className="flex flex-col items-end gap-1">
                                     <button 
                                        onClick={copyUplinkCode}
                                        className="flex items-center gap-2 bg-zinc-800 border border-zinc-600 hover:border-white px-3 py-2 text-xs font-bold uppercase transition-all"
                                     >
                                         {isCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                         {isCopied ? 'Copied' : 'Copy Uplink'}
                                     </button>
                                     <span className="text-[9px] text-zinc-500 font-mono">For cross-browser joining</span>
                                 </div>
                             )}
                         </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                    <div className="lg:col-span-2 bg-black border border-zinc-800 rounded-sm relative overflow-y-auto custom-scrollbar flex flex-col items-center justify-center p-8">
                         {!stream ? (
                             <div className="text-center space-y-4">
                                 <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto border border-zinc-700">
                                     <Video size={32} className="text-zinc-500" />
                                 </div>
                                 <p className="text-zinc-400 font-mono">Camera access required for video conference.</p>
                                 <button 
                                    onClick={startCamera}
                                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-sm uppercase tracking-wider font-['Chakra_Petch']"
                                 >
                                     Enable Camera & Mic
                                 </button>
                             </div>
                         ) : (
                             <div className="relative w-full h-full flex flex-col items-center justify-center">
                                 <video ref={videoRef} autoPlay muted className="max-h-[300px] w-auto border border-zinc-700 bg-zinc-900 rounded-sm mb-6" />
                                 <div className="w-full max-w-lg bg-zinc-900/90 border border-zinc-700 p-6 rounded-sm shadow-2xl z-10">
                                     {liveMeeting && liveMeeting.isActive ? (
                                        <div className="text-center space-y-4">
                                             <div className="flex flex-col items-center gap-2 text-green-500 mb-2">
                                                 <Radio size={32} className="animate-pulse" />
                                                 <span className="font-bold font-['Chakra_Petch'] uppercase">Meeting In Progress</span>
                                             </div>
                                             <p className="text-white text-lg font-bold">{liveMeeting.topic}</p>
                                             <p className="text-zinc-500 text-sm font-mono">Host: {liveMeeting.hostName}</p>
                                             <div className="my-2">
                                                 <p className="text-xs text-zinc-500 uppercase">Active Participants:</p>
                                                 <div className="flex justify-center gap-1 mt-1 flex-wrap">
                                                    {liveMeeting.participants.map((p, i) => (
                                                        <span key={i} className="text-[10px] bg-zinc-800 px-2 py-1 rounded-full text-zinc-300">{p}</span>
                                                    ))}
                                                 </div>
                                             </div>
                                             <button 
                                                type="button"
                                                onClick={handleStartMeeting}
                                                className="w-full bg-green-600 hover:bg-green-500 text-black font-bold py-3 px-4 uppercase tracking-wider font-['Chakra_Petch'] shadow-[0_0_15px_rgba(34,197,94,0.4)] flex items-center justify-center gap-2"
                                             >
                                                 <Users size={18} /> {isHost ? "Rejoin Session" : "Join Session"}
                                             </button>
                                             {isHost && (
                                                <button 
                                                    type="button"
                                                    onClick={handleTerminateSession}
                                                    className="w-full bg-red-950/50 hover:bg-red-900 text-red-400 hover:text-white border border-red-900 hover:border-red-500 py-2 px-4 uppercase tracking-wider font-mono text-xs flex items-center justify-center gap-2 mt-4"
                                                >
                                                    <Power size={14} /> End Meeting
                                                </button>
                                             )}
                                         </div>
                                     ) : (
                                        isHost ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-2 text-white font-bold uppercase font-['Chakra_Petch']">
                                                    <Briefcase size={18} className="text-orange-500" /> Start Team Session
                                                </div>
                                                <div>
                                                    <label className="text-xs text-zinc-500 font-mono uppercase font-bold block mb-1">Meeting Agenda</label>
                                                    <input 
                                                       type="text" 
                                                       value={meetingTopic}
                                                       onChange={(e) => setMeetingTopic(e.target.value)}
                                                       placeholder="E.g. Weekly Review, 1:1 Sync, Project Planning"
                                                       className="w-full bg-black border border-zinc-700 text-white px-3 py-2 text-sm focus:border-orange-500 font-mono"
                                                    />
                                                </div>
                                                <button 
                                                   type="button"
                                                   onClick={handleStartMeeting}
                                                   className="w-full bg-orange-600 hover:bg-orange-500 text-black font-bold py-3 px-4 uppercase tracking-wider font-['Chakra_Petch'] shadow-[0_0_15px_rgba(234,88,12,0.4)] flex items-center justify-center gap-2"
                                                >
                                                    <Radio size={18} /> Broadcast & Start
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="py-4">
                                                <p className="text-zinc-500 font-mono italic">No active meetings detected.</p>
                                                <p className="text-zinc-600 text-xs mt-2">Wait for a manager to start a session.</p>
                                            </div>
                                        )
                                     )}
                                 </div>
                             </div>
                         )}
                         {error && (
                             <div className="absolute top-4 left-4 right-4 p-3 bg-red-950/80 border border-red-500 text-red-200 text-sm font-mono flex items-center gap-2">
                                 <AlertCircle size={16} /> {error}
                             </div>
                         )}
                    </div>

                    <div className="bg-zinc-900/50 border border-zinc-800 p-4 flex flex-col h-full overflow-hidden">
                        <h3 className="text-zinc-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2 font-['Chakra_Petch'] text-sm">
                            <ListVideo size={16} /> Session Logs
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                            {previousSessions.length === 0 && (
                                <p className="text-zinc-600 text-xs font-mono text-center py-8">No records found.</p>
                            )}
                            {previousSessions.map(session => (
                                <div key={session.id} className="bg-zinc-950 p-3 border border-zinc-800 hover:border-purple-500/30 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-purple-400 font-bold font-mono text-xs">
                                            {new Date(session.date).toLocaleDateString()}
                                        </span>
                                        <span className="text-zinc-600 text-xs flex items-center gap-1">
                                            <Clock size={10} /> {formatTime(session.durationSeconds)}
                                        </span>
                                    </div>
                                    <p className="text-zinc-300 text-sm line-clamp-2 mb-2 font-mono text-xs">{session.summary}</p>
                                    <div className="flex gap-1 flex-wrap">
                                        {session.actionItems?.slice(0, 2).map((item, i) => (
                                            <span key={i} className="text-[9px] bg-zinc-900 text-zinc-500 px-1.5 py-0.5 border border-zinc-800">
                                                {item.substring(0, 20)}...
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    if (view === 'Live') {
        return (
            <div className="h-full flex flex-col bg-black relative overflow-hidden">
                 <video ref={videoRef} autoPlay muted className="absolute inset-0 w-full h-full object-cover opacity-60" />
                 <div className="absolute inset-0 z-10 flex flex-col">
                     <div className="p-4 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent">
                         <div className="flex items-center gap-3">
                             <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                             <span className="text-red-500 font-bold font-mono tracking-widest uppercase text-sm">Live Feed</span>
                             <span className="text-zinc-400 font-mono text-sm bg-black/50 px-2 rounded-sm">{formatTime(elapsed)}</span>
                         </div>
                         <div className="flex flex-col items-end">
                            <div className="bg-black/60 backdrop-blur border border-zinc-800 px-4 py-2 rounded-full flex items-center gap-2 mb-2">
                                <Sparkles size={16} className="text-purple-500" />
                                <span className="text-purple-200 font-bold font-['Chakra_Petch'] text-sm">AI Meeting Facilitator</span>
                            </div>
                            {liveMeeting && (
                                <div className="text-xs font-mono text-zinc-400 bg-black/40 px-2 py-1">
                                    TOPIC: <span className="text-white">{liveMeeting.topic}</span>
                                </div>
                            )}
                         </div>
                     </div>

                     {isConnecting && (
                         <div className="flex-1 flex items-center justify-center">
                             <div className="bg-black/80 p-6 rounded-lg border border-purple-500/50 flex flex-col items-center gap-3">
                                 <Loader2 size={32} className="text-purple-500 animate-spin" />
                                 <p className="text-purple-300 font-mono uppercase text-xs tracking-widest">Establishing Connection...</p>
                             </div>
                         </div>
                     )}
                     
                     {error && (
                         <div className="flex-1 flex items-center justify-center">
                             <div className="bg-red-950/80 p-6 rounded-lg border border-red-500 flex flex-col items-center gap-3 max-w-md text-center">
                                 <AlertCircle size={32} className="text-red-500" />
                                 <p className="text-red-200 font-mono text-sm">{error}</p>
                                 <button onClick={() => setView('Lobby')} className="mt-2 px-4 py-2 bg-red-800 text-white text-xs uppercase font-bold">Return to Lobby</button>
                             </div>
                         </div>
                     )}

                     <div className="mt-auto p-6 bg-gradient-to-t from-black via-black/80 to-transparent flex gap-6 items-end">
                         <div className="flex-1 h-32 overflow-y-auto custom-scrollbar bg-black/40 backdrop-blur border border-zinc-800/50 p-4 rounded-sm">
                             {transcript.length === 0 && <p className="text-zinc-600 italic text-sm">Transcript empty. Start speaking...</p>}
                             {transcript.map((t, i) => (
                                 <p key={i} className={`text-sm mb-1 font-mono ${t.role === 'model' ? 'text-purple-300' : 'text-zinc-300'}`}>
                                     <span className="font-bold opacity-50 uppercase text-xs mr-2">{t.role === 'model' ? 'AI' : 'YOU'}:</span>
                                     {t.text}
                                 </p>
                             ))}
                             <div className="text-zinc-500 text-xs italic mt-2 animate-pulse">{currentInputTransRef.current}</div>
                         </div>

                         <div className="flex gap-4">
                             <button 
                                onClick={() => setIsMuted(!isMuted)}
                                className={`p-4 rounded-full border transition-all ${isMuted ? 'bg-red-600 border-red-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'}`}
                             >
                                 {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                             </button>
                             <button 
                                onClick={handleLeaveCall}
                                className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-full uppercase tracking-widest font-['Chakra_Petch'] flex items-center gap-2 shadow-[0_0_30px_rgba(220,38,38,0.5)]"
                             >
                                 <LogOut size={24} /> Leave Call
                             </button>
                         </div>
                     </div>
                 </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col items-center justify-center p-6 animate-fade-in space-y-6">
            <Loader2 size={48} className="text-purple-500 animate-spin" />
            <h2 className="text-2xl font-bold text-white font-['Chakra_Petch']">Processing Session Data</h2>
            <p className="text-zinc-500 font-mono">Generating meeting summary and action items...</p>
        </div>
    );
};

export default MeetingRoom;