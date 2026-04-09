import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ClipboardList, ArrowRight, Loader2, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { getEvents, createEvent, deleteEvent, getTemplates, applyTemplate, seedImpactoTemplate } from '../lib/api';
import { toast } from 'sonner';

export default function Landing() {
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newEvent, setNewEvent] = useState({ name: '', description: '', location: '' });
    const [selectedTemplate, setSelectedTemplate] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            // Seed default template
            await seedImpactoTemplate();
            
            const [eventsRes, templatesRes] = await Promise.all([
                getEvents(),
                getTemplates()
            ]);
            setEvents(eventsRes.data);
            setTemplates(templatesRes.data);
        } catch (error) {
            console.error('Error loading data:', error);
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEvent = async () => {
        if (!newEvent.name.trim()) {
            toast.error('Nome do evento é obrigatório');
            return;
        }

        try {
            setCreating(true);
            const response = await createEvent(newEvent);
            const createdEvent = response.data;

            // Apply template if selected
            if (selectedTemplate) {
                await applyTemplate(createdEvent.id, selectedTemplate);
            }

            toast.success('Evento criado com sucesso!');
            setShowCreateDialog(false);
            setNewEvent({ name: '', description: '', location: '' });
            setSelectedTemplate('');
            navigate(`/event/${createdEvent.id}`);
        } catch (error) {
            console.error('Error creating event:', error);
            toast.error('Erro ao criar evento');
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteEvent = async (eventId, e) => {
        e.stopPropagation();
        if (!window.confirm('Tem certeza que deseja excluir este evento?')) return;
        
        try {
            await deleteEvent(eventId);
            setEvents(events.filter(ev => ev.id !== eventId));
            toast.success('Evento excluído');
        } catch (error) {
            console.error('Error deleting event:', error);
            toast.error('Erro ao excluir evento');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#F4F4F5]">
                <Loader2 className="w-8 h-8 animate-spin text-[#F04D23]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F4F4F5]">
            {/* Hero Section */}
            <div 
                className="relative min-h-[50vh] flex items-center justify-center"
                style={{
                    backgroundImage: 'url(https://images.unsplash.com/photo-1739732119808-0aeef88d14d9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzN8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhYnN0cmFjdCUyMG1pbmltYWxpc3QlMjBhcmNoaXRlY3R1cmV8ZW58MHx8fHwxNzc1NzU1NTczfDA&ixlib=rb-4.1.0&q=85)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-white/95 to-white/85" />
                <div className="relative z-10 text-center px-6 py-16 max-w-3xl mx-auto">
                    <h1 
                        className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#09090B] mb-6"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                        data-testid="landing-title"
                    >
                        Check List IMPACTO
                    </h1>
                    <p className="text-base sm:text-lg text-[#71717A] mb-8 max-w-xl mx-auto">
                        Organize seus eventos de forma intuitiva e estruturada. 
                        Gerencie tarefas, equipes e prazos em um só lugar.
                    </p>
                    <Button 
                        onClick={() => setShowCreateDialog(true)}
                        className="bg-[#F04D23] hover:bg-[#D93D1A] text-white px-8 py-6 text-lg rounded-sm btn-lift"
                        data-testid="create-event-button"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Criar Novo Evento
                    </Button>
                </div>
            </div>

            {/* Events Section */}
            <div className="max-w-6xl mx-auto px-6 py-12">
                <div className="flex items-center justify-between mb-8">
                    <h2 
                        className="text-2xl sm:text-3xl font-semibold text-[#09090B]"
                        style={{ fontFamily: 'Outfit, sans-serif' }}
                    >
                        Seus Eventos
                    </h2>
                    <span className="text-sm text-[#71717A]">{events.length} evento(s)</span>
                </div>

                {events.length === 0 ? (
                    <div className="bg-white border border-[#E5E5E5] rounded-sm p-12 text-center">
                        <ClipboardList className="w-16 h-16 mx-auto text-[#E5E5E5] mb-4" />
                        <h3 className="text-lg font-medium text-[#09090B] mb-2">Nenhum evento criado</h3>
                        <p className="text-[#71717A] mb-6">Comece criando seu primeiro evento IMPACTO</p>
                        <Button 
                            onClick={() => setShowCreateDialog(true)}
                            variant="outline"
                            className="border-[#E5E5E5] hover:bg-[#F4F4F5]"
                            data-testid="create-first-event-button"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Criar Evento
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {events.map((event, index) => (
                            <div 
                                key={event.id}
                                className="bg-white border border-[#E5E5E5] rounded-sm p-6 hover:shadow-md transition-shadow cursor-pointer group animate-fade-in"
                                style={{ animationDelay: `${index * 0.1}s` }}
                                onClick={() => navigate(`/event/${event.id}`)}
                                data-testid={`event-card-${event.id}`}
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-10 h-10 rounded-sm bg-[#F04D23]/10 flex items-center justify-center">
                                        <ClipboardList className="w-5 h-5 text-[#F04D23]" />
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => handleDeleteEvent(event.id, e)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-[#71717A] hover:text-red-500"
                                        data-testid={`delete-event-${event.id}`}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                                <h3 className="text-lg font-medium text-[#09090B] mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                                    {event.name}
                                </h3>
                                {event.description && (
                                    <p className="text-sm text-[#71717A] mb-4 line-clamp-2">{event.description}</p>
                                )}
                                {event.location && (
                                    <p className="text-xs text-[#71717A] mb-4">{event.location}</p>
                                )}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-[#71717A]">
                                        {new Date(event.created_at).toLocaleDateString('pt-BR')}
                                    </span>
                                    <ArrowRight className="w-4 h-4 text-[#71717A] group-hover:text-[#F04D23] transition-colors" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Create Event Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-md" data-testid="create-event-dialog">
                    <DialogHeader>
                        <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>Criar Novo Evento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-sm font-medium text-[#09090B] mb-2 block">Nome do Evento *</label>
                            <Input 
                                value={newEvent.name}
                                onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                                placeholder="Ex: IMPACTO 2026"
                                className="rounded-sm"
                                data-testid="event-name-input"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-[#09090B] mb-2 block">Descrição</label>
                            <Input 
                                value={newEvent.description}
                                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                placeholder="Descrição do evento"
                                className="rounded-sm"
                                data-testid="event-description-input"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-[#09090B] mb-2 block">Local</label>
                            <Input 
                                value={newEvent.location}
                                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                                placeholder="Local do evento"
                                className="rounded-sm"
                                data-testid="event-location-input"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-[#09090B] mb-2 block">Template</label>
                            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                                <SelectTrigger className="rounded-sm" data-testid="template-select">
                                    <SelectValue placeholder="Selecione um template (opcional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Nenhum template</SelectItem>
                                    {templates.map(template => (
                                        <SelectItem key={template.id} value={template.id}>
                                            {template.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setShowCreateDialog(false)}
                            className="rounded-sm"
                            data-testid="cancel-create-event"
                        >
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleCreateEvent}
                            disabled={creating}
                            className="bg-[#F04D23] hover:bg-[#D93D1A] text-white rounded-sm"
                            data-testid="confirm-create-event"
                        >
                            {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Criar Evento
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
