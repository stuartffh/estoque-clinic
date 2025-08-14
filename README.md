# EstoqueClinic - Sistema de Gestão de Estoque para Clínicas Estéticas

Sistema completo de gestão de inventário especializado para clínicas estéticas, com foco em produtos como Botox, preenchedores e bioestimuladores. Oferece multi-tenancy, controle de temperatura, rastreamento de lotes e gestão completa de procedimentos estéticos.

## 🚀 Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web para API REST
- **PostgreSQL** - Banco de dados relacional
- **JWT (jsonwebtoken)** - Autenticação e autorização
- **bcryptjs** - Hash de senhas seguro
- **Swagger** - Documentação da API
- **CORS** - Cross-Origin Resource Sharing
- **Helmet** - Segurança HTTP headers
- **Rate Limiting** - Proteção contra ataques DDoS

### Frontend
- **Angular** - Framework frontend moderno
- **PrimeNG** - Componentes UI profissionais
- **Tailwind CSS** - Framework CSS utilitário
- **RxJS** - Programação reativa
- **TypeScript** - Linguagem tipada
- **Chart.js** - Gráficos e dashboards
- **PrimeIcons** - Ícones vetoriais

## 📁 Estrutura do Projeto

```
estoque-clinic-sistema/
├── backend/                      # API REST Node.js
│   ├── config/                  # Configurações do banco
│   ├── middleware/              # Middlewares (auth, error handling)
│   ├── routes/                  # Rotas da API
│   │   ├── clinic-groups.js     # Gestão de grupos de clínicas
│   │   ├── clinics.js          # Gestão de clínicas
│   │   ├── aesthetic-products.js # Catálogo de produtos estéticos
│   │   ├── inventory.js        # Gestão de estoque
│   │   └── ...
│   ├── database/               # Scripts SQL
│   │   ├── schema.sql          # Estrutura completa do banco
│   │   └── seed.sql           # Dados iniciais
│   ├── models/                # Models de dados
│   ├── uploads/               # Imagens de produtos
│   ├── .env                   # Variáveis de ambiente
│   ├── .env.example          # Template de configuração
│   ├── server.js             # Servidor principal
│   ├── swagger.json          # Documentação da API
│   └── package.json          # Dependências do backend
├── frontend/                 # Aplicação Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── components/        # Componentes da aplicação
│   │   │   │   ├── clinics/       # Gestão de clínicas
│   │   │   │   ├── inventory/     # Dashboard de estoque
│   │   │   │   ├── aesthetic-products/ # Catálogo de produtos
│   │   │   │   └── ...
│   │   │   ├── services/          # Serviços Angular
│   │   │   ├── guards/           # Guards de autenticação
│   │   │   ├── interceptors/     # Interceptors HTTP
│   │   │   └── models/           # Interfaces TypeScript
│   │   ├── assets/              # Assets estáticos
│   │   └── environments/        # Configurações de ambiente
│   └── package.json            # Dependências do frontend
├── package.json               # Scripts do projeto raiz
└── README.md                 # Documentação
```

## 🛠️ Instalação e Configuração

### Pré-requisitos
- **Node.js** (versão 18 ou superior)
- **PostgreSQL** (versão 12 ou superior)
- **npm** ou yarn
- **Git** para controle de versão

### 1. Clonar o repositório
```bash
git clone <url-do-repositorio>
cd estoque-clinic-sistema
```

### 2. Instalar dependências
```bash
# Instalar dependências do projeto raiz
npm install

# Instalar dependências do backend
npm run install:backend

# Instalar dependências do frontend
npm run install:frontend

# Ou instalar todas de uma vez
npm run install:all
```

### 3. Configurar PostgreSQL
```bash
# Criar banco de dados para EstoqueClinic
createdb estoque_clinic

# Executar scripts de criação das tabelas
psql -d estoque_clinic -f backend/database/schema.sql
psql -d estoque_clinic -f backend/database/seed.sql
```

### 4. Configurar variáveis de ambiente
Copie o arquivo de exemplo e configure suas variáveis:

