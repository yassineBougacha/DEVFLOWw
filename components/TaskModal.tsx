import React, { useState, useEffect } from 'react';
import { Task, TaskCategory, TaskStatus } from '../types';
import { generateTaskFromInput, estimateTaskEffort, generateTechPlan } from '../services/geminiService';
import { Sparkles, Loader2, X, Terminal, Clock, Calculator, Info, Lock, Code2, FileText, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id' | 'createdAt' | 'projectId'>) => void;
  taskToEdit?: Task;
  allTasks: Task[]; // New prop for training data
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, onSave, taskToEdit, allTasks }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>(TaskCategory.FRONTEND);
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>([]);
  const [estimatedHours, setEstimatedHours] = useState<number>(4);
  const [technicalPlan, setTechnicalPlan] = useState<string>('');
  
  // AI Generation State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [estimationReasoning, setEstimationReasoning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // View State
  const [viewMode, setViewMode] = useState<'details' | 'tech_plan'>('details');

  // Read Only Mode for Employees
  const isReadOnly = user?.role === 'EMPLOYEE';

  useEffect(() => {
    if (isOpen) {
        if (taskToEdit) {
            setTitle(taskToEdit.title);
            setDescription(taskToEdit.description);
            setCategory(taskToEdit.category);
            setPriority(taskToEdit.priority);
            setAssignee(taskToEdit.assignee);
            setStatus(taskToEdit.status);
            setAcceptanceCriteria(taskToEdit.acceptanceCriteria || []);
            setEstimatedHours(taskToEdit.estimatedHours || 4);
            setTechnicalPlan(taskToEdit.technicalPlan || '');
        } else {
            resetForm();
        }
        setViewMode('details');
    }
  }, [isOpen, taskToEdit]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory(TaskCategory.FRONTEND);
    setPriority('MEDIUM');
    setAssignee('');
    setStatus(TaskStatus.TODO);
    setAcceptanceCriteria([]);
    setEstimatedHours(4);
    setTechnicalPlan('');
    setAiPrompt('');
    setEstimationReasoning(null);
    setError(null);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    try {
      const generated = await generateTaskFromInput(aiPrompt);
      setTitle(generated.title);
      setDescription(generated.description);
      setCategory(generated.category as TaskCategory);
      setPriority(generated.priority as any);
      setAcceptanceCriteria(generated.acceptanceCriteria || []);
      setEstimatedHours(generated.estimatedHours || 4);
      setEstimationReasoning("Auto-generated based on task description.");
    } catch (err) {
      setError("AI Generation Failed. Check Uplink.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAiEstimate = async () => {
    if (!title && !description) {
        setError("Input Directive Title or Description first.");
        return;
    }
    setIsEstimating(true);
    setError(null);
    setEstimationReasoning(null);
    try {
        // Pass allTasks to simulate "training" the model with project history
        const result = await estimateTaskEffort(
            title || "Untitled Task", 
            description || "No description provided", 
            allTasks
        );
        
        if (result && result.estimatedHours) {
            setEstimatedHours(result.estimatedHours);
            if (result.reasoning) {
                setEstimationReasoning(result.reasoning);
            }
        }
    } catch (err) {
        setError("Estimation Calc Failed.");
    } finally {
        setIsEstimating(false);
    }
  };
  
  const handleGeneratePlan = async () => {
     if (!title && !description) {
        setError("Input Directive Title or Description first.");
        return;
    }
    setIsPlanning(true);
    try {
        const plan = await generateTechPlan(title, description);
        setTechnicalPlan(plan);
    } catch (err) {
        setError("Plan Generation Failed.");
    } finally {
        setIsPlanning(false);
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      description,
      category,
      priority,
      assignee,
      status,
      acceptanceCriteria,
      estimatedHours,
      technicalPlan
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-700 w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900 z-10">
          <h2 className="text-xl font-bold text-white font-['Chakra_Petch'] uppercase tracking-wider flex items-center gap-2">
            {isReadOnly ? <Lock size={20} className="text-zinc-500" /> : <Terminal size={20} className="text-orange-500" />}
            {taskToEdit ? (isReadOnly ? 'Objective Details' : 'Modify Directive') : 'New Objective'}
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-red-500 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-black/20">
            <button 
                onClick={() => setViewMode('details')}
                className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${viewMode === 'details' ? 'border-orange-500 text-white bg-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
                <div className="flex items-center justify-center gap-2">
                    <FileText size={14} /> Mission Brief
                </div>
            </button>
            <button 
                onClick={() => setViewMode('tech_plan')}
                className={`flex-1 py-3 text-xs uppercase font-bold tracking-wider transition-colors border-b-2 ${viewMode === 'tech_plan' ? 'border-cyan-500 text-white bg-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
            >
                 <div className="flex items-center justify-center gap-2">
                    <Code2 size={14} /> Technical Plan
                </div>
            </button>
        </div>

        {/* AI Section (Only for new tasks or explicit request AND if not read only, and ONLY on details tab) */}
        {!taskToEdit && !isReadOnly && viewMode === 'details' && (
          <div className="p-6 bg-zinc-950/50 border-b border-zinc-800">
            <label className="block text-xs font-bold text-orange-400 mb-2 font-mono uppercase tracking-widest">
              AI Auto-Completion
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Ex: 'Implement secure login protocol'"
                className="flex-1 px-4 py-2 bg-black border border-zinc-700 text-zinc-300 rounded-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 font-mono text-sm"
              />
              <button 
                onClick={handleAiGenerate}
                disabled={isGenerating || !aiPrompt}
                className="bg-zinc-800 border border-zinc-700 text-orange-400 px-4 py-2 font-bold hover:bg-zinc-700 hover:text-orange-300 disabled:opacity-50 font-['Chakra_Petch'] uppercase tracking-wide flex items-center justify-center min-w-[120px]"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={18} /> : (
                    <>
                        <Sparkles size={16} className="mr-2" />
                        Execute
                    </>
                )}
              </button>
            </div>
          </div>
        )}

        {error && <div className="px-6 pt-4 text-red-500 text-xs font-mono">{error}</div>}

        {/* Form Container */}
        <div className="overflow-y-auto custom-scrollbar flex-1">
            <form id="taskForm" onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* DETAILS TAB */}
            {viewMode === 'details' && (
                <div className="space-y-4 animate-fade-in">
                    <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1 font-mono uppercase">Title</label>
                    <input 
                        type="text" 
                        required
                        disabled={isReadOnly}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2 bg-black border border-zinc-700 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="Objective identifier"
                    />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1 font-mono uppercase">Category</label>
                        <select 
                        value={category}
                        disabled={isReadOnly}
                        onChange={(e) => setCategory(e.target.value as TaskCategory)}
                        className="w-full px-4 py-2 bg-black border border-zinc-700 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                        {Object.values(TaskCategory).map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1 font-mono uppercase">Priority Level</label>
                        <select 
                        value={priority}
                        disabled={isReadOnly}
                        onChange={(e) => setPriority(e.target.value as any)}
                        className="w-full px-4 py-2 bg-black border border-zinc-700 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">Critical</option>
                        </select>
                    </div>
                    </div>

                    <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1 font-mono uppercase">Description</label>
                    <textarea 
                        required
                        disabled={isReadOnly}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2 bg-black border border-zinc-700 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="Technical specifications..."
                    />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 mb-1 font-mono uppercase">Operative Assignee</label>
                            <input 
                                type="text" 
                                disabled={isReadOnly}
                                value={assignee}
                                onChange={(e) => setAssignee(e.target.value)}
                                className="w-full px-4 py-2 bg-black border border-zinc-700 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                placeholder="Ex: Agent Smith"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-zinc-500 mb-1 font-mono uppercase flex items-center gap-2">
                                <Clock size={12} /> Estimated Hours
                            </label>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-2">
                                    <input 
                                        type="number" 
                                        min="1"
                                        disabled={isReadOnly}
                                        value={estimatedHours}
                                        onChange={(e) => setEstimatedHours(Number(e.target.value))}
                                        className="w-full px-4 py-2 bg-black border border-zinc-700 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                    />
                                    {!isReadOnly && (
                                        <button
                                            type="button"
                                            onClick={handleAiEstimate}
                                            disabled={isEstimating || (!title && !description)}
                                            className="px-3 bg-zinc-800 border border-zinc-700 text-cyan-400 hover:text-cyan-300 hover:border-cyan-500/50 hover:bg-zinc-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[50px]"
                                            title="AI Estimate Time"
                                        >
                                            {isEstimating ? <Loader2 size={18} className="animate-spin" /> : <Calculator size={18} />}
                                        </button>
                                    )}
                                </div>
                                {estimationReasoning && (
                                    <div className="text-[10px] text-zinc-400 font-mono bg-zinc-900/50 p-2 border border-zinc-800 border-l-2 border-l-cyan-500">
                                        <span className="text-cyan-500 font-bold flex items-center gap-1 mb-1"><Info size={10}/> AI LOGIC:</span>
                                        {estimationReasoning}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {acceptanceCriteria.length > 0 && (
                    <div className="bg-black/40 p-4 border border-zinc-800">
                        <label className="block text-xs font-bold text-green-500 uppercase tracking-wide mb-2 font-mono">Success Criteria</label>
                        <ul className="list-disc list-inside space-y-1">
                        {acceptanceCriteria.map((ac, idx) => (
                            <li key={idx} className="text-sm text-zinc-400 font-mono">{ac}</li>
                        ))}
                        </ul>
                    </div>
                    )}
                </div>
            )}

            {/* TECH PLAN TAB */}
            {viewMode === 'tech_plan' && (
                <div className="space-y-4 animate-fade-in h-full flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-zinc-500 text-xs font-mono uppercase">
                            AI-Generated Implementation Strategy
                        </p>
                        {!isReadOnly && (
                             <button
                                type="button"
                                onClick={handleGeneratePlan}
                                disabled={isPlanning}
                                className="px-3 py-1 bg-cyan-900/30 border border-cyan-500/50 text-cyan-300 hover:bg-cyan-900/50 text-xs font-bold uppercase flex items-center gap-2"
                            >
                                {isPlanning ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                Generate Plan
                            </button>
                        )}
                    </div>
                    
                    <textarea 
                        value={technicalPlan}
                        onChange={(e) => setTechnicalPlan(e.target.value)}
                        disabled={isReadOnly}
                        className="flex-1 w-full min-h-[300px] bg-zinc-950 p-4 font-mono text-sm text-zinc-300 border border-zinc-800 focus:border-cyan-500 focus:outline-none resize-none leading-relaxed custom-scrollbar"
                        placeholder={isPlanning ? "Generating tactical analysis..." : "No technical plan data. Initiate AI generation to create a strategy."}
                    />
                </div>
            )}
            
            </form>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-zinc-800 bg-zinc-900 z-10">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-2 text-zinc-500 font-bold hover:text-zinc-300 transition-colors mr-2 uppercase tracking-wide font-['Chakra_Petch']"
            >
              Close
            </button>
            {!isReadOnly && (
                <button 
                onClick={(e) => {
                    const form = document.getElementById('taskForm') as HTMLFormElement;
                    if (form) form.requestSubmit();
                }}
                disabled={isPlanning}
                className="px-6 py-2 bg-orange-600 text-black font-bold hover:bg-orange-500 transition-colors shadow-[0_0_15px_rgba(234,88,12,0.3)] uppercase tracking-wide font-['Chakra_Petch'] disabled:opacity-50"
                >
                {taskToEdit ? 'Update Data' : 'Initialize'}
                </button>
            )}
        </div>

      </div>
    </div>
  );
};

export default TaskModal;