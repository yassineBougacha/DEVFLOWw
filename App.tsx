import React, { useState, useEffect } from 'react';
import { LayoutDashboard, KanbanSquare, MessageSquare, Settings, LogOut, Loader2, Activity, Zap, Users, Video, Radio } from 'lucide-react';
import Dashboard from './components/Dashboard';
import TaskBoard from './components/TaskBoard';
import TeamBoard from './components/TeamBoard';
import MeetingRoom from './components/MeetingRoom';
import TaskModal from './components/TaskModal';
import Login from './components/Login';
import { Task, TaskStatus, TaskCategory, AIMessage, Project, MeetingSession, LiveMeeting } from './types';
import { chatWithTechLead } from './services/geminiService';
import { useAuth } from './contexts/AuthContext';

// Mock Initial Projects with Realistic Scenarios
const INITIAL_PROJECTS: Project[] = [
  { id: 'p1', name: 'E-Commerce Replatform', description: 'Migrating legacy monolith to Next.js and Microservices.' },
  { id: 'p2', name: 'Mobile App v2.0', description: 'Complete redesign of the customer loyalty mobile application.' },
  { id: 'p3', name: 'Internal Admin Dashboard', description: 'Back-office tools for inventory and user management.' },
];

// Mock Initial Data with Realistic Tasks
const INITIAL_TASKS: Task[] = [
  // Project 1: E-Commerce
  {
    id: 't1',
    projectId: 'p1',
    title: 'Product Listing Page (PLP)',
    description: 'Implement grid layout with filtering and sorting for products.',
    status: TaskStatus.DONE,
    category: TaskCategory.FRONTEND,
    assignee: 'Sarah',
    priority: 'HIGH',
    acceptanceCriteria: ['Filters work', 'Responsive grid', 'Load more pagination'],
    estimatedHours: 12,
    createdAt: Date.now() - 200000000
  },
  {
    id: 't2',
    projectId: 'p1',
    title: 'Checkout API Integration',
    description: 'Integrate Stripe Payment Intents API for secure checkout.',
    status: TaskStatus.IN_PROGRESS,
    category: TaskCategory.API,
    assignee: 'Mike',
    priority: 'HIGH',
    acceptanceCriteria: ['Payment intent created', 'Webhook handler setup'],
    estimatedHours: 8,
    createdAt: Date.now() - 100000000
  },
  {
    id: 't3',
    projectId: 'p1',
    title: 'CI/CD Pipeline Setup',
    description: 'Configure GitHub Actions for automated testing and deployment to AWS.',
    status: TaskStatus.REVIEW,
    category: TaskCategory.DEVOPS,
    assignee: 'Yassine',
    priority: 'HIGH',
    acceptanceCriteria: ['Build passes', 'Tests run', 'Deploys to staging'],
    estimatedHours: 6,
    createdAt: Date.now() - 50000000
  },
  {
    id: 't4',
    projectId: 'p1',
    title: 'Redis Caching Layer',
    description: 'Implement caching for frequent product API queries to reduce DB load.',
    status: TaskStatus.TODO,
    category: TaskCategory.API,
    assignee: 'Mike',
    priority: 'MEDIUM',
    acceptanceCriteria: ['Cache hit ratio > 80%', 'TTL configured'],
    estimatedHours: 4,
    createdAt: Date.now()
  },

  // Project 2: Mobile App
  {
    id: 't5',
    projectId: 'p2',
    title: 'Biometric Authentication',
    description: 'Implement FaceID/TouchID login using native modules.',
    status: TaskStatus.TODO,
    category: TaskCategory.FRONTEND,
    assignee: 'Sarah',
    priority: 'MEDIUM',
    acceptanceCriteria: ['FaceID works on iOS', 'Fallback to PIN'],
    estimatedHours: 5,
    createdAt: Date.now() - 10000000
  },
  {
    id: 't6',
    projectId: 'p2',
    title: 'Push Notification Service',
    description: 'Setup Firebase Cloud Messaging for marketing alerts.',
    status: TaskStatus.IN_PROGRESS,
    category: TaskCategory.API,
    assignee: 'Mike',
    priority: 'LOW',
    acceptanceCriteria: ['Token registration', 'Send endpoint works'],
    estimatedHours: 6,
    createdAt: Date.now() - 5000000
  },
  
  // Project 3: Admin Dashboard
  {
    id: 't7',
    projectId: 'p3',
    title: 'User Management Table',
    description: 'Create a data table with search and bulk actions for user administration.',
    status: TaskStatus.TODO,
    category: TaskCategory.FRONTEND,
    assignee: 'Mike',
    priority: 'LOW',
    acceptanceCriteria: ['Search by email', 'Bulk delete', 'Pagination'],
    estimatedHours: 4,
    createdAt: Date.now()
  },
  {
    id: 't8',
    projectId: 'p3',
    title: 'Inventory Analytics Charts',
    description: 'Visualize stock levels using Recharts bar and line charts.',
    status: TaskStatus.TODO,
    category: TaskCategory.FRONTEND,
    assignee: 'Sarah',
    priority: 'MEDIUM',
    acceptanceCriteria: ['Bar chart for categories', 'Line chart for trends'],
    estimatedHours: 6,
    createdAt: Date.now()
  }
];