```bash
cp backend/.env.example backend/.env
```

Configure o arquivo `.env` com seus dados:

```env
# Configurações do servidor
PORT=3000
NODE_ENV=development

# JWT Secret (ALTERE para uma chave segura em produção)
JWT_SECRET=estoque_clinic_jwt_secret_key_2024

# Configurações do banco de dados EstoqueClinic
DB_HOST=localhost
DB_PORT=5432
DB_NAME=estoque_clinic
DB_USER=postgres
DB_PASSWORD=postgres

# CORS - Frontend Angular
CORS_ORIGIN=http://localhost:4200

# Upload de imagens
UPLOAD_MAX_SIZE=5242880
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/webp

# Configurações de e-mail (para alertas)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Configurações de temperatura (limites para alertas)
TEMP_MIN_THRESHOLD=2
TEMP_MAX_THRESHOLD=8
```

Para o frontend em produção, defina a variável de ambiente `NG_APP_API_URL` com a URL da API antes de executar o build.
Em desenvolvimento, o arquivo `src/environments/environment.ts` já utiliza `http://localhost:3000` por padrão.

## 🚀 Executando o Projeto

### Opção 1: Executar frontend e backend juntos (Recomendado)
```bash
npm start
# ou
npm run dev
```

### Opção 2: Executar separadamente

#### Backend (porta 3000)
```bash
npm run start:backend
```

#### Frontend (porta 4200)
```bash
npm run start:frontend
```

## 🔐 Credenciais de Teste

O sistema cria automaticamente contas para demonstração:

### Super Administrador (Multi-tenancy)
- **Email:** `superadmin@estoqueclinic.com`
- **Senha:** `SuperAdmin123!`
- **Acesso:** Todos os grupos de clínicas

### Administrador de Clínica
- **Email:** `admin@clinicaestetica.com`
- **Senha:** `Admin123!`
- **Acesso:** Clínica específica

### Profissional da Clínica
- **Email:** `medico@clinicaestetica.com`
- **Senha:** `Medico123!`
- **Acesso:** Visualização e procedimentos

## 📱 Funcionalidades EstoqueClinic

### 🏥 Multi-Tenancy (Grupos de Clínicas)
- Gestão de múltiplos grupos de clínicas
- Isolamento total de dados por grupo
- Administração hierárquica de usuários
- Configurações personalizadas por grupo

### 🏢 Gestão de Clínicas
- Cadastro completo de clínicas
- Configuração de endereços e contatos
- Gestão de profissionais por clínica
- Upload de logos e imagens

### 💉 Catálogo de Produtos Estéticos
- **Botox** - Toxina botulínica tipo A
- **Preenchedores** - Ácido hialurônico, hidroxiapatita
- **Bioestimuladores** - PLLA, PCL, estimuladores de colágeno
- Controle de lotes e validade
- Rastreabilidade completa

### 📦 Gestão de Estoque
- Entrada e saída de produtos
- Controle de temperatura (2-8°C)
- Alertas automáticos de vencimento
- Relatórios de movimentação
- Dashboard com métricas em tempo real

### 👨‍⚕️ Gestão de Procedimentos
- Registro de procedimentos estéticos
- Vinculação de produtos utilizados
- Histórico por paciente
- Controle de profissionais responsáveis

### 🌡️ Monitoramento de Temperatura
- Logs automáticos de temperatura
- Alertas em tempo real
- Histórico de variações
- Integração com sensores IoT

### Backend (API REST)

#### Autenticação Multi-Tenant
- `POST /auth/login` - Login com seleção de clínica
- `POST /auth/logout` - Logout seguro
- `GET /auth/me` - Dados do usuário autenticado
- `POST /auth/validate` - Validação de token JWT

#### Grupos de Clínicas
- `GET /clinic-groups` - Listar grupos (super admin)
- `POST /clinic-groups` - Criar novo grupo
- `PUT /clinic-groups/:id` - Atualizar grupo
- `DELETE /clinic-groups/:id` - Remover grupo

