-- ==================================================
-- ESTOQUE CLINIC - MIGRATION 002
-- Otimizar tabelas existentes para produção
-- ==================================================

-- Otimizar tabela de usuários
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_clinic_id ON users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Índices compostos para users
CREATE INDEX IF NOT EXISTS idx_users_clinic_active ON users(clinic_id, is_active);
CREATE INDEX IF NOT EXISTS idx_users_email_active ON users(email, is_active);

-- Otimizar tabela de produtos
CREATE INDEX IF NOT EXISTS idx_products_clinic_id ON aesthetic_products(clinic_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON aesthetic_products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON aesthetic_products(category);
CREATE INDEX IF NOT EXISTS idx_products_active ON aesthetic_products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_stock ON aesthetic_products(current_stock);

-- Índices compostos para products
CREATE INDEX IF NOT EXISTS idx_products_clinic_active ON aesthetic_products(clinic_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_clinic_category ON aesthetic_products(clinic_id, category);

-- Otimizar tabela de movimentações (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movements') THEN
        CREATE INDEX IF NOT EXISTS idx_movements_product_id ON inventory_movements(product_id);
        CREATE INDEX IF NOT EXISTS idx_movements_user_id ON inventory_movements(user_id);
        CREATE INDEX IF NOT EXISTS idx_movements_clinic_id ON inventory_movements(clinic_id);
        CREATE INDEX IF NOT EXISTS idx_movements_type ON inventory_movements(movement_type);
        CREATE INDEX IF NOT EXISTS idx_movements_date ON inventory_movements(movement_date);
        
        -- Índices compostos para movements
        CREATE INDEX IF NOT EXISTS idx_movements_product_date ON inventory_movements(product_id, movement_date);
        CREATE INDEX IF NOT EXISTS idx_movements_clinic_date ON inventory_movements(clinic_id, movement_date);
    END IF;
END $$;

-- Otimizar tabela de clínicas
CREATE INDEX IF NOT EXISTS idx_clinics_name ON clinics(name);
CREATE INDEX IF NOT EXISTS idx_clinics_active ON clinics(is_active);
CREATE INDEX IF NOT EXISTS idx_clinics_group_id ON clinics(group_id);

-- Otimizar tabela de grupos de clínicas
CREATE INDEX IF NOT EXISTS idx_clinic_groups_name ON clinic_groups(name);
CREATE INDEX IF NOT EXISTS idx_clinic_groups_active ON clinic_groups(is_active);

-- Otimizar tabela de sessões (se existir)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') THEN
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
        CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
        CREATE INDEX IF NOT EXISTS idx_sessions_revoked ON sessions(revoked_at);
    END IF;
END $$;

-- Atualizar estatísticas para o otimizador de queries
ANALYZE;

-- Comentários para documentação
COMMENT ON INDEX idx_users_clinic_active IS 'Índice otimizado para buscar usuários ativos por clínica';
COMMENT ON INDEX idx_products_clinic_category IS 'Índice otimizado para filtrar produtos por clínica e categoria';
COMMENT ON INDEX idx_audit_user_action IS 'Índice otimizado para relatórios de auditoria por usuário e ação';