const App: React.FC = () => {
  const { user, logout, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'board' | 'team' | 'meet' | 'chat'>('dashboard');
  
  // Project State
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [activeProjectId, setActiveProjectId] = useState<string>(INITIAL_PROJECTS[0].id);
  
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | undefined>(undefined);
  
  // Meeting State
  const [meetingHistory, setMeetingHistory] = useState<MeetingSession[]>([]);
  const [liveMeeting, setLiveMeeting] = useState<LiveMeeting | null>(null);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState<AIMessage[]>([
    { role: 'model', text: 'Ready for duty. How can I assist with the mission objectives?', timestamp: Date.now() }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Update Page Title based on User Role
  useEffect(() => {
    if (user) {
        document.title = `DevFlow [${user.role}] | ${user.name}`;
    } else {
        document.title = 'DevFlow | Tactical Ops';
    }
  }, [user]);

  // Poll for Active Meeting (Simulating backend via LocalStorage)
  useEffect(() => {
    const checkMeeting = () => {
        const stored = localStorage.getItem('devflow_live_meeting');
        if (stored) {
            setLiveMeeting(JSON.parse(stored));
        } else {
            setLiveMeeting(null);
        }
    };
    checkMeeting(); // Initial check
    const interval = setInterval(checkMeeting, 1000); // Poll every 1s for better responsiveness
    return () => clearInterval(interval);
  }, []);

  // Meeting Handlers
  const handleStartLiveMeeting = (topic: string) => {
      if (!user) return;
      const meeting: LiveMeeting = {
          id: Math.random().toString(36).substr(2, 9),
          hostId: user.id,
          hostName: user.name,
          topic: topic,
          startTime: Date.now(),
          isActive: true,
          participants: [user.name]
      };
      setLiveMeeting(meeting);
      localStorage.setItem('devflow_live_meeting', JSON.stringify(meeting));
  };

  const handleJoinLiveMeeting = () => {
      if (!user || !liveMeeting) return;
      const updatedMeeting = { ...liveMeeting };
      if (!updatedMeeting.participants.includes(user.name)) {
          updatedMeeting.participants.push(user.name);
          setLiveMeeting(updatedMeeting);
          localStorage.setItem('devflow_live_meeting', JSON.stringify(updatedMeeting));
      }
  };

  const handleStopLiveMeeting = () => {
      setLiveMeeting(null);
      localStorage.removeItem('devflow_live_meeting');
  };

  // Project Handlers
  const handleCreateProject = (name: string, description: string) => {
    const newProject: Project = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        description
    };
    setProjects(prev => [...prev, newProject]);
    setActiveProjectId(newProject.id);
  };

  // Task Handlers
  const handleSaveTask = (taskData: Omit<Task, 'id' | 'createdAt' | 'projectId'>) => {
    if (taskToEdit) {
      setTasks(prev => prev.map(t => t.id === taskToEdit.id ? { ...t, ...taskData } : t));
    } else {
      const newTask: Task = {
        ...taskData,
        id: Math.random().toString(36).substr(2, 9),
        projectId: activeProjectId,
        createdAt: Date.now(),
      };
      setTasks(prev => [...prev, newTask]);
    }
    setTaskToEdit(undefined);
  };

  const handleDeleteTask = (taskId: string) => {
    if (user?.role === 'EMPLOYEE') {
      alert("Clearance Level Insufficient: Cannot delete objectives.");
      return;
    }
    if (confirm('Confirm protocol: Delete this objective?')) {
        setTasks(prev => prev.filter(t => t.id !== taskId));
    }
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const openNewTaskModal = () => {
    setTaskToEdit(undefined);
    setIsModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setTaskToEdit(task);
    setIsModalOpen(true);
  };

  // Chat Handlers
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg: AIMessage = { role: 'user', text: chatInput, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const history = chatMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      let contextPrompt = chatInput;
      if (chatInput.toLowerCase().includes('status') || chatInput.toLowerCase().includes('tasks')) {
        const activeProjectName = projects.find(p => p.id === activeProjectId)?.name || 'Unknown Project';
        const projectTasks = tasks.filter(t => t.projectId === activeProjectId);
        const remainingHours = projectTasks.filter(t => t.status !== 'DONE').reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
        
        const summary = `Mission: ${activeProjectName}. Status: ${projectTasks.length} objectives. ${projectTasks.filter(t => t.status === 'DONE').length} completed. Estimated Remaining Work: ${remainingHours} hours.`;
        contextPrompt = `${summary}\n\nOperative Query: ${chatInput}`;
      }

      const responseText = await chatWithTechLead(history, contextPrompt);
      
      if (responseText) {
          setChatMessages(prev => [...prev, { role: 'model', text: responseText, timestamp: Date.now() }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'model', text: "Connection interrupted. Secure link failed.", timestamp: Date.now() }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  if (isLoading) {
    return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-zinc-950 text-orange-500">
            <Activity className="animate-pulse mb-4" size={48} />
            <div className="text-xl font-['Chakra_Petch'] tracking-widest uppercase">Initializing System...</div>
        </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden text-zinc-300">
      {/* Sidebar */}
      <aside className="w-72 bg-black border-r border-zinc-800 flex flex-col hidden md:flex relative z-20">
        <div className="p-6 border-b border-zinc-900 flex items-center gap-3">
             <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded flex items-center justify-center shadow-[0_0_15px_rgba(234,88,12,0.5)]">
                <Zap className="text-white" size={20} />
            </div>
            <div>
                 <h1 className="text-2xl font-bold text-white tracking-wider font-['Chakra_Petch']">DEV<span className="text-orange-500">FLOW</span></h1>
                 <div className="text-[10px] text-zinc-500 tracking-[0.2em] uppercase">Tactical Ops</div>
            </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm border-l-2 transition-all duration-300 group
            ${activeTab === 'dashboard' 
                ? 'bg-zinc-900 border-orange-500 text-orange-400 shadow-[inset_0_0_20px_rgba(249,115,22,0.1)]' 
                : 'border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 hover:border-zinc-700'}`}
          >
            <LayoutDashboard size={20} className={activeTab === 'dashboard' ? 'animate-pulse' : ''} />
            <span className="font-medium tracking-wide">Command Center</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('board')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm border-l-2 transition-all duration-300 group
            ${activeTab === 'board' 
                ? 'bg-zinc-900 border-orange-500 text-orange-400 shadow-[inset_0_0_20px_rgba(249,115,22,0.1)]' 
                : 'border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 hover:border-zinc-700'}`}
          >
            <KanbanSquare size={20} className={activeTab === 'board' ? 'animate-pulse' : ''} />
            <span className="font-medium tracking-wide">Operations Board</span>
          </button>

           <button 
            onClick={() => setActiveTab('team')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm border-l-2 transition-all duration-300 group
            ${activeTab === 'team' 
                ? 'bg-zinc-900 border-orange-500 text-orange-400 shadow-[inset_0_0_20px_rgba(249,115,22,0.1)]' 
                : 'border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 hover:border-zinc-700'}`}
          >
            <Users size={20} className={activeTab === 'team' ? 'animate-pulse' : ''} />
            <span className="font-medium tracking-wide">Personnel</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('meet')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm border-l-2 transition-all duration-300 group
            ${activeTab === 'meet' 
                ? 'bg-zinc-900 border-orange-500 text-orange-400 shadow-[inset_0_0_20px_rgba(249,115,22,0.1)]' 
                : 'border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 hover:border-zinc-700'}`}
          >
            <Video size={20} className={activeTab === 'meet' ? 'animate-pulse' : ''} />
            <span className="font-medium tracking-wide">Live Ops</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('chat')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-sm border-l-2 transition-all duration-300 group
            ${activeTab === 'chat' 
                ? 'bg-zinc-900 border-orange-500 text-orange-400 shadow-[inset_0_0_20px_rgba(249,115,22,0.1)]' 
                : 'border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 hover:border-zinc-700'}`}
          >
            <MessageSquare size={20} className={activeTab === 'chat' ? 'animate-pulse' : ''} />
            <span className="font-medium tracking-wide">Intel Uplink</span>
          </button>
        </nav>

        <div className="p-4 border-t border-zinc-900 bg-black/50">
           <div className="flex items-center gap-3 mb-4 px-2 p-2 rounded border border-zinc-800 bg-zinc-900/50">
                <div className="relative">
                    <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-sm bg-zinc-800 grayscale contrast-125" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-black rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-200 truncate font-['Chakra_Petch']">{user.name}</p>
                    <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></span>
                        <p className="text-[10px] text-orange-500 truncate uppercase tracking-widest">{user.role}</p>
                    </div>
                </div>
           </div>
          
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs uppercase tracking-widest text-red-500 hover:text-red-400 hover:bg-red-950/30 border border-red-900/30 hover:border-red-500/50 rounded-sm transition-all"
          >
            <LogOut size={14} />
            <span>Abort Session</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black relative">
        {/* Grid Background Effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>

        {/* Global Alerts */}
        {liveMeeting && liveMeeting.isActive && activeTab !== 'meet' && (
            <div className="bg-red-950/90 border-b border-red-500 p-3 flex justify-between items-center relative z-40 animate-slide-in-top">
                <div className="flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                    <span className="text-white font-bold font-['Chakra_Petch'] uppercase tracking-wide text-sm">
                        ALERT: Active Meeting "{liveMeeting.topic}" (Host: {liveMeeting.hostName})
                    </span>
                </div>
                <button 
                    onClick={() => setActiveTab('meet')}
                    className="px-4 py-1 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors"
                >
                    Join Now
                </button>
            </div>
        )}

        {/* Mobile Header */}
        <header className="md:hidden bg-zinc-900 border-b border-zinc-800 p-4 flex justify-between items-center z-30">
            <h1 className="font-bold text-white font-['Chakra_Petch']">DEV<span className="text-orange-500">FLOW</span></h1>
            <div className="flex gap-4 items-center">
                <button onClick={() => setActiveTab('dashboard')} className={activeTab === 'dashboard' ? 'text-orange-500' : 'text-zinc-500'}><LayoutDashboard size={24}/></button>
                <button onClick={() => setActiveTab('board')} className={activeTab === 'board' ? 'text-orange-500' : 'text-zinc-500'}><KanbanSquare size={24}/></button>
                <button onClick={() => setActiveTab('team')} className={activeTab === 'team' ? 'text-orange-500' : 'text-zinc-500'}><Users size={24}/></button>
                <button onClick={() => setActiveTab('meet')} className={`${activeTab === 'meet' ? 'text-orange-500' : 'text-zinc-500'} ${liveMeeting?.isActive ? 'animate-pulse text-red-500' : ''}`}><Video size={24}/></button>
                <button onClick={() => setActiveTab('chat')} className={activeTab === 'chat' ? 'text-orange-500' : 'text-zinc-500'}><MessageSquare size={24}/></button>
                <img src={user.avatar} alt="Profile" className="w-8 h-8 rounded-sm grayscale ml-2" onClick={logout}/>
            </div>
        </header>

        <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar">
          {activeTab === 'dashboard' && <Dashboard tasks={tasks} />}
          
          {activeTab === 'board' && (
            <TaskBoard 
              tasks={tasks}
              projects={projects}
              activeProjectId={activeProjectId}
              onSelectProject={setActiveProjectId}
              onCreateProject={handleCreateProject} 
              onStatusChange={handleStatusChange} 
              onNewTask={openNewTaskModal}
              onEditTask={openEditTaskModal}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {activeTab === 'team' && (
            <TeamBoard 
              tasks={tasks} 
              onNavigateToTask={(projectId) => {
                setActiveProjectId(projectId);
                setActiveTab('board');
              }}
            />
          )}

          {activeTab === 'meet' && (
              <MeetingRoom 
                onEndMeeting={(session) => {
                    setMeetingHistory(prev => [session, ...prev]);
                }}
                previousSessions={meetingHistory}
                liveMeeting={liveMeeting}
                onStartLiveMeeting={handleStartLiveMeeting}
                onStopLiveMeeting={handleStopLiveMeeting}
                onJoinLiveMeeting={handleJoinLiveMeeting}
              />
          )}

          {activeTab === 'chat' && (
            <div className="h-full flex flex-col max-w-5xl mx-auto p-4 md:p-6">
              <div className="bg-zinc-900/80 backdrop-blur border border-zinc-800 flex-1 flex flex-col overflow-hidden rounded-sm shadow-2xl">
                <div className="p-4 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
                    <div>
                        <h2 className="font-bold text-orange-400 flex items-center gap-2 font-['Chakra_Petch'] text-lg">
                            <Activity size={20} /> AI TACTICAL ADVISOR
                        </h2>
                        <p className="text-xs text-zinc-500 uppercase tracking-wider">Operational Support & Intelligence</p>
                    </div>
                    <div className="flex gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <div className="text-[10px] text-green-500 font-mono">ONLINE</div>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-4 rounded-sm border ${
                        msg.role === 'user' 
                          ? 'bg-orange-950/30 border-orange-500/30 text-orange-100 ml-12' 
                          : 'bg-zinc-950 border-zinc-800 text-cyan-100 mr-12 shadow-[0_0_10px_rgba(0,0,0,0.5)]'
                      }`}>
                         <div className="text-[10px] uppercase tracking-widest mb-1 opacity-50 font-bold mb-2 block border-b border-white/10 pb-1">
                            {msg.role === 'user' ? 'OPERATIVE' : 'SYSTEM AI'}
                         </div>
                        <p className="text-sm whitespace-pre-wrap leading-relaxed font-mono">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-sm flex items-center gap-2">
                         <span className="text-xs font-mono text-cyan-500 animate-pulse">PROCESSING DATA STREAM...</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t border-zinc-800 bg-black/40">
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Enter command or query..."
                      className="flex-1 px-4 py-3 bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-mono placeholder-zinc-700"
                    />
                    <button 
                      type="submit" 
                      disabled={isChatLoading || !chatInput}
                      className="bg-orange-600 text-black px-4 font-bold hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-['Chakra_Petch'] uppercase tracking-wider"
                    >
                      Transmit
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <TaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveTask}
        taskToEdit={taskToEdit}
        allTasks={tasks}
      />
    </div>
  );
};

export default App;