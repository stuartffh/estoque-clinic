-- ==================================================
-- ESTOQUE CLINIC - MIGRATION 001
-- Criar tabela de auditoria para sistema de segurança
-- ==================================================

-- Criar tabela de auditoria
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    action VARCHAR(50) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    resource_id VARCHAR(100),
    user_id INTEGER,
    username VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    level VARCHAR(20) DEFAULT 'medium',
    details JSONB,
    old_values JSONB,
    new_values JSONB,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    session_id VARCHAR(100),
    clinic_id INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_level ON audit_logs(level);
CREATE INDEX IF NOT EXISTS idx_audit_clinic_id ON audit_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_audit_success ON audit_logs(success);

-- Índices compostos para queries comuns
CREATE INDEX IF NOT EXISTS idx_audit_user_action ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_resource_time ON audit_logs(resource, timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_clinic_time ON audit_logs(clinic_id, timestamp);

-- Comentários para documentação
COMMENT ON TABLE audit_logs IS 'Log de auditoria para rastreamento de ações críticas do sistema';
COMMENT ON COLUMN audit_logs.action IS 'Ação realizada (CREATE, READ, UPDATE, DELETE, LOGIN, etc.)';
COMMENT ON COLUMN audit_logs.resource IS 'Recurso afetado (users, products, inventory, etc.)';
COMMENT ON COLUMN audit_logs.level IS 'Nível de criticidade (low, medium, high, critical)';
COMMENT ON COLUMN audit_logs.details IS 'Detalhes da ação em formato JSON';
COMMENT ON COLUMN audit_logs.old_values IS 'Valores anteriores à modificação (JSON)';
COMMENT ON COLUMN audit_logs.new_values IS 'Novos valores após modificação (JSON)';

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_audit_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger
DROP TRIGGER IF EXISTS update_audit_logs_updated_at ON audit_logs;
CREATE TRIGGER update_audit_logs_updated_at
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_audit_updated_at();