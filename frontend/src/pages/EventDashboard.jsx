import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, Plus, Check, Clock, AlertTriangle, Users, 
    Calendar, ChevronDown, ChevronRight, Trash2, Edit2, 
    Save, UserPlus, Loader2, BarChart3, FileText, Settings
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { Progress } from '../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
    getEvent, getCategories, getTasks, getMembers, getEventStats,
    createTask, updateTask, deleteTask, createCategory, createMember,
    saveAsTemplate
} from '../lib/api';

const PHASES = [
    { id: 'antes', label: 'Antes', color: '#94A3B8' },
    { id: 'durante', label: 'Durante', color: '#F59E0B' },
    { id: 'apos', label: 'Após', color: '#10B981' }
];

const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pendente', color: '#94A3B8' },
    { value: 'in_progress', label: 'Em Andamento', color: '#F59E0B' },
    { value: 'completed', label: 'Concluído', color: '#10B981' }
];

export default function EventDashboard() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    
    const [event, setEvent] = useState(null);
    const [categories, setCategories] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [members, setMembers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activePhase, setActivePhase] = useState('antes');
    const [expandedCategories, setExpandedCategories] = useState({});
    
    // Dialog states
    const [showTaskDialog, setShowTaskDialog] = useState(false);
    const [showCategoryDialog, setShowCategoryDialog] = useState(false);
    const [showMemberDialog, setShowMemberDialog] = useState(false);
    const [showAssignDialog, setShowAssignDialog] = useState(false);
    const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
    
    // Form states
    const [editingTask, setEditingTask] = useState(null);
    const [newTask, setNewTask] = useState({ title: '', description: '', category: '', phase: 'antes', due_date: null });
    const [newCategory, setNewCategory] = useState({ name: '', phase: 'antes' });
    const [newMember, setNewMember] = useState({ name: '', role: '' });
    const [templateName, setTemplateName] = useState('');
    const [assigningTask, setAssigningTask] = useState(null);
    const [saving, setSaving] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [eventRes, categoriesRes, tasksRes, membersRes, statsRes] = await Promise.all([
                getEvent(eventId),
                getCategories(eventId),
                getTasks(eventId),
                getMembers(eventId),
                getEventStats(eventId)
            ]);
            
            setEvent(eventRes.data);
            setCategories(categoriesRes.data);
            setTasks(tasksRes.data);
            setMembers(membersRes.data);
            setStats(statsRes.data);
            
            // Expand all categories by default
            const expanded = {};
            categoriesRes.data.forEach(cat => {
                expanded[cat.id] = true;
            });
            setExpandedCategories(expanded);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Erro ao carregar dados do evento');
        } finally {
            setLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [eventId]);

    const toggleCategory = (categoryId) => {
        setExpandedCategories(prev => ({
            ...prev,
            [categoryId]: !prev[categoryId]
        }));
    };

    const handleTaskStatusChange = async (task, newStatus) => {
        try {
            await updateTask(eventId, task.id, { status: newStatus });
            setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
            // Refresh stats
            const statsRes = await getEventStats(eventId);
            setStats(statsRes.data);
            toast.success('Status atualizado');
        } catch (error) {
            console.error('Error updating task:', error);
            toast.error('Erro ao atualizar status');
        }
    };

    const handleCreateTask = async () => {
        if (!newTask.title.trim() || !newTask.category) {
            toast.error('Título e categoria são obrigatórios');
            return;
        }
        try {
            setSaving(true);
            const taskData = {
                ...newTask,
                due_date: newTask.due_date ? newTask.due_date.toISOString() : null
            };
            const response = await createTask(eventId, taskData);
            setTasks([...tasks, response.data]);
            setShowTaskDialog(false);
            setNewTask({ title: '', description: '', category: '', phase: activePhase, due_date: null });
            toast.success('Tarefa criada');
            // Refresh stats
            const statsRes = await getEventStats(eventId);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Error creating task:', error);
            toast.error('Erro ao criar tarefa');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateTask = async () => {
        if (!editingTask.title.trim()) {
            toast.error('Título é obrigatório');
            return;
        }
        try {
            setSaving(true);
            const taskData = {
                title: editingTask.title,
                description: editingTask.description,
                due_date: editingTask.due_date
            };
            await updateTask(eventId, editingTask.id, taskData);
            setTasks(tasks.map(t => t.id === editingTask.id ? { ...t, ...taskData } : t));
            setEditingTask(null);
            toast.success('Tarefa atualizada');
        } catch (error) {
            console.error('Error updating task:', error);
            toast.error('Erro ao atualizar tarefa');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTask = async (taskId) => {
        if (!window.confirm('Tem certeza que deseja excluir esta tarefa?')) return;
        try {
            await deleteTask(eventId, taskId);
            setTasks(tasks.filter(t => t.id !== taskId));
            toast.success('Tarefa excluída');
            // Refresh stats
            const statsRes = await getEventStats(eventId);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Error deleting task:', error);
            toast.error('Erro ao excluir tarefa');
        }
    };

    const handleCreateCategory = async () => {
        if (!newCategory.name.trim()) {
            toast.error('Nome é obrigatório');
            return;
        }
        try {
            setSaving(true);
            const response = await createCategory(eventId, { ...newCategory, order: categories.length });
            setCategories([...categories, response.data]);
            setShowCategoryDialog(false);
            setNewCategory({ name: '', phase: activePhase });
            toast.success('Categoria criada');
        } catch (error) {
            console.error('Error creating category:', error);
            toast.error('Erro ao criar categoria');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateMember = async () => {
        if (!newMember.name.trim()) {
            toast.error('Nome é obrigatório');
            return;
        }
        try {
            setSaving(true);
            const response = await createMember(eventId, newMember);
            setMembers([...members, response.data]);
            setShowMemberDialog(false);
            setNewMember({ name: '', role: '' });
            toast.success('Membro adicionado');
        } catch (error) {
            console.error('Error creating member:', error);
            toast.error('Erro ao adicionar membro');
        } finally {
            setSaving(false);
        }
    };

    const handleAssignMember = async (memberId) => {
        if (!assigningTask) return;
        try {
            const currentAssigned = assigningTask.assigned_to || [];
            const isAssigned = currentAssigned.includes(memberId);
            const newAssigned = isAssigned 
                ? currentAssigned.filter(id => id !== memberId)
                : [...currentAssigned, memberId];
            
            await updateTask(eventId, assigningTask.id, { assigned_to: newAssigned });
            setTasks(tasks.map(t => t.id === assigningTask.id ? { ...t, assigned_to: newAssigned } : t));
            setAssigningTask({ ...assigningTask, assigned_to: newAssigned });
        } catch (error) {
            console.error('Error assigning member:', error);
            toast.error('Erro ao atribuir membro');
        }
    };

    const handleSaveAsTemplate = async () => {
        if (!templateName.trim()) {
            toast.error('Nome do template é obrigatório');
            return;
        }
        try {
            setSaving(true);
            await saveAsTemplate(eventId, templateName);
            setShowSaveTemplateDialog(false);
            setTemplateName('');
            toast.success('Template salvo com sucesso!');
        } catch (error) {
            console.error('Error saving template:', error);
            toast.error('Erro ao salvar template');
        } finally {
            setSaving(false);
        }
    };

    const getTasksByCategory = (phase) => {
        const phaseCategories = categories.filter(c => c.phase === phase);
        const phaseTasks = tasks.filter(t => t.phase === phase);
        
        return phaseCategories.map(category => ({
            ...category,
            tasks: phaseTasks.filter(t => t.category === category.name)
        }));
    };

    const getMemberById = (memberId) => members.find(m => m.id === memberId);

    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F4F4F5]">
                <Loader2 className="w-8 h-8 animate-spin text-[#F04D23]" />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F4F4F5]">
                <p>Evento não encontrado</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F4F4F5]">
            {/* Header */}
            <header className="bg-white border-b border-[#E5E5E5] sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => navigate('/')}
                            className="text-[#71717A] hover:text-[#09090B]"
                            data-testid="back-button"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar
                        </Button>
                        <div>
                            <h1 
                                className="text-xl font-semibold text-[#09090B]"
                                style={{ fontFamily: 'Outfit, sans-serif' }}
                                data-testid="event-title"
                            >
                                {event.name}
                            </h1>
                            {event.location && (
                                <p className="text-sm text-[#71717A]">{event.location}</p>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Members avatars */}
                        <div className="flex -space-x-2 mr-4">
                            {members.slice(0, 4).map(member => (
                                <Avatar key={member.id} className="w-8 h-8 border-2 border-white">
                                    <AvatarFallback className="bg-[#F04D23]/10 text-[#F04D23] text-xs">
                                        {getInitials(member.name)}
                                    </AvatarFallback>
                                </Avatar>
                            ))}
                            {members.length > 4 && (
                                <div className="w-8 h-8 rounded-full bg-[#F4F4F5] border-2 border-white flex items-center justify-center text-xs text-[#71717A]">
                                    +{members.length - 4}
                                </div>
                            )}
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowMemberDialog(true)}
                            className="rounded-sm border-[#E5E5E5]"
                            data-testid="add-member-button"
                        >
                            <UserPlus className="w-4 h-4 mr-2" />
                            Membro
                        </Button>
                        <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setShowSaveTemplateDialog(true)}
                            className="rounded-sm border-[#E5E5E5]"
                            data-testid="save-template-button"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Salvar Template
                        </Button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* Stats Bento Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
                    {/* Main Progress */}
                    <div className="bg-white border border-[#E5E5E5] rounded-sm p-6 md:col-span-2" data-testid="main-progress-card">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-medium text-[#71717A] uppercase tracking-wider">Progresso Geral</h3>
                            <BarChart3 className="w-4 h-4 text-[#71717A]" />
                        </div>
                        <div className="flex items-end gap-4 mb-4">
                            <span 
                                className="text-5xl font-bold text-[#09090B]"
                                style={{ fontFamily: 'Outfit, sans-serif' }}
                            >
                                {stats?.percentage || 0}%
                            </span>
                            <span className="text-[#71717A] mb-2">
                                {stats?.completed || 0} de {stats?.total || 0} tarefas
                            </span>
                        </div>
                        <Progress value={stats?.percentage || 0} className="h-2" />
                    </div>

                    {/* Phase Stats */}
                    {PHASES.map(phase => {
                        const phaseStats = stats?.phases?.[phase.id] || { total: 0, completed: 0, percentage: 0 };
                        return (
                            <div 
                                key={phase.id} 
                                className="bg-white border border-[#E5E5E5] rounded-sm p-6"
                                data-testid={`phase-stats-${phase.id}`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-medium text-[#71717A] uppercase tracking-wider">
                                        {phase.label}
                                    </span>
                                    <div 
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: phase.color }}
                                    />
                                </div>
                                <div className="text-3xl font-bold text-[#09090B] mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    {phaseStats.percentage}%
                                </div>
                                <Progress 
                                    value={phaseStats.percentage} 
                                    className="h-1"
                                    style={{ '--progress-color': phase.color }}
                                />
                                <p className="text-xs text-[#71717A] mt-2">
                                    {phaseStats.completed}/{phaseStats.total} tarefas
                                </p>
                            </div>
                        );
                    })}

                    {/* Quick Stats */}
                    <div className="bg-white border border-[#E5E5E5] rounded-sm p-6" data-testid="pending-stats">
                        <div className="flex items-center gap-3 mb-2">
                            <Clock className="w-5 h-5 text-[#94A3B8]" />
                            <span className="text-sm text-[#71717A]">Pendentes</span>
                        </div>
                        <span className="text-2xl font-bold text-[#09090B]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            {stats?.pending || 0}
                        </span>
                    </div>

                    <div className="bg-white border border-[#E5E5E5] rounded-sm p-6" data-testid="in-progress-stats">
                        <div className="flex items-center gap-3 mb-2">
                            <Settings className="w-5 h-5 text-[#F59E0B]" />
                            <span className="text-sm text-[#71717A]">Em Andamento</span>
                        </div>
                        <span className="text-2xl font-bold text-[#09090B]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            {stats?.in_progress || 0}
                        </span>
                    </div>

                    <div className="bg-white border border-[#E5E5E5] rounded-sm p-6" data-testid="overdue-stats">
                        <div className="flex items-center gap-3 mb-2">
                            <AlertTriangle className="w-5 h-5 text-red-500" />
                            <span className="text-sm text-[#71717A]">Atrasadas</span>
                        </div>
                        <span className="text-2xl font-bold text-red-500" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            {stats?.overdue || 0}
                        </span>
                    </div>

                    <div className="bg-white border border-[#E5E5E5] rounded-sm p-6" data-testid="members-stats">
                        <div className="flex items-center gap-3 mb-2">
                            <Users className="w-5 h-5 text-[#F04D23]" />
                            <span className="text-sm text-[#71717A]">Membros</span>
                        </div>
                        <span className="text-2xl font-bold text-[#09090B]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            {members.length}
                        </span>
                    </div>
                </div>

                {/* Checklist Tabs */}
                <div className="bg-white border border-[#E5E5E5] rounded-sm">
                    <Tabs value={activePhase} onValueChange={setActivePhase}>
                        <div className="border-b border-[#E5E5E5] px-6">
                            <TabsList className="h-auto bg-transparent gap-0">
                                {PHASES.map(phase => (
                                    <TabsTrigger
                                        key={phase.id}
                                        value={phase.id}
                                        className="px-6 py-4 rounded-none border-b-2 border-transparent data-[state=active]:border-current data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                                        style={{ 
                                            color: activePhase === phase.id ? phase.color : '#71717A'
                                        }}
                                        data-testid={`tab-${phase.id}`}
                                    >
                                        {phase.label}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </div>

                        {PHASES.map(phase => (
                            <TabsContent key={phase.id} value={phase.id} className="m-0">
                                <div className="p-6">
                                    {/* Actions */}
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 
                                            className="text-lg font-medium text-[#09090B]"
                                            style={{ fontFamily: 'Outfit, sans-serif' }}
                                        >
                                            Tarefas - {phase.label}
                                        </h3>
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="outline" 
                                                size="sm"
                                                onClick={() => {
                                                    setNewCategory({ name: '', phase: phase.id });
                                                    setShowCategoryDialog(true);
                                                }}
                                                className="rounded-sm border-[#E5E5E5]"
                                                data-testid={`add-category-${phase.id}`}
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Categoria
                                            </Button>
                                            <Button 
                                                size="sm"
                                                onClick={() => {
                                                    setNewTask({ title: '', description: '', category: '', phase: phase.id, due_date: null });
                                                    setShowTaskDialog(true);
                                                }}
                                                className="bg-[#F04D23] hover:bg-[#D93D1A] text-white rounded-sm"
                                                data-testid={`add-task-${phase.id}`}
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Tarefa
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Categories and Tasks */}
                                    <div className="space-y-4">
                                        {getTasksByCategory(phase.id).map(category => (
                                            <div key={category.id} className="border border-[#E5E5E5] rounded-sm">
                                                <button
                                                    onClick={() => toggleCategory(category.id)}
                                                    className="w-full flex items-center justify-between p-4 bg-[#F4F4F5] hover:bg-[#E4E4E7] transition-colors"
                                                    data-testid={`category-header-${category.id}`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        {expandedCategories[category.id] ? (
                                                            <ChevronDown className="w-4 h-4 text-[#71717A]" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4 text-[#71717A]" />
                                                        )}
                                                        <span className="font-medium text-[#09090B]">{category.name}</span>
                                                        <Badge variant="secondary" className="ml-2">
                                                            {category.tasks.length}
                                                        </Badge>
                                                    </div>
                                                    <span className="text-sm text-[#71717A]">
                                                        {category.tasks.filter(t => t.status === 'completed').length}/{category.tasks.length} concluídas
                                                    </span>
                                                </button>
                                                
                                                {expandedCategories[category.id] && (
                                                    <div className="divide-y divide-[#E5E5E5]">
                                                        {category.tasks.length === 0 ? (
                                                            <div className="p-8 text-center text-[#71717A]">
                                                                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                                <p>Nenhuma tarefa nesta categoria</p>
                                                            </div>
                                                        ) : (
                                                            category.tasks.map(task => (
                                                                <div 
                                                                    key={task.id} 
                                                                    className="p-4 flex items-center gap-4 hover:bg-[#F4F4F5] transition-colors group"
                                                                    data-testid={`task-item-${task.id}`}
                                                                >
                                                                    <Checkbox 
                                                                        checked={task.status === 'completed'}
                                                                        onCheckedChange={(checked) => 
                                                                            handleTaskStatusChange(task, checked ? 'completed' : 'pending')
                                                                        }
                                                                        className="data-[state=checked]:bg-[#10B981] data-[state=checked]:border-[#10B981]"
                                                                        data-testid={`task-checkbox-${task.id}`}
                                                                    />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className={`font-medium ${task.status === 'completed' ? 'line-through text-[#71717A]' : 'text-[#09090B]'}`}>
                                                                            {task.title}
                                                                        </p>
                                                                        {task.description && (
                                                                            <p className="text-sm text-[#71717A] truncate">{task.description}</p>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    {/* Due date */}
                                                                    {task.due_date && (
                                                                        <div className="flex items-center gap-1 text-sm text-[#71717A]">
                                                                            <Calendar className="w-4 h-4" />
                                                                            {format(new Date(task.due_date), 'dd/MM', { locale: ptBR })}
                                                                        </div>
                                                                    )}

                                                                    {/* Status badge */}
                                                                    <Select 
                                                                        value={task.status} 
                                                                        onValueChange={(value) => handleTaskStatusChange(task, value)}
                                                                    >
                                                                        <SelectTrigger className="w-[140px] h-8 text-xs rounded-sm" data-testid={`task-status-${task.id}`}>
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            {STATUS_OPTIONS.map(status => (
                                                                                <SelectItem key={status.value} value={status.value}>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div 
                                                                                            className="w-2 h-2 rounded-full"
                                                                                            style={{ backgroundColor: status.color }}
                                                                                        />
                                                                                        {status.label}
                                                                                    </div>
                                                                                </SelectItem>
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>

                                                                    {/* Assigned members */}
                                                                    <div className="flex -space-x-1">
                                                                        {(task.assigned_to || []).slice(0, 3).map(memberId => {
                                                                            const member = getMemberById(memberId);
                                                                            if (!member) return null;
                                                                            return (
                                                                                <Avatar key={memberId} className="w-6 h-6 border-2 border-white">
                                                                                    <AvatarFallback className="bg-[#F04D23]/10 text-[#F04D23] text-[10px]">
                                                                                        {getInitials(member.name)}
                                                                                    </AvatarFallback>
                                                                                </Avatar>
                                                                            );
                                                                        })}
                                                                    </div>

                                                                    {/* Actions */}
                                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => {
                                                                                setAssigningTask(task);
                                                                                setShowAssignDialog(true);
                                                                            }}
                                                                            className="h-8 w-8 p-0"
                                                                            data-testid={`assign-task-${task.id}`}
                                                                        >
                                                                            <UserPlus className="w-4 h-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => setEditingTask(task)}
                                                                            className="h-8 w-8 p-0"
                                                                            data-testid={`edit-task-${task.id}`}
                                                                        >
                                                                            <Edit2 className="w-4 h-4" />
                                                                        </Button>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => handleDeleteTask(task.id)}
                                                                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                                                                            data-testid={`delete-task-${task.id}`}
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {getTasksByCategory(phase.id).length === 0 && (
                                            <div className="p-12 text-center text-[#71717A] border border-dashed border-[#E5E5E5] rounded-sm">
                                                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                                <p className="mb-4">Nenhuma categoria nesta fase</p>
                                                <Button 
                                                    variant="outline"
                                                    onClick={() => {
                                                        setNewCategory({ name: '', phase: phase.id });
                                                        setShowCategoryDialog(true);
                                                    }}
                                                    className="rounded-sm"
                                                >
                                                    <Plus className="w-4 h-4 mr-2" />
                                                    Criar Categoria
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                        ))}
                    </Tabs>
                </div>
            </div>

            {/* Create Task Dialog */}
            <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
                <DialogContent className="sm:max-w-md" data-testid="create-task-dialog">
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>Nova Tarefa</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium text-[#09090B] mb-2 block">Título *</label>
                            <Input 
                                value={newTask.title}
                                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                placeholder="Ex: Definir cardápio"
                                className="rounded-sm"
                                data-testid="task-title-input"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-[#09090B] mb-2 block">Descrição</label>
                            <Input 
                                value={newTask.description}
                                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                placeholder="Detalhes da tarefa"
                                className="rounded-sm"
                                data-testid="task-description-input"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-[#09090B] mb-2 block">Categoria *</label>
                            <Select value={newTask.category} onValueChange={(value) => setNewTask({ ...newTask, category: value })}>
                                <SelectTrigger className="rounded-sm" data-testid="task-category-select">
                                    <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.filter(c => c.phase === newTask.phase).map(cat => (
                                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-[#09090B] mb-2 block">Prazo</label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start rounded-sm" data-testid="task-due-date-picker">
                                        <Calendar className="w-4 h-4 mr-2" />
                                        {newTask.due_date ? format(newTask.due_date, 'dd/MM/yyyy', { locale: ptBR }) : 'Selecionar data'}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <CalendarComponent
                                        mode="single"
                                        selected={newTask.due_date}
                                        onSelect={(date) => setNewTask({ ...newTask, due_date: date })}
                                        locale={ptBR}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowTaskDialog(false)} className="rounded-sm">
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleCreateTask}
                            disabled={saving}
                            className="bg-[#F04D23] hover:bg-[#D93D1A] text-white rounded-sm"
                            data-testid="confirm-create-task"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Criar Tarefa
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Task Dialog */}
            <Dialog open={!!editingTask} onOpenChange={() => setEditingTask(null)}>
                <DialogContent className="sm:max-w-md" data-testid="edit-task-dialog">
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>Editar Tarefa</DialogTitle>
                    </DialogHeader>
                    {editingTask && (
                        <div className="space-y-4 py-4">
                            <div>
                                <label className="text-sm font-medium text-[#09090B] mb-2 block">Título *</label>
                                <Input 
                                    value={editingTask.title}
                                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                                    className="rounded-sm"
                                    data-testid="edit-task-title-input"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-[#09090B] mb-2 block">Descrição</label>
                                <Input 
                                    value={editingTask.description || ''}
                                    onChange={(e) => setEditingTask({ ...editingTask, description: e.target.value })}
                                    className="rounded-sm"
                                    data-testid="edit-task-description-input"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-[#09090B] mb-2 block">Prazo</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start rounded-sm">
                                            <Calendar className="w-4 h-4 mr-2" />
                                            {editingTask.due_date 
                                                ? format(new Date(editingTask.due_date), 'dd/MM/yyyy', { locale: ptBR }) 
                                                : 'Selecionar data'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <CalendarComponent
                                            mode="single"
                                            selected={editingTask.due_date ? new Date(editingTask.due_date) : undefined}
                                            onSelect={(date) => setEditingTask({ ...editingTask, due_date: date?.toISOString() })}
                                            locale={ptBR}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingTask(null)} className="rounded-sm">
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleUpdateTask}
                            disabled={saving}
                            className="bg-[#F04D23] hover:bg-[#D93D1A] text-white rounded-sm"
                            data-testid="confirm-edit-task"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Category Dialog */}
            <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
                <DialogContent className="sm:max-w-md" data-testid="create-category-dialog">
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>Nova Categoria</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium text-[#09090B] mb-2 block">Nome *</label>
                            <Input 
                                value={newCategory.name}
                                onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                                placeholder="Ex: Logística"
                                className="rounded-sm"
                                data-testid="category-name-input"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCategoryDialog(false)} className="rounded-sm">
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleCreateCategory}
                            disabled={saving}
                            className="bg-[#F04D23] hover:bg-[#D93D1A] text-white rounded-sm"
                            data-testid="confirm-create-category"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Criar Categoria
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Member Dialog */}
            <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
                <DialogContent className="sm:max-w-md" data-testid="add-member-dialog">
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>Adicionar Membro</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium text-[#09090B] mb-2 block">Nome *</label>
                            <Input 
                                value={newMember.name}
                                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                                placeholder="Nome do membro"
                                className="rounded-sm"
                                data-testid="member-name-input"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-[#09090B] mb-2 block">Função</label>
                            <Input 
                                value={newMember.role}
                                onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                                placeholder="Ex: Coordenador"
                                className="rounded-sm"
                                data-testid="member-role-input"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowMemberDialog(false)} className="rounded-sm">
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleCreateMember}
                            disabled={saving}
                            className="bg-[#F04D23] hover:bg-[#D93D1A] text-white rounded-sm"
                            data-testid="confirm-add-member"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Adicionar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign Member Dialog */}
            <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
                <DialogContent className="sm:max-w-md" data-testid="assign-member-dialog">
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>Atribuir Membros</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        {members.length === 0 ? (
                            <div className="text-center py-8 text-[#71717A]">
                                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>Nenhum membro cadastrado</p>
                                <Button 
                                    variant="outline" 
                                    className="mt-4 rounded-sm"
                                    onClick={() => {
                                        setShowAssignDialog(false);
                                        setShowMemberDialog(true);
                                    }}
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Adicionar Membro
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {members.map(member => {
                                    const isAssigned = assigningTask?.assigned_to?.includes(member.id);
                                    return (
                                        <button
                                            key={member.id}
                                            onClick={() => handleAssignMember(member.id)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-sm transition-colors ${
                                                isAssigned ? 'bg-[#F04D23]/10' : 'hover:bg-[#F4F4F5]'
                                            }`}
                                            data-testid={`assign-member-${member.id}`}
                                        >
                                            <Avatar className="w-10 h-10">
                                                <AvatarFallback className={`${isAssigned ? 'bg-[#F04D23] text-white' : 'bg-[#F4F4F5] text-[#71717A]'}`}>
                                                    {getInitials(member.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 text-left">
                                                <p className="font-medium text-[#09090B]">{member.name}</p>
                                                {member.role && <p className="text-sm text-[#71717A]">{member.role}</p>}
                                            </div>
                                            {isAssigned && <Check className="w-5 h-5 text-[#F04D23]" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setShowAssignDialog(false)} className="rounded-sm">
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Save as Template Dialog */}
            <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
                <DialogContent className="sm:max-w-md" data-testid="save-template-dialog">
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>Salvar como Template</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-[#71717A]">
                            Salve este evento como um template para reutilizar em futuros eventos.
                        </p>
                        <div>
                            <label className="text-sm font-medium text-[#09090B] mb-2 block">Nome do Template *</label>
                            <Input 
                                value={templateName}
                                onChange={(e) => setTemplateName(e.target.value)}
                                placeholder="Ex: IMPACTO 2026"
                                className="rounded-sm"
                                data-testid="template-name-input"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)} className="rounded-sm">
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleSaveAsTemplate}
                            disabled={saving}
                            className="bg-[#F04D23] hover:bg-[#D93D1A] text-white rounded-sm"
                            data-testid="confirm-save-template"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            Salvar Template
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
