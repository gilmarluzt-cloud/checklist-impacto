from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class Phase(str, Enum):
    ANTES = "antes"
    DURANTE = "durante"
    APOS = "apos"

class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"

# Models
class Member(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    role: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class MemberCreate(BaseModel):
    name: str
    role: Optional[str] = None
    avatar_url: Optional[str] = None

class Task(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    phase: Phase
    category: str
    status: TaskStatus = TaskStatus.PENDING
    due_date: Optional[str] = None
    assigned_to: List[str] = Field(default_factory=list)
    order: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    phase: Phase
    category: str
    status: TaskStatus = TaskStatus.PENDING
    due_date: Optional[str] = None
    assigned_to: List[str] = Field(default_factory=list)
    order: int = 0

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    phase: Optional[Phase] = None
    category: Optional[str] = None
    status: Optional[TaskStatus] = None
    due_date: Optional[str] = None
    assigned_to: Optional[List[str]] = None
    order: Optional[int] = None

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phase: Phase
    order: int = 0

class CategoryCreate(BaseModel):
    name: str
    phase: Phase
    order: int = 0

class Event(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class EventCreate(BaseModel):
    name: str
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None

class EventUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None

class Template(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    categories: List[Category] = Field(default_factory=list)
    tasks: List[Task] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None

# API Routes

# Health check
@api_router.get("/")
async def root():
    return {"message": "IMPACTO Checklist API"}

# Events
@api_router.get("/events", response_model=List[Event])
async def get_events():
    events = await db.events.find({}, {"_id": 0}).to_list(1000)
    return events

@api_router.get("/events/{event_id}", response_model=Event)
async def get_event(event_id: str):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@api_router.post("/events", response_model=Event)
async def create_event(event_data: EventCreate):
    event = Event(**event_data.model_dump())
    doc = event.model_dump()
    await db.events.insert_one(doc)
    return event

@api_router.put("/events/{event_id}", response_model=Event)
async def update_event(event_id: str, event_data: EventUpdate):
    update_dict = {k: v for k, v in event_data.model_dump().items() if v is not None}
    if len(update_dict) == 0:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.events.update_one({"id": event_id}, {"$set": update_dict})
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if event is None:
        raise HTTPException(status_code=404, detail="Event not found")
    return event

@api_router.delete("/events/{event_id}")
async def delete_event(event_id: str):
    result = await db.events.delete_one({"id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    # Also delete related tasks, categories, and members
    await db.tasks.delete_many({"event_id": event_id})
    await db.categories.delete_many({"event_id": event_id})
    await db.members.delete_many({"event_id": event_id})
    return {"message": "Event deleted successfully"}

# Categories
@api_router.get("/events/{event_id}/categories", response_model=List[Category])
async def get_categories(event_id: str):
    categories = await db.categories.find({"event_id": event_id}, {"_id": 0}).sort("order", 1).to_list(1000)
    return categories

@api_router.post("/events/{event_id}/categories", response_model=Category)
async def create_category(event_id: str, category_data: CategoryCreate):
    category = Category(**category_data.model_dump())
    doc = category.model_dump()
    doc["event_id"] = event_id
    await db.categories.insert_one(doc)
    return category

@api_router.delete("/events/{event_id}/categories/{category_id}")
async def delete_category(event_id: str, category_id: str):
    result = await db.categories.delete_one({"id": category_id, "event_id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}

# Tasks
@api_router.get("/events/{event_id}/tasks", response_model=List[Task])
async def get_tasks(event_id: str, phase: Optional[Phase] = None, category: Optional[str] = None):
    query = {"event_id": event_id}
    if phase:
        query["phase"] = phase
    if category:
        query["category"] = category
    tasks = await db.tasks.find(query, {"_id": 0}).sort("order", 1).to_list(1000)
    return tasks

@api_router.get("/events/{event_id}/tasks/{task_id}", response_model=Task)
async def get_task(event_id: str, task_id: str):
    task = await db.tasks.find_one({"id": task_id, "event_id": event_id}, {"_id": 0})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@api_router.post("/events/{event_id}/tasks", response_model=Task)
async def create_task(event_id: str, task_data: TaskCreate):
    task = Task(**task_data.model_dump())
    doc = task.model_dump()
    doc["event_id"] = event_id
    await db.tasks.insert_one(doc)
    return task

@api_router.put("/events/{event_id}/tasks/{task_id}", response_model=Task)
async def update_task(event_id: str, task_id: str, task_data: TaskUpdate):
    update_dict = {k: v for k, v in task_data.model_dump().items() if v is not None}
    if len(update_dict) == 0:
        raise HTTPException(status_code=400, detail="No fields to update")
    await db.tasks.update_one({"id": task_id, "event_id": event_id}, {"$set": update_dict})
    task = await db.tasks.find_one({"id": task_id, "event_id": event_id}, {"_id": 0})
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@api_router.delete("/events/{event_id}/tasks/{task_id}")
async def delete_task(event_id: str, task_id: str):
    result = await db.tasks.delete_one({"id": task_id, "event_id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": "Task deleted successfully"}

# Batch update tasks status
@api_router.put("/events/{event_id}/tasks/batch-status")
async def batch_update_tasks_status(event_id: str, task_ids: List[str], status: TaskStatus):
    await db.tasks.update_many(
        {"id": {"$in": task_ids}, "event_id": event_id},
        {"$set": {"status": status}}
    )
    return {"message": f"Updated {len(task_ids)} tasks"}

# Members
@api_router.get("/events/{event_id}/members", response_model=List[Member])
async def get_members(event_id: str):
    members = await db.members.find({"event_id": event_id}, {"_id": 0}).to_list(1000)
    return members

@api_router.post("/events/{event_id}/members", response_model=Member)
async def create_member(event_id: str, member_data: MemberCreate):
    member = Member(**member_data.model_dump())
    doc = member.model_dump()
    doc["event_id"] = event_id
    await db.members.insert_one(doc)
    return member

@api_router.delete("/events/{event_id}/members/{member_id}")
async def delete_member(event_id: str, member_id: str):
    result = await db.members.delete_one({"id": member_id, "event_id": event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    return {"message": "Member deleted successfully"}

# Templates
@api_router.get("/templates", response_model=List[Template])
async def get_templates():
    templates = await db.templates.find({}, {"_id": 0}).to_list(1000)
    return templates

@api_router.get("/templates/{template_id}", response_model=Template)
async def get_template(template_id: str):
    template = await db.templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@api_router.post("/templates", response_model=Template)
async def create_template(template_data: TemplateCreate):
    template = Template(**template_data.model_dump())
    doc = template.model_dump()
    await db.templates.insert_one(doc)
    return template

@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str):
    result = await db.templates.delete_one({"id": template_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted successfully"}

# Apply template to event
@api_router.post("/events/{event_id}/apply-template/{template_id}")
async def apply_template_to_event(event_id: str, template_id: str):
    template = await db.templates.find_one({"id": template_id}, {"_id": 0})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    # Copy categories
    for cat in template.get("categories", []):
        new_cat = {**cat, "id": str(uuid.uuid4()), "event_id": event_id}
        await db.categories.insert_one(new_cat)
    
    # Copy tasks
    for task in template.get("tasks", []):
        new_task = {**task, "id": str(uuid.uuid4()), "event_id": event_id, "status": TaskStatus.PENDING}
        await db.tasks.insert_one(new_task)
    
    return {"message": "Template applied successfully"}

# Save event as template
@api_router.post("/events/{event_id}/save-as-template", response_model=Template)
async def save_event_as_template(event_id: str, name: str = Query(...), description: Optional[str] = None):
    event = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    categories = await db.categories.find({"event_id": event_id}, {"_id": 0, "event_id": 0}).to_list(1000)
    tasks = await db.tasks.find({"event_id": event_id}, {"_id": 0, "event_id": 0}).to_list(1000)
    
    # Reset task statuses and assignments
    for task in tasks:
        task["status"] = TaskStatus.PENDING
        task["assigned_to"] = []
        task["due_date"] = None
    
    template = Template(
        name=name,
        description=description or f"Template baseado no evento {event['name']}",
        categories=categories,
        tasks=tasks
    )
    doc = template.model_dump()
    await db.templates.insert_one(doc)
    return template

# Statistics
@api_router.get("/events/{event_id}/stats")
async def get_event_stats(event_id: str):
    tasks = await db.tasks.find({"event_id": event_id}, {"_id": 0}).to_list(1000)
    
    total = len(tasks)
    completed = sum(1 for t in tasks if t.get("status") == TaskStatus.COMPLETED)
    in_progress = sum(1 for t in tasks if t.get("status") == TaskStatus.IN_PROGRESS)
    pending = sum(1 for t in tasks if t.get("status") == TaskStatus.PENDING)
    
    # Stats by phase
    phases = {}
    for phase in Phase:
        phase_tasks = [t for t in tasks if t.get("phase") == phase]
        phase_total = len(phase_tasks)
        phase_completed = sum(1 for t in phase_tasks if t.get("status") == TaskStatus.COMPLETED)
        phases[phase] = {
            "total": phase_total,
            "completed": phase_completed,
            "percentage": round((phase_completed / phase_total * 100) if phase_total > 0 else 0, 1)
        }
    
    # Overdue tasks
    now = datetime.now(timezone.utc).isoformat()
    overdue = sum(1 for t in tasks if t.get("due_date") and t.get("due_date") < now and t.get("status") != TaskStatus.COMPLETED)
    
    return {
        "total": total,
        "completed": completed,
        "in_progress": in_progress,
        "pending": pending,
        "percentage": round((completed / total * 100) if total > 0 else 0, 1),
        "phases": phases,
        "overdue": overdue
    }

# Create default IMPACTO template
@api_router.post("/seed-impacto-template")
async def seed_impacto_template():
    # Check if template already exists
    existing = await db.templates.find_one({"name": "IMPACTO Padrão"}, {"_id": 0})
    if existing:
        return {"message": "Template já existe", "template_id": existing["id"]}
    
    # Categories and tasks from the problem statement
    categories_data = [
        # ANTES
        {"name": "Alimentação", "phase": Phase.ANTES, "order": 1},
        {"name": "Colégio", "phase": Phase.ANTES, "order": 2},
        {"name": "Servos", "phase": Phase.ANTES, "order": 3},
        {"name": "Camisas", "phase": Phase.ANTES, "order": 4},
        {"name": "Ônibus/Transporte", "phase": Phase.ANTES, "order": 5},
        {"name": "Material Gráfico", "phase": Phase.ANTES, "order": 6},
        {"name": "Cadeiras e Mesas", "phase": Phase.ANTES, "order": 7},
        {"name": "Data", "phase": Phase.ANTES, "order": 8},
        {"name": "Impactantes", "phase": Phase.ANTES, "order": 9},
        {"name": "Equipes", "phase": Phase.ANTES, "order": 10},
        # DURANTE
        {"name": "Check-in", "phase": Phase.DURANTE, "order": 1},
        {"name": "Pregações", "phase": Phase.DURANTE, "order": 2},
        {"name": "Suporte", "phase": Phase.DURANTE, "order": 3},
        # APÓS
        {"name": "Check-out", "phase": Phase.APOS, "order": 1},
        {"name": "Organização", "phase": Phase.APOS, "order": 2},
    ]
    
    categories = [Category(**c) for c in categories_data]
    
    tasks_data = [
        # ANTES - Alimentação
        {"title": "Cardápio e compras", "phase": Phase.ANTES, "category": "Alimentação", "order": 1},
        # ANTES - Colégio
        {"title": "Conseguir com a diretora", "phase": Phase.ANTES, "category": "Colégio", "order": 1},
        # ANTES - Servos
        {"title": "Quem irá como servo", "phase": Phase.ANTES, "category": "Servos", "order": 1},
        # ANTES - Camisas
        {"title": "Quem ainda não tem camisa do impacto", "phase": Phase.ANTES, "category": "Camisas", "order": 1},
        # ANTES - Ônibus
        {"title": "Alugar ônibus para ida e vinda do impacto", "phase": Phase.ANTES, "category": "Ônibus/Transporte", "order": 1},
        # ANTES - Material Gráfico
        {"title": "Adesivo para bagagens", "phase": Phase.ANTES, "category": "Material Gráfico", "order": 1},
        {"title": "Adesivo para água", "phase": Phase.ANTES, "category": "Material Gráfico", "order": 2},
        {"title": "Adesivo para envelopes", "phase": Phase.ANTES, "category": "Material Gráfico", "order": 3},
        {"title": "Crachás servos/impactantes", "phase": Phase.ANTES, "category": "Material Gráfico", "order": 4},
        {"title": "Sacola para celulares", "phase": Phase.ANTES, "category": "Material Gráfico", "order": 5},
        {"title": "Termo de uso de imagem", "phase": Phase.ANTES, "category": "Material Gráfico", "order": 6},
        {"title": "Correio", "phase": Phase.ANTES, "category": "Material Gráfico", "order": 7},
        # ANTES - Cadeiras e Mesas
        {"title": "Alugar para os dias", "phase": Phase.ANTES, "category": "Cadeiras e Mesas", "order": 1},
        # ANTES - Data
        {"title": "Definir datas", "phase": Phase.ANTES, "category": "Data", "order": 1},
        {"title": "Qual data do IMPACTO", "phase": Phase.ANTES, "category": "Data", "order": 2},
        # ANTES - Impactantes
        {"title": "Compras para a festa", "phase": Phase.ANTES, "category": "Impactantes", "order": 1},
        {"title": "Definir preletores e enviar suas palavras", "phase": Phase.ANTES, "category": "Impactantes", "order": 2},
        {"title": "Momento da cruz", "phase": Phase.ANTES, "category": "Impactantes", "order": 3},
        {"title": "Momento da tenda", "phase": Phase.ANTES, "category": "Impactantes", "order": 4},
        {"title": "Momento da peça", "phase": Phase.ANTES, "category": "Impactantes", "order": 5},
        # ANTES - Equipes
        {"title": "Equipe de cozinheiras", "phase": Phase.ANTES, "category": "Equipes", "order": 1},
        {"title": "Equipe de limpeza", "phase": Phase.ANTES, "category": "Equipes", "order": 2},
        {"title": "Equipe de garçom", "phase": Phase.ANTES, "category": "Equipes", "order": 3},
        {"title": "Equipe da tenda", "phase": Phase.ANTES, "category": "Equipes", "order": 4},
        # DURANTE - Check-in
        {"title": "Organização inicial", "phase": Phase.DURANTE, "category": "Check-in", "order": 1},
        {"title": "Recepção dos impactantes", "phase": Phase.DURANTE, "category": "Check-in", "order": 2},
        {"title": "Identificação das malas", "phase": Phase.DURANTE, "category": "Check-in", "order": 3},
        {"title": "Identificação dos impactantes", "phase": Phase.DURANTE, "category": "Check-in", "order": 4},
        {"title": "Levar malas ao ônibus", "phase": Phase.DURANTE, "category": "Check-in", "order": 5},
        {"title": "Orientações iniciais", "phase": Phase.DURANTE, "category": "Check-in", "order": 6},
        {"title": "Café dos impactantes", "phase": Phase.DURANTE, "category": "Check-in", "order": 7},
        {"title": "Explicação do impacto", "phase": Phase.DURANTE, "category": "Check-in", "order": 8},
        {"title": "Recolher os celulares", "phase": Phase.DURANTE, "category": "Check-in", "order": 9},
        {"title": "Entregar as águas", "phase": Phase.DURANTE, "category": "Check-in", "order": 10},
        # DURANTE - Pregações
        {"title": "Início pregações", "phase": Phase.DURANTE, "category": "Pregações", "order": 1},
        {"title": "Conjuntas", "phase": Phase.DURANTE, "category": "Pregações", "order": 2},
        {"title": "Temporizador", "phase": Phase.DURANTE, "category": "Pregações", "order": 3},
        {"title": "Mídia", "phase": Phase.DURANTE, "category": "Pregações", "order": 4},
        {"title": "Suporte", "phase": Phase.DURANTE, "category": "Pregações", "order": 5},
        {"title": "Separadas", "phase": Phase.DURANTE, "category": "Pregações", "order": 6},
        # DURANTE - Suporte
        {"title": "Mídia", "phase": Phase.DURANTE, "category": "Suporte", "order": 1},
        {"title": "Temporizador", "phase": Phase.DURANTE, "category": "Suporte", "order": 2},
        {"title": "Som", "phase": Phase.DURANTE, "category": "Suporte", "order": 3},
        # APÓS - Check-out
        {"title": "Arrumar as malas", "phase": Phase.APOS, "category": "Check-out", "order": 1},
        {"title": "Guardar as malas", "phase": Phase.APOS, "category": "Check-out", "order": 2},
        # APÓS - Organização
        {"title": "Organizar escola", "phase": Phase.APOS, "category": "Organização", "order": 1},
        {"title": "Recolher materiais", "phase": Phase.APOS, "category": "Organização", "order": 2},
        {"title": "Organizar mídia na igreja", "phase": Phase.APOS, "category": "Organização", "order": 3},
        {"title": "Preparar para a chegada", "phase": Phase.APOS, "category": "Organização", "order": 4},
        {"title": "Chegada", "phase": Phase.APOS, "category": "Organização", "order": 5},
    ]
    
    tasks = [Task(**t) for t in tasks_data]
    
    template = Template(
        name="IMPACTO Padrão",
        description="Template padrão para eventos IMPACTO com todas as tarefas organizadas por fase",
        categories=[c.model_dump() for c in categories],
        tasks=[t.model_dump() for t in tasks]
    )
    
    doc = template.model_dump()
    await db.templates.insert_one(doc)
    
    return {"message": "Template IMPACTO criado com sucesso", "template_id": template.id}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