#### Clínicas
- `GET /clinics` - Listar clínicas do grupo
- `POST /clinics` - Cadastrar nova clínica
- `PUT /clinics/:id` - Atualizar dados da clínica
- `DELETE /clinics/:id` - Remover clínica

#### Produtos Estéticos
- `GET /aesthetic-products` - Catálogo de produtos
- `POST /aesthetic-products` - Cadastrar produto
- `PUT /aesthetic-products/:id` - Atualizar produto
- `GET /aesthetic-products/categories` - Categorias

#### Gestão de Estoque
- `GET /inventory` - Dashboard de estoque
- `POST /inventory/movements` - Registrar movimentação
- `GET /inventory/alerts` - Alertas de vencimento
- `GET /inventory/reports` - Relatórios
- `POST /inventory/temperature-logs` - Log de temperatura

### Frontend (Angular)

#### Principais Telas
- **Login Multi-Tenant** - Seleção de clínica e autenticação
- **Dashboard de Estoque** - Métricas em tempo real:
  - Produtos próximos ao vencimento
  - Níveis de estoque por categoria
  - Alertas de temperatura
  - Movimentações recentes
- **Gestão de Clínicas** - CRUD completo de clínicas
- **Catálogo de Produtos** - Navegação por produtos estéticos:
  - Filtros por categoria (Botox, Preenchedores, Bioestimuladores)
  - Detalhes técnicos e armazenamento
  - Upload de imagens
- **Controle de Estoque** - Movimentações e relatórios:
  - Entrada e saída de produtos
  - Histórico de movimentações
  - Relatórios personalizados

#### Funcionalidades Angular
- **Multi-Tenancy** - Isolamento de dados por clínica
- **Autenticação JWT** - Login com seleção de contexto
- **Guards Hierárquicos** - Controle de acesso por nível
- **Interceptors** - Injeção automática de headers de tenant
- **PrimeNG Components** - Interface profissional
- **Responsive Design** - Otimizado para tablets (uso clínico)
- **Real-time Updates** - WebSocket para alertas
- **PWA Ready** - Funcionamento offline básico

## 🔒 Segurança EstoqueClinic

### Compliance e Regulamentações
- **LGPD** - Proteção de dados de pacientes
- **ANVISA** - Rastreabilidade de produtos controlados
- **CFM** - Segurança de dados médicos
- **ISO 27001** - Gestão de segurança da informação

### Backend Security
- **Multi-Tenant Security** - Isolamento total de dados por clínica
- **JWT + Tenant Headers** - Autenticação com contexto
- **Role-Based Access** - Controle granular de permissões
- **Audit Trails** - Log de todas as operações críticas
- **Encrypted Storage** - Dados sensíveis criptografados
- **Rate Limiting** - Proteção contra ataques
- **Input Sanitization** - Validação rigorosa de entradas
- **SQL Injection Protection** - Queries parametrizadas

### Frontend Security  
- **Tenant Context Guards** - Validação de contexto
- **XSS Protection** - Sanitização de conteúdo
- **CSRF Tokens** - Proteção contra ataques cross-site
- **Session Management** - Controle de sessões por clínica
- **Secure Headers** - Headers de segurança HTTP

## 🎨 Interface do Usuário

