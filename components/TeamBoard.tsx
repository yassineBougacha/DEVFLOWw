import React, { useState } from 'react';
import { Task, TaskStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { User, Shield, Zap, TrendingUp, AlertTriangle, Brain, Sparkles, Loader2, Award, Activity, CheckCircle2, Target, Briefcase, ExternalLink, Copy, Check } from 'lucide-react';
import { generateTeamInsights, generatePersonalCoaching, generateStandup } from '../services/geminiService';
import { useAuth } from '../contexts/AuthContext';

interface TeamBoardProps {
  tasks: Task[];
  onNavigateToTask: (projectId: string) => void;
}

interface DeveloperStats {
  name: string;
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  totalHoursAssigned: number;
  totalHoursCompleted: number;
  categories: Record<string, number>;
}

// Data Types for AI Responses
interface AIInsightData {
  overallAssessment: string;
  developerInsights: {
    name: string;
    levelAssessment: string;
    performanceNote: string;
    suggestion: string;
  }[];
  strategicRecommendations: string[];
}

interface PersonalCoachData {
  status: "ON_TRACK" | "AT_RISK" | "EXCELLENT" | "OVERLOADED";
  feedback: string;
  priorities: string[];
  efficiencyScore: number;
}

const TeamBoard: React.FC<TeamBoardProps> = ({ tasks, onNavigateToTask }) => {
  const { user } = useAuth();
  
  // State for Team View
  const [teamInsights, setTeamInsights] = useState<AIInsightData | null>(null);
  
  // State for Personal View
  const [personalCoach, setPersonalCoach] = useState<PersonalCoachData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Standup State
  const [standupText, setStandupText] = useState<string | null>(null);
  const [isGeneratingStandup, setIsGeneratingStandup] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // --- DATA PROCESSING ---
  // We process all data first, then filter based on view mode.
  const developers: Record<string, DeveloperStats> = {};

  tasks.forEach(task => {
    const name = task.assignee || 'Unassigned';
    if (!developers[name]) {
      developers[name] = {
        name,
        totalTasks: 0,
        completedTasks: 0,
        activeTasks: 0,
        totalHoursAssigned: 0,
        totalHoursCompleted: 0,
        categories: {}
      };
    }
    
    developers[name].totalTasks++;
    developers[name].totalHoursAssigned += (task.estimatedHours || 0);
    
    if (task.status === TaskStatus.DONE) {
      developers[name].completedTasks++;
      developers[name].totalHoursCompleted += (task.estimatedHours || 0);
    } else {
      developers[name].activeTasks++;
    }

    developers[name].categories[task.category] = (developers[name].categories[task.category] || 0) + 1;
  });

  const devList = Object.values(developers);
  const workloadData = devList.map(dev => ({
    name: dev.name,
    completed: dev.totalHoursCompleted,
    remaining: dev.totalHoursAssigned - dev.totalHoursCompleted,
  }));

  // --- ACTIONS ---

  const handleTeamAnalyze = async () => {
    setIsAnalyzing(true);
    try {
        const result = await generateTeamInsights(tasks);
        setTeamInsights(result);
    } catch (e) {
        console.error(e);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handlePersonalAnalyze = async () => {
    if (!user) return;
    setIsAnalyzing(true);
    try {
        // Filter tasks for this user (First name matching)
        const myTasks = tasks.filter(t => user.name.includes(t.assignee) || t.assignee.includes(user.name.split(' ')[0]));
        const result = await generatePersonalCoaching(user.name, myTasks);
        setPersonalCoach(result);
    } catch (e) {
        console.error(e);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleGenerateStandup = async () => {
    if (!user) return;
    setIsGeneratingStandup(true);
    try {
        const myTasks = tasks.filter(t => user.name.includes(t.assignee) || t.assignee.includes(user.name.split(' ')[0]));
        const result = await generateStandup(myTasks);
        setStandupText(result);
    } catch (e) {
        console.error(e);
    } finally {
        setIsGeneratingStandup(false);
    }
  }

  const copyToClipboard = () => {
    if (standupText) {
        navigator.clipboard.writeText(standupText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    }
  }

  // --- RENDER LOGIC ---

  const isEmployee = user?.role === 'EMPLOYEE';

  // 1. PERSONAL VIEW (For Employees)
  if (isEmployee) {
    const myName = user?.name.split(' ')[0] || '';
    // Find my stats from the processed list (fuzzy match)
    const myStats = devList.find(d => user?.name.includes(d.name) || d.name.includes(myName)) || {
        name: user?.name || 'Me',
        totalTasks: 0,
        completedTasks: 0,
        activeTasks: 0,
        totalHoursAssigned: 0,
        totalHoursCompleted: 0,
        categories: {}
    };

    const efficiency = myStats.totalHoursAssigned > 0 
        ? Math.round((myStats.totalHoursCompleted / myStats.totalHoursAssigned) * 100) 
        : 0;

    return (
        <div className="p-6 space-y-6 animate-fade-in pb-20 relative">
             <div className="flex justify-between items-end border-b border-zinc-800 pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2 font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-3">
                        <User size={32} className="text-cyan-500" />
                        My Command Center
                    </h2>
                    <p className="text-zinc-500 font-mono text-sm">Operative: <span className="text-cyan-400 font-bold">{user?.name}</span></p>
                </div>
                 <div className="flex gap-3">
                     <button 
                        onClick={handleGenerateStandup}
                        disabled={isGeneratingStandup}
                        className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-orange-500 hover:text-orange-400 transition-all uppercase font-bold tracking-wider font-['Chakra_Petch'] disabled:opacity-50"
                    >
                        {isGeneratingStandup ? <Loader2 className="animate-spin" size={18} /> : <Zap size={18} />}
                        Auto-Standup
                    </button>
                    <button 
                        onClick={handlePersonalAnalyze}
                        disabled={isAnalyzing}
                        className="flex items-center gap-2 px-6 py-3 bg-cyan-900/30 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/50 transition-all uppercase font-bold tracking-wider font-['Chakra_Petch'] disabled:opacity-50"
                    >
                        {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                        {personalCoach ? 'Refresh Coach' : 'Analyze My Performance'}
                    </button>
                 </div>
            </div>

            {/* Top Row: Personal Stats & AI Coach */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* My Stats Card */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-transparent"></div>
                    <div>
                         <h3 className="text-zinc-400 font-bold uppercase tracking-widest mb-6 flex items-center gap-2 font-['Chakra_Petch']">
                            <Activity size={16} /> Metrics
                        </h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                                <span className="text-zinc-500 font-mono text-xs uppercase">Assigned Objectives</span>
                                <span className="text-xl font-bold text-white font-['Chakra_Petch']">{myStats.totalTasks}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                                <span className="text-zinc-500 font-mono text-xs uppercase">Completion Rate</span>
                                <span className="text-xl font-bold text-green-500 font-['Chakra_Petch']">
                                    {myStats.totalTasks > 0 ? Math.round((myStats.completedTasks/myStats.totalTasks)*100) : 0}%
                                </span>
                            </div>
                            <div className="flex justify-between items-center pb-2">
                                <span className="text-zinc-500 font-mono text-xs uppercase">Active Load</span>
                                <span className="text-xl font-bold text-orange-400 font-['Chakra_Petch']">{myStats.totalHoursAssigned - myStats.totalHoursCompleted}h</span>
                            </div>
                        </div>
                    </div>
                    {efficiency < 50 && (
                        <div className="mt-4 p-3 bg-red-950/20 border border-red-900/50 flex items-center gap-2 text-red-400 text-xs font-mono">
                            <AlertTriangle size={14} /> Efficiency Critical. Consult Lead.
                        </div>
                    )}
                </div>

                {/* AI Coach Panel */}
                <div className="lg:col-span-2 bg-zinc-900/80 border border-cyan-500/20 p-6 relative overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.05)]">
                     {personalCoach ? (
                        <>
                             <div className="flex justify-between items-start mb-4">
                                <h3 className="text-cyan-400 font-bold uppercase tracking-widest flex items-center gap-2 font-['Chakra_Petch']">
                                    <Brain size={16} /> AI Performance Coach
                                </h3>
                                <span className={`px-3 py-1 text-xs font-bold border rounded-sm font-mono ${
                                    personalCoach.status === 'EXCELLENT' ? 'border-green-500 text-green-500 bg-green-950/30' :
                                    personalCoach.status === 'AT_RISK' ? 'border-red-500 text-red-500 bg-red-950/30' :
                                    personalCoach.status === 'OVERLOADED' ? 'border-orange-500 text-orange-500 bg-orange-950/30' :
                                    'border-cyan-500 text-cyan-500 bg-cyan-950/30'
                                }`}>
                                    STATUS: {personalCoach.status}
                                </span>
                             </div>
                             
                             <div className="mb-6">
                                <p className="text-lg text-white font-medium italic">"{personalCoach.feedback}"</p>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3 font-bold">Priority Directives</p>
                                    <ul className="space-y-2">
                                        {personalCoach.priorities.map((p, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                                                <Target size={14} className="mt-1 text-cyan-500" />
                                                {p}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="flex flex-col items-center justify-center bg-black/40 p-4 border border-zinc-800">
                                     <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2">AI Efficiency Score</p>
                                     <div className="relative flex items-center justify-center w-20 h-20">
                                         <Award size={64} strokeWidth={1} className={personalCoach.efficiencyScore > 80 ? 'text-yellow-500' : 'text-zinc-600'} />
                                         <span className="absolute text-lg font-bold text-white mt-1 font-['Chakra_Petch']">{personalCoach.efficiencyScore}</span>
                                     </div>
                                </div>
                             </div>
                        </>
                     ) : (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4">
                            <Sparkles size={48} className="opacity-20" />
                            <p className="text-sm font-mono uppercase tracking-widest">Awaiting Analysis Request...</p>
                        </div>
                     )}
                </div>
            </div>

            {/* My Active Tasks Breakdown */}
            <div className="bg-zinc-900 border border-zinc-800 p-6">
                 <h3 className="text-zinc-400 font-bold uppercase tracking-widest mb-6 flex items-center gap-2 font-['Chakra_Petch']">
                    <Briefcase size={16} /> Active Objectives
                </h3>
                 {tasks.filter(t => (user?.name.includes(t.assignee) || t.assignee.includes(myName)) && t.status !== TaskStatus.DONE).length > 0 ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {tasks.filter(t => (user?.name.includes(t.assignee) || t.assignee.includes(myName)) && t.status !== TaskStatus.DONE).map(task => (
                            <div 
                                key={task.id} 
                                onClick={() => onNavigateToTask(task.projectId)}
                                className="bg-black p-4 border border-zinc-800 hover:border-cyan-500/50 transition-colors cursor-pointer group relative"
                            >
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ExternalLink size={14} className="text-cyan-500" />
                                </div>
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[10px] px-2 py-0.5 border ${
                                        task.priority === 'HIGH' ? 'border-red-900 text-red-500' : 'border-zinc-800 text-zinc-500'
                                    }`}>{task.priority}</span>
                                    <span className="text-[10px] text-zinc-600 font-mono">{task.estimatedHours}h Est</span>
                                </div>
                                <h4 className="text-sm font-bold text-white mb-1 truncate group-hover:text-cyan-400 transition-colors">{task.title}</h4>
                                <p className="text-xs text-zinc-500 truncate mb-3">{task.description}</p>
                                <div className="w-full bg-zinc-900 h-1">
                                    <div className="bg-cyan-600 h-1 w-1/2 animate-pulse"></div>
                                </div>
                            </div>
                        ))}
                     </div>
                 ) : (
                    <div className="text-center py-8 text-zinc-600 font-mono text-sm">
                        No active objectives. Standby for assignment.
                    </div>
                 )}
            </div>

            {/* Standup Modal Overlay */}
            {standupText && (
                <div className="absolute top-0 right-0 h-full w-full bg-black/80 backdrop-blur-sm z-50 flex justify-end animate-in slide-in-from-right duration-300">
                    <div className="w-full max-w-md bg-zinc-900 border-l border-zinc-700 h-full p-6 shadow-2xl flex flex-col">
                        <div className="flex justify-between items-center mb-6">
                             <h3 className="text-xl font-bold text-white font-['Chakra_Petch'] uppercase flex items-center gap-2">
                                <Zap size={20} className="text-orange-500" /> Daily Standup
                             </h3>
                             <button onClick={() => setStandupText(null)} className="text-zinc-500 hover:text-white">Close</button>
                        </div>
                        <div className="flex-1 bg-black p-4 border border-zinc-800 overflow-y-auto mb-4 font-mono text-sm text-zinc-300 whitespace-pre-wrap">
                            {standupText}
                        </div>
                        <button 
                            onClick={copyToClipboard}
                            className={`w-full flex items-center justify-center gap-2 py-3 uppercase font-bold tracking-widest transition-all ${
                                isCopied ? 'bg-green-600 text-black' : 'bg-zinc-800 hover:bg-zinc-700 text-white'
                            }`}
                        >
                            {isCopied ? <Check size={18} /> : <Copy size={18} />}
                            {isCopied ? 'Copied' : 'Copy to Clipboard'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
  }

  // 2. MANAGER VIEW (For Admins/Managers) - Roster View
  return (
    <div className="p-6 space-y-6 animate-fade-in pb-20">
      <div className="flex justify-between items-end border-b border-zinc-800 pb-6">
        <div>
            <h2 className="text-3xl font-bold text-white mb-2 font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-3">
                <Shield size={32} className="text-orange-500" />
                Unit Roster & Performance
            </h2>
            <p className="text-zinc-500 font-mono text-sm">Personnel analysis and workload distribution.</p>
        </div>
        <button 
            onClick={handleTeamAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-4 py-2 bg-purple-900/30 border border-purple-500/50 text-purple-300 hover:bg-purple-900/50 transition-all uppercase font-bold tracking-wider font-['Chakra_Petch'] disabled:opacity-50"
        >
            {isAnalyzing ? <Loader2 className="animate-spin" /> : <Brain size={18} />}
            {teamInsights ? 'Refresh Analysis' : 'Run Performance AI'}
        </button>
      </div>

      {/* AI Insights Panel */}
      {teamInsights && (
        <div className="bg-zinc-900/80 border border-purple-500/30 p-6 rounded-sm relative overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.1)]">
            <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
            <h3 className="text-purple-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2 font-['Chakra_Petch']">
                <Sparkles size={16} /> Tactical Assessment
            </h3>
            <p className="text-zinc-300 mb-6 font-mono text-sm leading-relaxed border-b border-zinc-800 pb-4">
                {teamInsights.overallAssessment}
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Unit Recommendations</h4>
                    <ul className="space-y-3">
                        {teamInsights.developerInsights.map((insight, idx) => (
                            <li key={idx} className="bg-black/40 p-3 border-l-2 border-zinc-700">
                                <div className="flex justify-between mb-1">
                                    <span className="text-orange-400 font-bold font-['Chakra_Petch']">{insight.name}</span>
                                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{insight.levelAssessment}</span>
                                </div>
                                <p className="text-xs text-zinc-400 mb-1">{insight.performanceNote}</p>
                                <p className="text-xs text-green-500 font-mono">→ {insight.suggestion}</p>
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                     <h4 className="text-xs text-zinc-500 uppercase tracking-widest mb-3">Strategic Directives</h4>
                     <ul className="space-y-2">
                        {teamInsights.strategicRecommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-zinc-300 font-mono">
                                <span className="text-purple-500 mt-1">▹</span> {rec}
                            </li>
                        ))}
                     </ul>
                </div>
            </div>
        </div>
      )}

      {/* Developer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devList.map((dev) => {
             const efficiency = dev.totalHoursAssigned > 0 ? Math.round((dev.totalHoursCompleted / dev.totalHoursAssigned) * 100) : 0;
             return (
                <div key={dev.name} className="bg-zinc-950 border border-zinc-800 p-5 hover:border-orange-500/30 transition-all group relative overflow-hidden">
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-900 border border-zinc-700 flex items-center justify-center text-zinc-400 font-bold text-lg rounded-sm shadow-inner">
                                {dev.name.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white font-['Chakra_Petch'] uppercase">{dev.name}</h3>
                                <p className="text-xs text-zinc-500 font-mono flex items-center gap-1">
                                    {efficiency > 80 ? <TrendingUp size={12} className="text-green-500"/> : <Activity size={12}/>}
                                    Eff. Rating: {efficiency}%
                                </p>
                            </div>
                        </div>
                        {dev.activeTasks > 3 && (
                            <div title="High Load">
                                <AlertTriangle size={16} className="text-orange-500 animate-pulse" />
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4 relative z-10">
                        <div className="bg-zinc-900/50 p-2 border border-zinc-800/50">
                            <p className="text-[10px] text-zinc-500 uppercase">Assigned</p>
                            <p className="text-xl font-bold text-white font-mono">{dev.totalTasks}</p>
                        </div>
                        <div className="bg-zinc-900/50 p-2 border border-zinc-800/50">
                            <p className="text-[10px] text-zinc-500 uppercase">Completed</p>
                            <p className="text-xl font-bold text-green-500 font-mono">{dev.completedTasks}</p>
                        </div>
                         <div className="bg-zinc-900/50 p-2 border border-zinc-800/50">
                            <p className="text-[10px] text-zinc-500 uppercase">Load (Hrs)</p>
                            <p className="text-xl font-bold text-orange-400 font-mono">{dev.totalHoursAssigned - dev.totalHoursCompleted}h</p>
                        </div>
                         <div className="bg-zinc-900/50 p-2 border border-zinc-800/50">
                            <p className="text-[10px] text-zinc-500 uppercase">Velocity</p>
                            <p className="text-xl font-bold text-cyan-500 font-mono">{dev.totalHoursCompleted}h</p>
                        </div>
                    </div>

                    {/* Specialty Tags */}
                    <div className="flex flex-wrap gap-1 relative z-10">
                        {Object.keys(dev.categories).map(cat => (
                            <span key={cat} className="text-[9px] uppercase px-1.5 py-0.5 border border-zinc-800 text-zinc-500 bg-zinc-900">
                                {cat}
                            </span>
                        ))}
                    </div>
                    
                    {/* Background decoration */}
                    <div className="absolute -bottom-4 -right-4 text-zinc-900/20 z-0">
                        <User size={120} />
                    </div>
                </div>
             )
        })}
      </div>

      {/* Workload Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-zinc-900/50 p-6 border border-zinc-800">
             <h3 className="text-zinc-400 font-bold uppercase tracking-widest mb-6 flex items-center gap-2 font-['Chakra_Petch']">
                <TrendingUp size={16} /> Hourly Workload Distribution
            </h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={workloadData} layout="vertical">
                        <XAxis type="number" stroke="#52525b" fontSize={10} />
                        <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={12} width={80} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#f4f4f5' }}
                            itemStyle={{ color: '#e4e4e7' }}
                            cursor={{fill: '#27272a'}} 
                        />
                        <Legend />
                        <Bar dataKey="completed" name="Hours Completed" stackId="a" fill="#22c55e" barSize={20} />
                        <Bar dataKey="remaining" name="Hours Remaining" stackId="a" fill="#ea580c" barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        <div className="bg-zinc-900/50 p-6 border border-zinc-800 flex flex-col justify-center items-center text-center">
            <div className="mb-4 p-4 rounded-full bg-zinc-800 text-orange-500">
                <Award size={32} />
            </div>
            <h3 className="text-xl text-white font-bold font-['Chakra_Petch'] uppercase mb-2">Top Performer</h3>
            {devList.length > 0 && (
                <>
                    <p className="text-3xl font-bold text-orange-500 font-mono mb-2">
                        {devList.reduce((prev, current) => (prev.totalHoursCompleted > current.totalHoursCompleted) ? prev : current).name}
                    </p>
                    <p className="text-zinc-500 text-sm max-w-xs">
                        Highest velocity recorded this cycle with highest completion rate.
                    </p>
                </>
            )}
        </div>
      </div>
    </div>
  );
};

export default TeamBoard;