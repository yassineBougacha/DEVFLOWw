import React, { useState } from 'react';
import { Task, TaskStatus, TaskCategory, Project } from '../types';
import { MoreHorizontal, Plus, Tag, Calendar, AlertTriangle, Folder, FolderPlus, Target, Activity, GripVertical, Clock, Timer, Zap, Eye, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface TaskBoardProps {
  tasks: Task[];
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (name: string, description: string) => void;
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  onNewTask: () => void;
  onDeleteTask: (taskId: string) => void;
}

const StatusColumn: React.FC<{
  title: string;
  status: TaskStatus;
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  borderColor: string;
  canDelete: boolean;
}> = ({ title, status, tasks, onStatusChange, onEditTask, onDeleteTask, borderColor, canDelete }) => {
  const { user } = useAuth();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
        onStatusChange(taskId, status);
    }
  };

  return (
    <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex flex-col h-full min-w-[320px] w-full bg-zinc-900/50 border transition-all duration-200 rounded-sm p-4 relative overflow-hidden
            ${isDragOver ? 'border-orange-500 bg-zinc-900/80 shadow-[inset_0_0_20px_rgba(234,88,12,0.1)]' : 'border-zinc-800'}
        `}
    >
      {/* Top Accent Line */}
      <div className={`absolute top-0 left-0 w-full h-1 ${borderColor}`}></div>
      
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800">
        <h3 className="font-bold text-zinc-100 font-['Chakra_Petch'] uppercase tracking-wider text-sm">{title}</h3>
        <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-1 font-mono">{tasks.length}</span>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
        {tasks.map(task => {
          // Permission Logic
          // 1. Check if user matches assignee (Fuzzy match on first name due to mock data structure)
          const isAssignee = user?.name && task.assignee.toLowerCase().includes(user.name.split(' ')[0].toLowerCase());
          
          // 2. Can Drag: Admins/Managers ALWAYS, Employees ONLY if assigned
          const canDrag = user?.role !== 'EMPLOYEE' || isAssignee;
          
          // 3. Can Edit Info: Only Admins/Managers
          const canEditInfo = user?.role !== 'EMPLOYEE';

          return (
            <div 
              key={task.id} 
              draggable={canDrag}
              onDragStart={(e) => canDrag && handleDragStart(e, task.id)}
              className={`bg-zinc-950 p-4 border border-zinc-800 transition-all group relative shadow-lg 
                ${canDrag 
                    ? 'hover:border-orange-500/50 hover:shadow-orange-900/10 hover:-translate-y-1 cursor-grab active:cursor-grabbing' 
                    : 'opacity-80 cursor-not-allowed border-zinc-900'
                }
              `}
            >
              {/* Priority Strip */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  task.priority === 'HIGH' ? 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]' : 
                  task.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-600'
              }`}></div>
              
              <div className="pl-3">
                  <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 border uppercase tracking-wider font-mono
                      ${task.category === TaskCategory.API ? 'border-purple-500/50 text-purple-400 bg-purple-950/20' : 
                      task.category === TaskCategory.FRONTEND ? 'border-cyan-500/50 text-cyan-400 bg-cyan-950/20' :
                      'border-zinc-600 text-zinc-400 bg-zinc-900'
                      }`}>
                      {task.category}
                  </span>
                  <div className="flex space-x-1 items-center">
                      {/* Grip Handle / Lock Indicator */}
                      {canDrag ? (
                        <GripVertical size={14} className="text-zinc-700 group-hover:text-zinc-500 mr-1" />
                      ) : (
                        <Lock size={12} className="text-zinc-800 mr-1" />
                      )}
                      
                      <button 
                        onClick={() => onEditTask(task)}
                        className="text-zinc-600 hover:text-orange-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title={canEditInfo ? "Edit Task" : "View Details"}
                      >
                        {canEditInfo ? <MoreHorizontal size={16} /> : <Eye size={16} />}
                      </button>
                      
                      {canDelete && (
                          <button 
                          onClick={() => onDeleteTask(task.id)}
                          className="text-zinc-600 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                          <span className="text-xs font-bold font-mono">X</span>
                          </button>
                      )}
                  </div>
                  </div>
                  
                  <h4 className="font-bold text-zinc-200 mb-2 leading-tight font-['Chakra_Petch'] text-sm">{task.title}</h4>
                  <p className="text-xs text-zinc-500 line-clamp-2 mb-3 font-mono">{task.description}</p>
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-900">
                  <div className="flex items-center space-x-3">
                      <span className="text-xs text-zinc-500 flex items-center font-mono">
                          <Calendar size={10} className="mr-1 text-zinc-600" />
                          {new Date(task.createdAt).toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' })}
                      </span>
                      <span className={`text-xs flex items-center font-mono ${task.estimatedHours > 8 ? 'text-orange-400' : 'text-zinc-500'}`}>
                          <Clock size={10} className="mr-1" />
                          {task.estimatedHours}h
                      </span>
                      {task.priority === 'HIGH' && <AlertTriangle size={12} className="text-red-500 animate-pulse" />}
                  </div>

                  {canDrag ? (
                      <select 
                        value={task.status} 
                        onChange={(e) => onStatusChange(task.id, e.target.value as TaskStatus)}
                        className="text-[10px] uppercase font-bold border border-zinc-700 bg-zinc-900 text-zinc-400 focus:outline-none focus:border-orange-500 cursor-pointer py-0.5 px-1 font-mono"
                    >
                        {Object.values(TaskStatus).map(s => (
                        <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                  ) : (
                      <span className="text-[10px] uppercase font-bold text-zinc-600 font-mono bg-zinc-950 border border-zinc-900 px-2 py-0.5">
                          {task.status}
                      </span>
                  )}
                  </div>
              </div>
            </div>
          );
        })}
        
        {tasks.length === 0 && (
          <div className={`text-center py-12 border border-dashed ${isDragOver ? 'border-orange-500/50 bg-orange-500/5' : 'border-zinc-800 bg-zinc-900/20'} transition-colors`}>
            <p className="text-xs text-zinc-600 font-mono uppercase">Sector Clear</p>
          </div>
        )}
      </div>
    </div>
  );
}

const CreateProjectModal: React.FC<{
    isOpen: boolean; 
    onClose: () => void; 
    onCreate: (name: string, description: string) => void 
}> = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate(name, desc);
        setName('');
        setDesc('');
        onClose();
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-700 w-full max-w-md p-6 shadow-2xl">
                 <h2 className="text-xl font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider mb-4">Initialize Mission</h2>
                 <form onSubmit={handleSubmit} className="space-y-4">
                     <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1 font-mono uppercase">Mission Codename</label>
                        <input 
                            value={name} onChange={e => setName(e.target.value)} required 
                            className="w-full px-4 py-2 bg-black border border-zinc-700 text-white focus:border-orange-500 font-mono"
                            placeholder="e.g. PROJECT TITAN"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1 font-mono uppercase">Briefing</label>
                        <textarea 
                            value={desc} onChange={e => setDesc(e.target.value)} required 
                            className="w-full px-4 py-2 bg-black border border-zinc-700 text-white focus:border-orange-500 font-mono"
                            rows={3}
                            placeholder="Objective details..."
                        />
                     </div>
                     <div className="flex justify-end gap-2 pt-2">
                         <button type="button" onClick={onClose} className="px-4 py-2 text-zinc-500 hover:text-white font-mono uppercase text-xs">Abort</button>
                         <button type="submit" className="px-4 py-2 bg-orange-600 text-black font-bold hover:bg-orange-500 font-['Chakra_Petch'] uppercase tracking-wider">Deploy</button>
                     </div>
                 </form>
            </div>
        </div>
    )
}

const TaskBoard: React.FC<TaskBoardProps> = ({ 
    tasks, 
    projects,
    activeProjectId,
    onSelectProject,
    onCreateProject,
    onStatusChange, 
    onEditTask, 
    onNewTask, 
    onDeleteTask 
}) => {
  const { user } = useAuth();
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  
  const canDelete = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canCreateProject = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canCreateTask = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const activeProject = projects.find(p => p.id === activeProjectId);
  const projectTasks = tasks.filter(t => t.projectId === activeProjectId);

  // Time Estimations
  const totalHours = projectTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
  const completedHours = projectTasks.filter(t => t.status === TaskStatus.DONE).reduce((acc, t) => acc + (t.estimatedHours || 0), 0);
  const remainingHours = totalHours - completedHours;
  const estimatedDays = Math.ceil(remainingHours / 8); // Assuming 8h work days

  return (
    <div className="flex h-full">
      {/* Project Sidebar */}
      <div className="w-64 bg-black border-r border-zinc-900 flex flex-col">
         <div className="p-4 border-b border-zinc-900">
             <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest font-mono mb-2">Active Missions</h3>
             {canCreateProject && (
                 <button 
                    onClick={() => setIsProjectModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-orange-500 border border-zinc-800 hover:border-orange-500/50 transition-all text-xs font-bold uppercase tracking-wider font-['Chakra_Petch']"
                 >
                     <FolderPlus size={14} /> Initialize New
                 </button>
             )}
         </div>
         <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
             {projects.map(project => (
                 <button
                    key={project.id}
                    onClick={() => onSelectProject(project.id)}
                    className={`w-full text-left p-3 border-l-2 transition-all group ${
                        activeProjectId === project.id 
                        ? 'bg-zinc-900 border-orange-500' 
                        : 'bg-transparent border-transparent hover:bg-zinc-900/50 hover:border-zinc-700'
                    }`}
                 >
                     <div className="flex items-center justify-between mb-1">
                         <span className={`font-bold font-['Chakra_Petch'] uppercase text-sm ${
                             activeProjectId === project.id ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'
                         }`}>{project.name}</span>
                         {activeProjectId === project.id && <Activity size={12} className="text-green-500 animate-pulse"/>}
                     </div>
                     <p className="text-[10px] text-zinc-600 truncate font-mono uppercase">{project.description}</p>
                 </button>
             ))}
         </div>
      </div>

      {/* Main Board */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black relative">
        <div className="p-6 pb-2 flex justify-between items-start relative z-10 border-b border-zinc-800/50">
            <div>
                 <div className="flex items-center gap-2 mb-1">
                    <Target size={20} className="text-orange-500" />
                    <h2 className="text-2xl font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider">{activeProject?.name}</h2>
                 </div>
                 <p className="text-zinc-500 text-sm font-mono max-w-xl mb-4">{activeProject?.description}</p>
                 
                 {/* Project HUD */}
                 <div className="flex items-center gap-4 bg-zinc-900/50 border border-zinc-800 p-2 rounded-sm inline-flex">
                    <div className="flex items-center gap-2 px-2 border-r border-zinc-800">
                        <Zap size={16} className="text-yellow-500" />
                        <div>
                             <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Scope</p>
                             <p className="text-sm font-mono text-zinc-200">{totalHours}h</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-2 border-r border-zinc-800">
                        <Clock size={16} className="text-orange-500" />
                        <div>
                             <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Remaining</p>
                             <p className="text-sm font-mono text-orange-200">{remainingHours}h</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-2">
                        <Timer size={16} className="text-cyan-500" />
                        <div>
                             <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">ETA</p>
                             <p className="text-sm font-mono text-cyan-200">~{estimatedDays} Days</p>
                        </div>
                    </div>
                 </div>
            </div>
            {canCreateTask && (
                <button 
                onClick={onNewTask}
                className="flex items-center bg-orange-600 hover:bg-orange-500 text-black px-4 py-2 font-bold font-['Chakra_Petch'] uppercase tracking-wide transition-colors shadow-[0_0_15px_rgba(234,88,12,0.4)] mt-2"
                >
                <Plus size={18} className="mr-2" />
                Add Objective
                </button>
            )}
        </div>
        
        <div className="flex-1 overflow-x-auto p-6 pt-4 relative z-10">
            <div className="flex gap-6 min-w-max h-full pb-4">
            <StatusColumn 
                title="Intel / Todo" 
                status={TaskStatus.TODO} 
                tasks={projectTasks.filter(t => t.status === TaskStatus.TODO)} 
                onStatusChange={onStatusChange}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                borderColor="bg-zinc-600"
                canDelete={canDelete}
            />
            <StatusColumn 
                title="Engaged / In Progress" 
                status={TaskStatus.IN_PROGRESS} 
                tasks={projectTasks.filter(t => t.status === TaskStatus.IN_PROGRESS)} 
                onStatusChange={onStatusChange}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                borderColor="bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                canDelete={canDelete}
            />
            <StatusColumn 
                title="Analysis / Review" 
                status={TaskStatus.REVIEW} 
                tasks={projectTasks.filter(t => t.status === TaskStatus.REVIEW)} 
                onStatusChange={onStatusChange}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                borderColor="bg-yellow-500"
                canDelete={canDelete}
            />
            <StatusColumn 
                title="Complete / Done" 
                status={TaskStatus.DONE} 
                tasks={projectTasks.filter(t => t.status === TaskStatus.DONE)} 
                onStatusChange={onStatusChange}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                borderColor="bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                canDelete={canDelete}
            />
            </div>
        </div>
      </div>

      <CreateProjectModal 
        isOpen={isProjectModalOpen} 
        onClose={() => setIsProjectModalOpen(false)} 
        onCreate={onCreateProject} 
      />
    </div>
  );
};

export default TaskBoard;