### Design System
- **Cores Primárias** - Azul (#2563eb)
- **Tipografia** - Inter (Google Fonts)
- **Componentes** - PrimeNG + CSS customizado
- **Layout** - Flexbox e Grid CSS
- **Responsividade** - Mobile-first approach

### Componentes PrimeNG Utilizados
- Button, Card, InputText, Password
- Table, ProgressBar, Tag, Avatar
- Toast, Message, Menu

## 📊 Banco de Dados EstoqueClinic

### Estrutura Multi-Tenant (PostgreSQL)

O sistema utiliza uma arquitetura multi-tenant com as seguintes principais tabelas:

#### Core Tables (Multi-tenancy)
- **`clinic_groups`** - Grupos de clínicas (isolamento de dados)
- **`clinics`** - Clínicas individuais dentro dos grupos
- **`users`** - Usuários com contexto de clínica

#### Produtos e Estoque
- **`aesthetic_products`** - Catálogo de produtos estéticos
- **`product_batches`** - Lotes com validade e controle
- **`inventory_movements`** - Movimentações de entrada/saída
- **`temperature_logs`** - Logs de monitoramento de temperatura

#### Gestão Clínica
- **`professionals`** - Médicos e profissionais da clínica
- **`patients`** - Pacientes cadastrados
- **`procedures`** - Procedimentos realizados
- **`procedure_items`** - Produtos utilizados nos procedimentos

#### Monitoramento e Alertas
- **`system_alerts`** - Alertas de vencimento e temperatura
- **`audit_logs`** - Log de auditoria para compliance

### Principais Características
- **Row Level Security (RLS)** - Isolamento automático por tenant
- **Indexes Otimizados** - Performance para consultas complexas
- **Triggers** - Atualizações automáticas e logs de auditoria
- **Views Materializadas** - Dashboards e relatórios rápidos
- **Constraints** - Integridade referencial rigorosa

### Dados de Exemplo
O sistema inclui dados de demonstração:
- Produtos estéticos populares (Botox, Juvederm, Sculptra)
- Lotes com diferentes status de validade
- Movimentações de estoque realistas
- Logs de temperatura simulados

## 🔧 Scripts Disponíveis

### Projeto Raiz
- `npm start` - Iniciar frontend e backend juntos
- `npm run dev` - Alias para start
- `npm run install:all` - Instalar todas as dependências
- `npm run install:backend` - Instalar dependências do backend
- `npm run install:frontend` - Instalar dependências do frontend
- `npm run start:backend` - Iniciar apenas o backend
- `npm run start:frontend` - Iniciar apenas o frontend
- `npm run build:frontend` - Build do frontend
- `npm run build` - Build completo

### Backend
- `npm start` - Iniciar servidor
- `npm run dev` - Iniciar com nodemon (desenvolvimento)
- `npm run init-db` - Inicializar banco de dados

### Frontend
- `npm start` - Iniciar servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run serve` - Servir build de produção

## 🌐 URLs de Acesso

- **Frontend:** http://localhost:4200
- **Backend API:** http://localhost:3000
- **Health Check:** http://localhost:3000/health

## 🐛 Troubleshooting

### Problemas Comuns

#### 1. Erro de CORS
Verifique se a variável `CORS_ORIGIN` no `.env` está configurada corretamente.

#### 2. Erro de conexão com banco
Certifique-se de que o banco PostgreSQL esteja configurado e acessível; utilize os arquivos SQL em `backend/database` para criar as tabelas.

#### 3. Token inválido
Limpe o localStorage do navegador ou faça logout e login novamente.

#### 4. Porta em uso
Altere as portas nos arquivos de configuração se necessário:
- Backend: `.env` (PORT=3000)
- Frontend: `angular.json` (serve.options.port)

### Logs
- **Backend:** Console do terminal onde o servidor está rodando
- **Frontend:** Console do navegador (F12)

## 📈 Próximos Passos

### Melhorias Sugeridas
1. **Testes** - Implementar testes unitários e e2e
2. **Docker** - Containerização da aplicação
3. **CI/CD** - Pipeline de deploy automatizado
4. **Monitoramento** - Logs estruturados e métricas
5. **Cache** - Redis para sessões e cache
6. **Upload de Arquivos** - Funcionalidade de upload
7. **Notificações Push** - WebSockets ou Server-Sent Events
8. **Internacionalização** - Suporte a múltiplos idiomas

### Produção
1. **Variáveis de Ambiente** - Configurar para produção
2. **HTTPS** - Certificados SSL/TLS
3. **Banco de Dados** - Implementar migrations e otimizações
4. **Load Balancer** - Para alta disponibilidade
5. **CDN** - Para assets estáticos

## 👥 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte e dúvidas:
- Abra uma issue no GitHub
- Entre em contato via email

---

**Desenvolvido com ❤️ usando Angular + Node.js**

