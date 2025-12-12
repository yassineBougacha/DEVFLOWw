import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Task, TaskStatus, TaskCategory } from '../types';
import { CheckCircle, Clock, AlertCircle, Layout, Target, Activity, Cpu } from 'lucide-react';

interface DashboardProps {
  tasks: Task[];
}

// Action Vibe Colors
const COLORS = ['#f97316', '#06b6d4', '#22c55e', '#ef4444', '#a855f7'];

const Dashboard: React.FC<DashboardProps> = ({ tasks }) => {
  // Calculate Stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === TaskStatus.DONE).length;
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const statusData = [
    { name: 'Pending', value: tasks.filter(t => t.status === TaskStatus.TODO).length, color: '#52525b' },
    { name: 'Active', value: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length, color: '#3b82f6' },
    { name: 'Verify', value: tasks.filter(t => t.status === TaskStatus.REVIEW).length, color: '#f59e0b' },
    { name: 'Complete', value: tasks.filter(t => t.status === TaskStatus.DONE).length, color: '#22c55e' },
  ].filter(d => d.value > 0);

  const categoryData = Object.values(TaskCategory).map(cat => ({
    name: cat,
    value: tasks.filter(t => t.category === cat).length,
  })).filter(d => d.value > 0);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
            <h2 className="text-3xl font-bold text-white mb-1 font-['Chakra_Petch'] uppercase tracking-wider">Mission Overview</h2>
            <p className="text-zinc-500 font-mono text-sm">Real-time tactical analysis</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-950/30 border border-green-900 rounded-sm">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-green-500 text-xs font-mono font-bold tracking-widest">SYSTEM OPTIMAL</span>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 backdrop-blur p-4 border border-zinc-800 hover:border-orange-500/50 transition-colors group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            <Layout size={64} className="text-orange-500" />
          </div>
          <div className="flex items-center space-x-4 relative z-10">
            <div className="p-3 bg-zinc-800 border border-zinc-700 text-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.2)]">
              <Target size={24} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Total Objectives</p>
              <p className="text-3xl font-bold text-white font-['Chakra_Petch']">{totalTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur p-4 border border-zinc-800 hover:border-green-500/50 transition-colors group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            <CheckCircle size={64} className="text-green-500" />
          </div>
          <div className="flex items-center space-x-4 relative z-10">
            <div className="p-3 bg-zinc-800 border border-zinc-700 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
              <Activity size={24} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Successful</p>
              <p className="text-3xl font-bold text-white font-['Chakra_Petch']">{completedTasks}</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur p-4 border border-zinc-800 hover:border-cyan-500/50 transition-colors group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            <Clock size={64} className="text-cyan-500" />
          </div>
          <div className="flex items-center space-x-4 relative z-10">
            <div className="p-3 bg-zinc-800 border border-zinc-700 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
              <Cpu size={24} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Progress Rate</p>
              <p className="text-3xl font-bold text-white font-['Chakra_Petch']">{progress}%</p>
            </div>
          </div>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur p-4 border border-zinc-800 hover:border-red-500/50 transition-colors group relative overflow-hidden">
          <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertCircle size={64} className="text-red-500" />
          </div>
          <div className="flex items-center space-x-4 relative z-10">
            <div className="p-3 bg-zinc-800 border border-zinc-700 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              <AlertCircle size={24} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Critical Priority</p>
              <p className="text-3xl font-bold text-white font-['Chakra_Petch']">{tasks.filter(t => t.priority === 'HIGH' && t.status !== TaskStatus.DONE).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-zinc-900/80 p-6 border border-zinc-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-transparent"></div>
          <h3 className="text-lg font-bold text-zinc-200 mb-6 font-['Chakra_Petch'] uppercase tracking-wide flex items-center gap-2">
             <span className="w-1 h-4 bg-orange-500"></span> Status Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#f4f4f5' }}
                    itemStyle={{ color: '#e4e4e7' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-zinc-900/80 p-6 border border-zinc-800 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-transparent"></div>
          <h3 className="text-lg font-bold text-zinc-200 mb-6 font-['Chakra_Petch'] uppercase tracking-wide flex items-center gap-2">
             <span className="w-1 h-4 bg-cyan-500"></span> Category Analysis
          </h3>
          <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <XAxis dataKey="name" stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tick={{fill: '#a1a1aa'}} />
                <YAxis stroke="#52525b" fontSize={12} tickLine={false} axisLine={false} tick={{fill: '#a1a1aa'}} />
                <Tooltip 
                    cursor={{fill: '#27272a'}} 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#f4f4f5', borderRadius: '0px' }} 
                />
                <Bar dataKey="value" fill="#6366f1" barSize={40}>
                   {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
