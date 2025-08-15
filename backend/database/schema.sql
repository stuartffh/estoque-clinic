-- =====================================
-- ESTOQUE CLINIC - Database Schema
-- =====================================
-- Sistema de gestão de estoque para clínicas estéticas
-- Suporte a multi-tenancy com isolamento completo de dados

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================
-- CORE TABLES (Multi-tenancy)
-- =====================================

-- Grupos de clínicas (nível mais alto de multi-tenancy)
CREATE TABLE IF NOT EXISTS clinic_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    admin_email VARCHAR(255) NOT NULL,
    admin_phone VARCHAR(20),
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_expires_at TIMESTAMP,
    max_clinics INTEGER DEFAULT 10,
    max_users INTEGER DEFAULT 100,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clínicas individuais dentro dos grupos
CREATE TABLE IF NOT EXISTS clinics (
    id SERIAL PRIMARY KEY,
    clinic_group_id INTEGER NOT NULL REFERENCES clinic_groups(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE,
    cro_number VARCHAR(20),
    address_street VARCHAR(255),
    address_number VARCHAR(20),
    address_complement VARCHAR(100),
    address_neighborhood VARCHAR(100),
    address_city VARCHAR(100),
    address_state VARCHAR(2),
    address_zipcode VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usuários do sistema com contexto de clínica
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    clinic_group_id INTEGER NOT NULL REFERENCES clinic_groups(id) ON DELETE CASCADE,
    clinic_id INTEGER REFERENCES clinics(id) ON DELETE SET NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user', -- super_admin, admin, manager, user, viewer
    permissions JSONB DEFAULT '[]',
    phone VARCHAR(20),
    avatar_url VARCHAR(255),
    last_login_at TIMESTAMP,
    password_changed_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessões de usuário
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    clinic_id INTEGER REFERENCES clinics(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    refresh_token_hash TEXT,
    expires_at TIMESTAMP NOT NULL,
    refresh_expires_at TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- PRODUCT CATALOG TABLES
-- =====================================

-- Catálogo de produtos estéticos
CREATE TABLE IF NOT EXISTS aesthetic_products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL, -- botox, filler, biostimulator, equipment, consumable
    subcategory VARCHAR(50), -- toxin_a, hyaluronic_acid, plla, pcl, etc.
    concentration VARCHAR(50), -- 100UI, 50UI, 1ml, etc.
    volume_ml DECIMAL(8,2),
    units_per_package INTEGER DEFAULT 1,
    anvisa_registry VARCHAR(50),
    manufacturer VARCHAR(100),
    active_principle VARCHAR(100),
    storage_temp_min DECIMAL(4,1) DEFAULT 2.0,
    storage_temp_max DECIMAL(4,1) DEFAULT 8.0,
    shelf_life_months INTEGER DEFAULT 24,
    description TEXT,
    usage_instructions TEXT,
    contraindications TEXT,
    image_url VARCHAR(255),
    barcode VARCHAR(50),
    is_controlled BOOLEAN DEFAULT false, -- Produto controlado ANVISA
    requires_prescription BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- INVENTORY MANAGEMENT TABLES
-- =====================================

-- Lotes de produtos com controle de validade
CREATE TABLE IF NOT EXISTS product_batches (
    id SERIAL PRIMARY KEY,
    clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES aesthetic_products(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    manufacturing_date DATE,
    expiry_date DATE NOT NULL,
    supplier VARCHAR(100),
    supplier_invoice VARCHAR(50),
    purchase_price DECIMAL(10,2),
    current_stock INTEGER NOT NULL DEFAULT 0,
    reserved_stock INTEGER DEFAULT 0, -- Produto reservado para procedimentos
    min_stock_alert INTEGER DEFAULT 5,
    storage_location VARCHAR(100),
    storage_temperature DECIMAL(4,1),
    received_by INTEGER REFERENCES users(id),
    notes TEXT,
    status VARCHAR(20) DEFAULT 'active', -- active, expired, recalled, depleted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(clinic_id, product_id, batch_number)
);

-- Movimentações de estoque (entrada, saída, ajustes)
CREATE TABLE IF NOT EXISTS inventory_movements (
    id SERIAL PRIMARY KEY,
    clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    batch_id INTEGER NOT NULL REFERENCES product_batches(id) ON DELETE CASCADE,
    movement_type VARCHAR(20) NOT NULL, -- inbound, outbound, adjustment, transfer, return
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    reason VARCHAR(100),
    reference_document VARCHAR(100), -- Nota fiscal, receita, etc.
    procedure_id INTEGER, -- Referência para procedimentos
    moved_by INTEGER NOT NULL REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- CLINICAL MANAGEMENT TABLES
-- =====================================

-- Profissionais da clínica
CREATE TABLE IF NOT EXISTS professionals (
    id SERIAL PRIMARY KEY,
    clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    professional_type VARCHAR(50) NOT NULL, -- doctor, nurse, assistant, admin
    specialty VARCHAR(100), -- dermatologist, plastic_surgeon, etc.
    license_number VARCHAR(50), -- CRM, COREN, etc.
    license_state VARCHAR(2),
    phone VARCHAR(20),
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pacientes
CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) UNIQUE,
    birth_date DATE,
    gender VARCHAR(10),
    phone VARCHAR(20),
    email VARCHAR(255),
    address_street VARCHAR(255),
    address_number VARCHAR(20),
    address_complement VARCHAR(100),
    address_neighborhood VARCHAR(100),
    address_city VARCHAR(100),
    address_state VARCHAR(2),
    address_zipcode VARCHAR(10),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(20),
    allergies TEXT,
    medical_history TEXT,
    current_medications TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Procedimentos realizados
CREATE TABLE IF NOT EXISTS procedures (
    id SERIAL PRIMARY KEY,
    clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    professional_id INTEGER NOT NULL REFERENCES professionals(id),
    procedure_type VARCHAR(100) NOT NULL,
    treatment_area VARCHAR(100),
    procedure_date TIMESTAMP NOT NULL,
    pre_procedure_photos TEXT[], -- URLs das fotos
    post_procedure_photos TEXT[], -- URLs das fotos
    observations TEXT,
    complications TEXT,
    next_appointment_date DATE,
    total_cost DECIMAL(10,2),
    payment_status VARCHAR(20) DEFAULT 'pending', -- pending, paid, partial, cancelled
    status VARCHAR(20) DEFAULT 'completed', -- scheduled, in_progress, completed, cancelled
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Produtos utilizados nos procedimentos
CREATE TABLE IF NOT EXISTS procedure_items (
    id SERIAL PRIMARY KEY,
    procedure_id INTEGER NOT NULL REFERENCES procedures(id) ON DELETE CASCADE,
    batch_id INTEGER NOT NULL REFERENCES product_batches(id),
    quantity_used INTEGER NOT NULL,
    unit_cost DECIMAL(10,2),
    total_cost DECIMAL(10,2),
    application_site VARCHAR(100),
    technique_used VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- MONITORING & ALERTS TABLES
-- =====================================

-- Logs de temperatura dos equipamentos
CREATE TABLE IF NOT EXISTS temperature_logs (
    id SERIAL PRIMARY KEY,
    clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    equipment_id VARCHAR(50) NOT NULL, -- ID do sensor/equipamento
    equipment_name VARCHAR(100),
    temperature DECIMAL(4,1) NOT NULL,
    humidity DECIMAL(4,1),
    recorded_at TIMESTAMP NOT NULL,
    is_alert BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Alertas do sistema
CREATE TABLE IF NOT EXISTS system_alerts (
    id SERIAL PRIMARY KEY,
    clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL, -- expiry, temperature, stock, equipment
    severity VARCHAR(20) NOT NULL, -- low, medium, high, critical
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    entity_type VARCHAR(50), -- batch, equipment, procedure
    entity_id INTEGER,
    assigned_to INTEGER REFERENCES users(id),
    is_read BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    resolved_by INTEGER REFERENCES users(id),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- AUDIT & SECURITY TABLES
-- =====================================

-- Log de auditoria para compliance
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    clinic_id INTEGER NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- create, update, delete, login, logout
    entity_type VARCHAR(50) NOT NULL, -- user, product, batch, procedure
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id INTEGER REFERENCES sessions(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- INDEXES FOR PERFORMANCE
-- =====================================

-- Multi-tenancy indexes
CREATE INDEX IF NOT EXISTS idx_clinics_group_id ON clinics(clinic_group_id);
CREATE INDEX IF NOT EXISTS idx_users_clinic_group_id ON users(clinic_group_id);
CREATE INDEX IF NOT EXISTS idx_users_clinic_id ON users(clinic_id);

-- Core business indexes
CREATE INDEX IF NOT EXISTS idx_product_batches_clinic_id ON product_batches(clinic_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_product_id ON product_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_product_batches_expiry_date ON product_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_product_batches_status ON product_batches(status);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_clinic_id ON inventory_movements(clinic_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_batch_id ON inventory_movements(batch_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_created_at ON inventory_movements(created_at);

CREATE INDEX IF NOT EXISTS idx_procedures_clinic_id ON procedures(clinic_id);
CREATE INDEX IF NOT EXISTS idx_procedures_patient_id ON procedures(patient_id);
CREATE INDEX IF NOT EXISTS idx_procedures_date ON procedures(procedure_date);

CREATE INDEX IF NOT EXISTS idx_temperature_logs_clinic_id ON temperature_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_temperature_logs_recorded_at ON temperature_logs(recorded_at);
CREATE INDEX IF NOT EXISTS idx_temperature_logs_alert ON temperature_logs(is_alert);

CREATE INDEX IF NOT EXISTS idx_system_alerts_clinic_id ON system_alerts(clinic_id);
CREATE INDEX IF NOT EXISTS idx_system_alerts_unread ON system_alerts(clinic_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_system_alerts_unresolved ON system_alerts(clinic_id, is_resolved) WHERE is_resolved = false;

CREATE INDEX IF NOT EXISTS idx_audit_logs_clinic_id ON audit_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- =====================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at column
DROP TRIGGER IF EXISTS update_clinic_groups_updated_at ON clinic_groups;
CREATE TRIGGER update_clinic_groups_updated_at BEFORE UPDATE ON clinic_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_clinics_updated_at ON clinics;
CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON clinics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_aesthetic_products_updated_at ON aesthetic_products;
CREATE TRIGGER update_aesthetic_products_updated_at BEFORE UPDATE ON aesthetic_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_product_batches_updated_at ON product_batches;
CREATE TRIGGER update_product_batches_updated_at BEFORE UPDATE ON product_batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_professionals_updated_at ON professionals;
CREATE TRIGGER update_professionals_updated_at BEFORE UPDATE ON professionals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_patients_updated_at ON patients;
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_procedures_updated_at ON procedures;
CREATE TRIGGER update_procedures_updated_at BEFORE UPDATE ON procedures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================
-- SAMPLE DATA
-- =====================================

-- Sample clinic group
INSERT INTO clinic_groups (name, code, description, admin_email, max_clinics, max_users) VALUES
('Grupo EstoqueClinic Demo', 'DEMO01', 'Grupo de demonstração do sistema EstoqueClinic', 'admin@estoqueclinic.com', 50, 500)
ON CONFLICT (code) DO NOTHING;

-- Sample clinic
INSERT INTO clinics (clinic_group_id, name, cnpj, address_street, address_number, address_city, address_state, phone, email) VALUES
(1, 'Clínica Estética Modelo', '12.345.678/0001-90', 'Rua das Flores', '123', 'São Paulo', 'SP', '(11) 99999-9999', 'contato@clinicaestetica.com')
ON CONFLICT DO NOTHING;

-- Sample users
INSERT INTO users (clinic_group_id, clinic_id, email, password, full_name, role) VALUES
(1, NULL, 'superadmin@estoqueclinic.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/LK0OGp2ce', 'Super Administrador', 'super_admin'),
(1, 1, 'admin@clinicaestetica.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/LK0OGp2ce', 'Administrador da Clínica', 'admin'),
(1, 1, 'medico@clinicaestetica.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/LK0OGp2ce', 'Dr. João Silva', 'user')
ON CONFLICT (email) DO NOTHING;

-- Sample aesthetic products
INSERT INTO aesthetic_products (name, brand, category, subcategory, concentration, anvisa_registry, manufacturer, storage_temp_min, storage_temp_max, description) VALUES
('Botox 100UI', 'Allergan', 'botox', 'toxin_a', '100UI', '10145510037', 'Allergan', 2.0, 8.0, 'Toxina botulínica tipo A para tratamentos estéticos'),
('Juvederm Ultra 1ml', 'Allergan', 'filler', 'hyaluronic_acid', '1ml', '10145510038', 'Allergan', 2.0, 8.0, 'Preenchedor de ácido hialurônico'),
('Sculptra 5ml', 'Galderma', 'biostimulator', 'plla', '5ml', '10145510039', 'Galderma', 15.0, 25.0, 'Bioestimulador de colágeno PLLA'),
('Radiesse 1.5ml', 'Merz', 'biostimulator', 'caha', '1.5ml', '10145510040', 'Merz', 2.0, 8.0, 'Bioestimulador de hidroxiapatita de cálcio')
ON CONFLICT DO NOTHING;

-- Sample product batches
INSERT INTO product_batches (clinic_id, product_id, batch_number, expiry_date, current_stock, purchase_price) VALUES
(1, 1, 'BOT001', '2025-12-31', 15, 800.00),
(1, 2, 'JUV001', '2025-06-30', 8, 650.00),
(1, 3, 'SCU001', '2026-03-31', 5, 1200.00),
(1, 4, 'RAD001', '2025-09-30', 12, 950.00)
ON CONFLICT (clinic_id, product_id, batch_number) DO NOTHING;

-- Sample professionals
INSERT INTO professionals (clinic_id, name, professional_type, specialty, license_number, license_state) VALUES
(1, 'Dr. João Silva', 'doctor', 'Dermatologista', 'CRM123456', 'SP'),
(1, 'Dra. Maria Santos', 'doctor', 'Cirurgiã Plástica', 'CRM789012', 'SP'),
(1, 'Enf. Ana Costa', 'nurse', 'Enfermagem Estética', 'COREN345678', 'SP')
ON CONFLICT DO NOTHING;

-- Sample temperature logs
INSERT INTO temperature_logs (clinic_id, equipment_id, equipment_name, temperature, recorded_at) VALUES
(1, 'FRIDGE_01', 'Geladeira Principal', 4.5, NOW() - INTERVAL '1 hour'),
(1, 'FRIDGE_01', 'Geladeira Principal', 4.2, NOW() - INTERVAL '2 hours'),
(1, 'FRIDGE_01', 'Geladeira Principal', 4.8, NOW() - INTERVAL '3 hours')
ON CONFLICT DO NOTHING;