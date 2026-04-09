import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
    baseURL: API,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Events
export const getEvents = () => api.get('/events');
export const getEvent = (id) => api.get(`/events/${id}`);
export const createEvent = (data) => api.post('/events', data);
export const updateEvent = (id, data) => api.put(`/events/${id}`, data);
export const deleteEvent = (id) => api.delete(`/events/${id}`);

// Categories
export const getCategories = (eventId) => api.get(`/events/${eventId}/categories`);
export const createCategory = (eventId, data) => api.post(`/events/${eventId}/categories`, data);
export const deleteCategory = (eventId, categoryId) => api.delete(`/events/${eventId}/categories/${categoryId}`);

// Tasks
export const getTasks = (eventId, phase, category) => {
    const params = new URLSearchParams();
    if (phase) params.append('phase', phase);
    if (category) params.append('category', category);
    return api.get(`/events/${eventId}/tasks?${params.toString()}`);
};
export const getTask = (eventId, taskId) => api.get(`/events/${eventId}/tasks/${taskId}`);
export const createTask = (eventId, data) => api.post(`/events/${eventId}/tasks`, data);
export const updateTask = (eventId, taskId, data) => api.put(`/events/${eventId}/tasks/${taskId}`, data);
export const deleteTask = (eventId, taskId) => api.delete(`/events/${eventId}/tasks/${taskId}`);

// Members
export const getMembers = (eventId) => api.get(`/events/${eventId}/members`);
export const createMember = (eventId, data) => api.post(`/events/${eventId}/members`, data);
export const deleteMember = (eventId, memberId) => api.delete(`/events/${eventId}/members/${memberId}`);

// Templates
export const getTemplates = () => api.get('/templates');
export const getTemplate = (id) => api.get(`/templates/${id}`);
export const createTemplate = (data) => api.post('/templates', data);
export const deleteTemplate = (id) => api.delete(`/templates/${id}`);
export const applyTemplate = (eventId, templateId) => api.post(`/events/${eventId}/apply-template/${templateId}`);
export const saveAsTemplate = (eventId, name, description) => 
    api.post(`/events/${eventId}/save-as-template?name=${encodeURIComponent(name)}${description ? `&description=${encodeURIComponent(description)}` : ''}`);

// Stats
export const getEventStats = (eventId) => api.get(`/events/${eventId}/stats`);

// Seed default template
export const seedImpactoTemplate = () => api.post('/seed-impacto-template');

export default api;
