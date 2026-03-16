
UPDATE public.subscription_plans 
SET features = '{"max_diagrams": 3, "max_boards": 2, "max_events": 10, "max_guests_per_project": 0, "export_pdf": false, "ai_suggestions": false, "ai_generation": false, "list": ["3 mapas mentais", "2 boards Kanban", "10 eventos/mês", "Exportar PNG", "Templates básicos", "IA básica (suporte)"]}'::jsonb
WHERE name = 'free';

UPDATE public.subscription_plans 
SET features = '{"max_diagrams": 10, "max_boards": 10, "max_events": 20, "max_guests_per_project": 5, "export_pdf": true, "ai_suggestions": true, "ai_generation": false, "is_highlighted": true, "list": ["10 diagramas", "10 boards Kanban", "20 eventos/mês", "Até 5 convidados por projeto", "Exportar PDF + PNG", "Todos os templates", "IA instrutiva (orientações avançadas)", "Histórico de versões"], "cta_text": "Assinar Pro", "description": "Para profissionais que querem mais produtividade"}'::jsonb
WHERE name = 'pro';

UPDATE public.subscription_plans 
SET features = '{"max_diagrams": -1, "max_boards": -1, "max_events": -1, "max_guests_per_project": -1, "export_pdf": true, "ai_suggestions": true, "ai_generation": true, "is_highlighted": false, "list": ["Diagramas ilimitados", "Boards ilimitados", "Eventos ilimitados", "Convidados ilimitados", "Exportar PDF + PNG", "Todos os templates", "IA completa (geração automática)", "Suporte prioritário", "Histórico de versões"], "cta_text": "Assinar Business", "description": "Para equipes que precisam de IA generativa e colaboração total"}'::jsonb
WHERE name = 'business';
