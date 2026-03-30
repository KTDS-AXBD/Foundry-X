-- F221: Agent-as-Code 선언적 정의 — custom_agent_roles 확장
ALTER TABLE custom_agent_roles ADD COLUMN persona TEXT NOT NULL DEFAULT '';
ALTER TABLE custom_agent_roles ADD COLUMN dependencies TEXT NOT NULL DEFAULT '[]';
ALTER TABLE custom_agent_roles ADD COLUMN customization_schema TEXT NOT NULL DEFAULT '{}';
ALTER TABLE custom_agent_roles ADD COLUMN menu_config TEXT NOT NULL DEFAULT '[]';
