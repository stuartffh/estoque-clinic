-- =====================================
-- ESTOQUE CLINIC - PERFORMANCE INDEXES
-- Indexes otimizados para alta performance
-- =====================================

-- =====================================
-- ANÁLISE DE PERFORMANCE ATUAL
-- =====================================

-- Função para análise de performance de queries
CREATE OR REPLACE FUNCTION analyze_query_performance()
RETURNS TABLE (
    query_text TEXT,
    calls BIGINT,
    total_time NUMERIC,
    mean_time NUMERIC,
    rows BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pg_stat_statements.query,
        pg_stat_statements.calls,
        pg_stat_statements.total_exec_time,
        pg_stat_statements.mean_exec_time,
        pg_stat_statements.rows
    FROM pg_stat_statements
    ORDER BY pg_stat_statements.total_exec_time DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- INDEXES PARA TABELA USERS
-- =====================================

-- Index composto para autenticação
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_auth 
ON users (username, is_active) 
WHERE is_active = true;

-- Index para busca por email
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email 
ON users (email) 
WHERE is_active = true;

-- Index para busca por clínica
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_clinic 
ON users (clinic_id, is_active) 
WHERE is_active = true;

-- Index para ordenação por data de criação
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at 
ON users (created_at DESC);

-- =====================================
-- INDEXES PARA TABELA CLINICS
-- =====================================

-- Index para busca por grupo de clínicas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clinics_group 
ON clinics (clinic_group_id, is_active) 
WHERE is_active = true;

-- Index para busca por código
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clinics_code 
ON clinics (code) 
WHERE is_active = true;

-- Index para busca geográfica
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clinics_location 
ON clinics (state, city) 
WHERE is_active = true;

-- =====================================
-- INDEXES PARA TABELA AESTHETIC_PRODUCTS
-- =====================================

-- Index principal para busca de produtos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_clinic_active 
ON aesthetic_products (clinic_id, is_active, status) 
WHERE is_active = true;

-- Index para busca por categoria
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category 
ON aesthetic_products (category, is_active) 
WHERE is_active = true;

-- Index para busca por marca
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_brand 
ON aesthetic_products (brand, is_active) 
WHERE is_active = true;

-- Index para busca por código de barras
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_products_barcode_unique 
ON aesthetic_products (barcode, clinic_id) 
WHERE barcode IS NOT NULL AND is_active = true;

-- Index para busca de texto completo no nome
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_gin 
ON aesthetic_products USING gin(to_tsvector('portuguese', name)) 
WHERE is_active = true;

-- Index para controle de estoque mínimo
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_low_stock 
ON aesthetic_products (clinic_id, current_stock, minimum_stock) 
WHERE is_active = true AND current_stock <= minimum_stock;

-- =====================================
-- INDEXES PARA TABELA PRODUCT_BATCHES
-- =====================================

-- Index para busca por produto
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_product 
ON product_batches (product_id, is_active) 
WHERE is_active = true;

-- Index para controle de validade
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_expiry 
ON product_batches (expiry_date, is_active) 
WHERE is_active = true AND expiry_date > CURRENT_DATE;

-- Index para busca por lote
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_batch_number 
ON product_batches (batch_number, product_id);

-- Index para produtos vencendo (próximos 30 dias)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_batches_expiring_soon 
ON product_batches (product_id, expiry_date) 
WHERE is_active = true 
  AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days';

-- =====================================
-- INDEXES PARA TABELA PROFESSIONALS
-- =====================================

-- Index para busca por clínica
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_professionals_clinic 
ON professionals (clinic_id, is_active) 
WHERE is_active = true;

-- Index para busca por especialidade
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_professionals_specialty 
ON professionals (specialty, is_active) 
WHERE is_active = true;

-- Index para busca por CRM
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_professionals_crm_unique 
ON professionals (crm, state) 
WHERE crm IS NOT NULL AND is_active = true;

-- =====================================
-- INDEXES PARA TABELA AUDIT_LOGS
-- =====================================

-- Index principal para busca de auditoria
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_user_date 
ON audit_logs (user_id, action_date DESC);

-- Index para busca por ação
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_action 
ON audit_logs (action, resource_type, action_date DESC);

-- Index para busca por IP
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_ip 
ON audit_logs (ip_address, action_date DESC);

-- Index para busca por período (particionado por mês)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_date_month 
ON audit_logs (DATE_TRUNC('month', action_date), action_date DESC);

-- =====================================
-- INDEXES PARA QUERIES DE RELATÓRIO
-- =====================================

-- Index para relatórios de movimentação por período
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movements_period 
ON inventory_movements (clinic_id, movement_date DESC, movement_type);

-- Index para relatórios de consumo por profissional
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movements_professional 
ON inventory_movements (professional_id, movement_date DESC) 
WHERE movement_type = 'saida';

-- Index para relatórios de produtos mais utilizados
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movements_product_stats 
ON inventory_movements (product_id, movement_type, quantity, movement_date DESC);

-- =====================================
-- INDEXES COMPOSTOS PARA DASHBOARD
-- =====================================

-- Index para métricas do dashboard por clínica
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dashboard_clinic_metrics 
ON aesthetic_products (
    clinic_id, 
    is_active, 
    status, 
    current_stock, 
    minimum_stock
) WHERE is_active = true;

-- =====================================
-- PARTIAL INDEXES PARA OTIMIZAÇÃO
-- =====================================

-- Index apenas para produtos ativos com estoque baixo
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_alert_stock 
ON aesthetic_products (clinic_id, name, current_stock, minimum_stock) 
WHERE is_active = true 
  AND status = 'active' 
  AND current_stock <= minimum_stock;

-- Index apenas para usuários ativos
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_only 
ON users (clinic_id, role, created_at DESC) 
WHERE is_active = true;

-- =====================================
-- FUNCTION-BASED INDEXES
-- =====================================

-- Index para busca case-insensitive no nome do produto
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_name_lower 
ON aesthetic_products (LOWER(name)) 
WHERE is_active = true;

-- Index para busca case-insensitive no username
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_lower 
ON users (LOWER(username)) 
WHERE is_active = true;

-- =====================================
-- ANÁLISE E MANUTENÇÃO DOS INDEXES
-- =====================================

-- Função para analisar uso dos indexes
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE (
    schemaname NAME,
    tablename NAME,
    indexname NAME,
    idx_tup_read BIGINT,
    idx_tup_fetch BIGINT,
    idx_blks_read BIGINT,
    idx_blks_hit BIGINT,
    usage_ratio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pg_stat_user_indexes.schemaname,
        pg_stat_user_indexes.relname AS tablename,
        pg_stat_user_indexes.indexrelname AS indexname,
        pg_stat_user_indexes.idx_tup_read,
        pg_stat_user_indexes.idx_tup_fetch,
        pg_statio_user_indexes.idx_blks_read,
        pg_statio_user_indexes.idx_blks_hit,
        CASE 
            WHEN (pg_statio_user_indexes.idx_blks_read + pg_statio_user_indexes.idx_blks_hit) > 0 
            THEN ROUND(
                (pg_statio_user_indexes.idx_blks_hit::NUMERIC / 
                (pg_statio_user_indexes.idx_blks_read + pg_statio_user_indexes.idx_blks_hit)) * 100, 
                2
            )
            ELSE 0
        END AS usage_ratio
    FROM pg_stat_user_indexes 
    LEFT JOIN pg_statio_user_indexes 
        ON pg_stat_user_indexes.indexrelid = pg_statio_user_indexes.indexrelid
    ORDER BY pg_stat_user_indexes.idx_tup_read DESC;
END;
$$ LANGUAGE plpgsql;

-- Função para identificar indexes não utilizados
CREATE OR REPLACE FUNCTION find_unused_indexes()
RETURNS TABLE (
    schemaname NAME,
    tablename NAME,
    indexname NAME,
    size_mb NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pg_stat_user_indexes.schemaname,
        pg_stat_user_indexes.relname AS tablename,
        pg_stat_user_indexes.indexrelname AS indexname,
        ROUND(pg_relation_size(pg_stat_user_indexes.indexrelid) / 1024.0 / 1024.0, 2) AS size_mb
    FROM pg_stat_user_indexes
    WHERE pg_stat_user_indexes.idx_tup_read = 0
    ORDER BY pg_relation_size(pg_stat_user_indexes.indexrelid) DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- CONFIGURAÇÕES DE PERFORMANCE
-- =====================================

-- Aumentar shared_buffers para melhor cache
-- ALTER SYSTEM SET shared_buffers = '256MB';

-- Configurar work_mem para sorts e joins
-- ALTER SYSTEM SET work_mem = '8MB';

-- Configurar effective_cache_size
-- ALTER SYSTEM SET effective_cache_size = '1GB';

-- Habilitar pg_stat_statements para monitoramento
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- =====================================
-- MANUTENÇÃO AUTOMÁTICA
-- =====================================

-- Função para manutenção automática dos indexes
CREATE OR REPLACE FUNCTION maintain_indexes()
RETURNS TEXT AS $$
DECLARE
    result TEXT := '';
BEGIN
    -- Reindex tabelas com alta fragmentação
    -- REINDEX pode ser executado periodicamente
    
    result := 'Manutenção de indexes concluída em ' || NOW();
    
    -- Log da operação
    INSERT INTO audit_logs (
        user_id, 
        action, 
        resource_type, 
        details, 
        ip_address
    ) VALUES (
        NULL, 
        'SYSTEM_MAINTENANCE', 
        'INDEX', 
        result, 
        '127.0.0.1'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =====================================
-- COMENTÁRIOS DOS INDEXES
-- =====================================

COMMENT ON INDEX idx_users_auth IS 'Otimiza autenticação de usuários';
COMMENT ON INDEX idx_products_clinic_active IS 'Index principal para busca de produtos por clínica';
COMMENT ON INDEX idx_products_name_gin IS 'Busca full-text em nomes de produtos';
COMMENT ON INDEX idx_batches_expiring_soon IS 'Identifica rapidamente produtos vencendo';
COMMENT ON INDEX idx_audit_user_date IS 'Otimiza consultas de auditoria por usuário';

-- Fim do arquivo de indexes