import React, { useState, useEffect } from 'react';
import { User, Project, Task } from '../types';
import { dbService } from '../services/dbService';
import { Briefcase, Plus, Search, Filter, MoreHorizontal, Clock, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { safeFormat } from '../lib/dateUtils';
import Modal from './Modal';

export default function ProjectBoard({ user }: { user: User }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', clientId: '' });
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium' as any, deadline: '', status: 'todo' as any });
  const [clients, setClients] = useState<any[]>([]);

  useEffect(() => {
    const unsubProjects = dbService.subscribe('projects', (data) => {
      setProjects(data);
      if (data.length > 0 && !selectedProjectId) {
        setSelectedProjectId(data[0].id);
      }
      setLoading(false);
    });
    const unsubTasks = dbService.subscribe('tasks', (data) => setTasks(data));
    const unsubClients = dbService.subscribe('clients', (data) => setClients(data));

    return () => {
      unsubProjects();
      unsubTasks();
      unsubClients();
    };
  }, []);

  const projectTasks = tasks.filter(t => t.projectId === selectedProjectId);
  const columns = [
    { id: 'todo', label: 'To Do', icon: Clock, color: 'text-zinc-500' },
    { id: 'in_progress', label: 'In Progress', icon: AlertCircle, color: 'text-orange-500' },
    { id: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-emerald-500' },
  ];

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    await dbService.update('tasks', taskId, { status: newStatus });
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name || !newProject.clientId) return;
    const id = await dbService.create('projects', { ...newProject, status: 'active', createdAt: new Date().toISOString() });
    if (id) setSelectedProjectId(id);
    setIsProjectModalOpen(false);
    setNewProject({ name: '', clientId: '' });
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !selectedProjectId) return;
    await dbService.create('tasks', { 
      ...newTask, 
      projectId: selectedProjectId, 
      assigneeId: user.uid,
      createdAt: new Date().toISOString() 
    });
    setIsTaskModalOpen(false);
    setNewTask({ title: '', description: '', priority: 'medium', deadline: '', status: 'todo' });
  };

  const handleDeleteTask = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this task?')) {
      await dbService.delete('tasks', id);
    }
  };

  return (
    <div className="h-full flex flex-col p-8 space-y-8">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-zinc-500 text-sm">Track your ongoing marketing campaigns and tasks.</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={selectedProjectId || ''} 
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-700 transition-all"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button 
            onClick={() => setIsProjectModalOpen(true)}
            className="bg-white text-black px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-zinc-200 transition-colors"
          >
            <Plus size={18} />
            New Project
          </button>
        </div>
      </header>

      <div className="flex-1 flex gap-6 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div key={col.id} className="flex-1 min-w-[320px] bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <col.icon size={16} className={col.color} />
                <h3 className="font-semibold text-sm">{col.label}</h3>
                <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 font-bold">
                  {projectTasks.filter(t => t.status === col.id).length}
                </span>
              </div>
              <button className="text-zinc-500 hover:text-white transition-colors">
                <MoreHorizontal size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <AnimatePresence mode="popLayout">
                {projectTasks.filter(t => t.status === col.id).map((task, i) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl space-y-4 shadow-sm hover:border-zinc-700 transition-all cursor-grab active:cursor-grabbing group relative"
                    onClick={() => {
                      const nextStatus = col.id === 'todo' ? 'in_progress' : col.id === 'in_progress' ? 'completed' : 'todo';
                      updateTaskStatus(task.id, nextStatus);
                    }}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-medium leading-tight group-hover:text-white transition-colors pr-6">{task.title}</h4>
                        <div className="flex items-center gap-2">
                           <div className={cn(
                            "w-2 h-2 rounded-full",
                            task.priority === 'high' ? "bg-red-500" :
                            task.priority === 'medium' ? "bg-orange-500" :
                            "bg-emerald-500"
                          )} />
                          <button 
                            onClick={(e) => handleDeleteTask(task.id, e)}
                            className="text-zinc-700 hover:text-red-500 transition-colors p-1"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500 line-clamp-2">{task.description || 'No description provided.'}</p>
                    </div>

                    <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                        <Clock size={12} />
                        {task.deadline ? safeFormat(task.deadline, 'MMM d') : 'No deadline'}
                      </div>
                      <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-900 flex items-center justify-center text-[8px] font-bold uppercase">
                        {task.assigneeId ? user.name[0] : '?'}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              <button 
                onClick={() => {
                  setNewTask({ ...newTask, status: col.id as any });
                  setIsTaskModalOpen(true);
                }}
                className="w-full py-3 border border-dashed border-zinc-800 rounded-xl text-xs text-zinc-500 hover:text-white hover:border-zinc-700 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                Add Task
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* New Project Modal */}
      <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="New Project">
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Project Name</label>
            <input
              required
              type="text"
              value={newProject.name}
              onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              placeholder="e.g. Summer Campaign"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Client</label>
            <select
              required
              value={newProject.clientId}
              onChange={(e) => setNewProject({ ...newProject, clientId: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
            >
              <option value="">Select a client</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.brand})</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors mt-4">
            Create Project
          </button>
        </form>
      </Modal>

      {/* New Task Modal */}
      <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title="Add Task">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Task Title</label>
            <input
              required
              type="text"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              placeholder="e.g. Design assets"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Description</label>
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all h-24 resize-none"
              placeholder="Task details..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Priority</label>
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-zinc-500 uppercase font-mono tracking-widest">Deadline</label>
              <input
                type="date"
                value={newTask.deadline}
                onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-zinc-500 transition-all"
              />
            </div>
          </div>
          <button type="submit" className="w-full py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors mt-4">
            Add Task
          </button>
        </form>
      </Modal>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
