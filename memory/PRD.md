# Check List IMPACTO - SaaS de Gerenciamento de Eventos

## Problema Original
Criar um SaaS para organizar o Check List IMPACTO de forma intuitiva e estruturada, com:
- Fases: Antes, Durante e Após
- Categorias e tarefas dentro de cada fase
- Colaboração em equipe

## Escolhas do Usuário
- **Autenticação**: Sem autenticação (acesso livre)
- **Funcionalidades**: CRUD completo + colaboração em equipe
- **Organização**: Múltiplos eventos + templates customizáveis
- **Recursos**: Atribuição de responsáveis, prazos, notificações, relatórios
- **Design**: Moderno e minimalista

## Arquitetura

### Backend (FastAPI + MongoDB)
- **Endpoints**: 20+ APIs para eventos, tarefas, categorias, membros, templates
- **Modelos**: Event, Task, Category, Member, Template
- **Features**: CRUD completo, estatísticas, aplicação de templates

### Frontend (React + Tailwind + Shadcn)
- **Landing Page**: Hero com criação de eventos
- **Dashboard**: Bento grid com estatísticas por fase
- **Checklist**: Tabs por fase, categorias expansíveis
- **Modais**: Criação/edição de tarefas, membros, templates

## O Que Foi Implementado (09/04/2026)

### Backend ✅
- API completa para gerenciamento de eventos
- CRUD de tarefas, categorias e membros
- Sistema de templates com seed do IMPACTO Padrão
- Estatísticas de progresso por fase
- Aplicação de templates a eventos

### Frontend ✅
- Landing page com listagem de eventos
- Dashboard com métricas Bento Grid
- Navegação por tabs (Antes/Durante/Após)
- Marcação de tarefas concluídas
- Atribuição de membros a tarefas
- Seletor de data para prazos
- Salvamento como template
- Design Swiss & High-Contrast (Impact Orange #F04D23)

## User Personas
1. **Coordenador de Evento**: Cria eventos, define tarefas, atribui responsáveis
2. **Servo/Voluntário**: Visualiza suas tarefas, marca como concluídas
3. **Líder de Equipe**: Acompanha progresso da sua área

## Backlog Priorizado

### P0 (Crítico) - Implementado ✅
- [x] CRUD de eventos
- [x] CRUD de tarefas por fase/categoria
- [x] Template IMPACTO padrão
- [x] Estatísticas de progresso
- [x] Marcação de conclusão

### P1 (Importante) - Implementado ✅
- [x] Atribuição de membros
- [x] Prazos com calendário
- [x] Salvamento como template

### P2 (Desejável) - Próximas Iterações
- [ ] Notificações/lembretes por email
- [ ] Filtros avançados de tarefas
- [ ] Exportação de relatórios PDF
- [ ] Histórico de alterações
- [ ] Comentários em tarefas

## Próximas Tarefas
1. Implementar sistema de notificações
2. Adicionar filtros por responsável/prazo
3. Exportar relatórios em PDF
4. Modo offline para check-in

## Métricas de Teste
- Backend: 100% (20/20 endpoints)
- Frontend: 95% (funcionalidade core OK)
