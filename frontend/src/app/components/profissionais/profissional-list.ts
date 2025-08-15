import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';

import { MessageService } from 'primeng/api';

interface SimpleProfissional {
  id: number;
  name: string;
  email: string;
  role: string;
  clinic: string;
  phone: string;
  speciality: string;
  status: string;
  lastAccess: string;
}

@Component({
  selector: 'app-profissional-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
    ToastModule,
    InputTextModule,
    DropdownModule
  ],
  providers: [MessageService],
  template: `
    <div class="profissional-container">
      <p-card>
        <ng-template pTemplate="header">
          <div class="flex justify-content-between align-items-center">
            <h2>Gestão de Profissionais</h2>
            <button pButton 
                    type="button" 
                    label="Novo Profissional" 
                    icon="pi pi-plus"
                    class="p-button-primary"
                    (click)="newProfissional()">
            </button>
          </div>
        </ng-template>

        <div class="stats-grid mb-4">
          <div class="stat-card">
            <div class="stat-icon bg-primary">
              <i class="pi pi-users"></i>
            </div>
            <div class="stat-content">
              <h3>{{ totalProfissionais }}</h3>
              <p>Total de Profissionais</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon bg-green-500">
              <i class="pi pi-check-circle"></i>
            </div>
            <div class="stat-content">
              <h3>{{ profissionaisAtivos }}</h3>
              <p>Profissionais Ativos</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon bg-orange-500">
              <i class="pi pi-clock"></i>
            </div>
            <div class="stat-content">
              <h3>{{ profissionaisInativos }}</h3>
              <p>Profissionais Inativos</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon bg-purple-500">
              <i class="pi pi-building"></i>
            </div>
            <div class="stat-content">
              <h3>{{ clinicasComProfissionais }}</h3>
              <p>Clínicas com Profissionais</p>
            </div>
          </div>
        </div>

        <div class="filters mb-4">
          <span class="p-input-icon-left">
            <i class="pi pi-search"></i>
            <input type="text" 
                   pInputText 
                   placeholder="Buscar profissional..." 
                   [(ngModel)]="searchTerm">
          </span>
          <p-dropdown [options]="clinicOptions" 
                      [(ngModel)]="selectedClinic" 
                      placeholder="Todas as Clínicas"
                      [showClear]="true">
          </p-dropdown>
          <p-dropdown [options]="statusOptions" 
                      [(ngModel)]="selectedStatus" 
                      placeholder="Todos os Status"
                      [showClear]="true">
          </p-dropdown>
        </div>

        <p-table [value]="filteredProfissionais" 
                 [paginator]="true" 
                 [rows]="10"
                 [loading]="loading"
                 [tableStyle]="{'min-width': '50rem'}">
          <ng-template pTemplate="header">
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Cargo</th>
              <th>Clínica</th>
              <th>Especialidade</th>
              <th>Status</th>
              <th>Último Acesso</th>
              <th>Ações</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-profissional>
            <tr>
              <td>
                <div class="flex align-items-center gap-2">
                  <div class="user-avatar">
                    <i class="pi pi-user"></i>
                  </div>
                  <div>
                    <div class="font-medium">{{ profissional.name }}</div>
                    <div class="text-sm text-500">{{ profissional.phone }}</div>
                  </div>
                </div>
              </td>
              <td>{{ profissional.email }}</td>
              <td>
                <p-tag [value]="profissional.role" 
                       [severity]="getRoleSeverity(profissional.role)">
                </p-tag>
              </td>
              <td>{{ profissional.clinic }}</td>
              <td>{{ profissional.speciality }}</td>
              <td>
                <p-tag [value]="profissional.status" 
                       [severity]="getStatusSeverity(profissional.status)">
                </p-tag>
              </td>
              <td>{{ profissional.lastAccess }}</td>
              <td>
                <div class="flex gap-2">
                  <button pButton 
                          type="button" 
                          icon="pi pi-eye"
                          class="p-button-text p-button-sm"
                          pTooltip="Visualizar"
                          (click)="viewProfissional(profissional)">
                  </button>
                  <button pButton 
                          type="button" 
                          icon="pi pi-pencil"
                          class="p-button-text p-button-sm"
                          pTooltip="Editar"
                          (click)="editProfissional(profissional)">
                  </button>
                  <button pButton 
                          type="button" 
                          icon="pi pi-ban"
                          class="p-button-text p-button-sm p-button-danger"
                          pTooltip="Desativar"
                          (click)="toggleProfissional(profissional)">
                  </button>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>

      <p-toast></p-toast>
    </div>
  `,
  styles: [`
    .profissional-container {
      padding: 1rem;
    }
    
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }
    
    .stat-card {
      display: flex;
      align-items: center;
      padding: 1.5rem;
      background: white;
      border-radius: 8px;
      border: 1px solid #e9ecef;
      gap: 1rem;
    }
    
    .stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    
    .stat-icon i {
      font-size: 1.5rem;
    }
    
    .stat-content h3 {
      margin: 0 0 0.5rem 0;
      font-size: 2rem;
      font-weight: 600;
      color: #212529;
    }
    
    .stat-content p {
      margin: 0;
      color: #6c757d;
      font-size: 0.875rem;
    }
    
    .filters {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }
    
    .filters > * {
      min-width: 200px;
    }
    
    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #e9ecef;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #6c757d;
    }
    
    .bg-primary { background-color: #007bff; }
    .bg-green-500 { background-color: #28a745; }
    .bg-orange-500 { background-color: #fd7e14; }
    .bg-purple-500 { background-color: #6f42c1; }
  `]
})
export class ProfissionalListComponent implements OnInit {
  loading = false;
  searchTerm = '';
  selectedClinic = '';
  selectedStatus = '';

  totalProfissionais = 12;
  profissionaisAtivos = 10;
  profissionaisInativos = 2;
  clinicasComProfissionais = 3;

  clinicOptions = [
    { label: 'EstoqueClinic Centro', value: 'centro' },
    { label: 'EstoqueClinic Norte', value: 'norte' },
    { label: 'EstoqueClinic Sul', value: 'sul' }
  ];

  statusOptions = [
    { label: 'Ativo', value: 'ativo' },
    { label: 'Inativo', value: 'inativo' },
    { label: 'Férias', value: 'ferias' }
  ];

  profissionais: SimpleProfissional[] = [
    {
      id: 1,
      name: 'Dr. João Silva',
      email: 'joao.silva@estoqueclinic.com',
      role: 'Médico',
      clinic: 'EstoqueClinic Centro',
      phone: '(11) 98765-4321',
      speciality: 'Dermatologia Estética',
      status: 'Ativo',
      lastAccess: '15/08/2024 14:30'
    },
    {
      id: 2,
      name: 'Dra. Maria Santos',
      email: 'maria.santos@estoqueclinic.com',
      role: 'Enfermeira',
      clinic: 'EstoqueClinic Centro',
      phone: '(11) 91234-5678',
      speciality: 'Procedimentos Injetáveis',
      status: 'Ativo',
      lastAccess: '15/08/2024 16:45'
    },
    {
      id: 3,
      name: 'Dr. Carlos Oliveira',
      email: 'carlos.oliveira@estoqueclinic.com',
      role: 'Médico',
      clinic: 'EstoqueClinic Norte',
      phone: '(11) 95555-1234',
      speciality: 'Cirurgia Plástica',
      status: 'Ativo',
      lastAccess: '15/08/2024 13:15'
    },
    {
      id: 4,
      name: 'Ana Paula Costa',
      email: 'ana.costa@estoqueclinic.com',
      role: 'Esteticista',
      clinic: 'EstoqueClinic Sul',
      phone: '(11) 97777-8888',
      speciality: 'Tratamentos Faciais',
      status: 'Férias',
      lastAccess: '10/08/2024 17:00'
    },
    {
      id: 5,
      name: 'Dr. Pedro Martins',
      email: 'pedro.martins@estoqueclinic.com',
      role: 'Médico',
      clinic: 'EstoqueClinic Centro',
      phone: '(11) 93333-4444',
      speciality: 'Medicina Estética',
      status: 'Ativo',
      lastAccess: '15/08/2024 15:20'
    }
  ];

  constructor(private messageService: MessageService) {}

  ngOnInit() {
    // Implementação inicial se necessário
  }

  get filteredProfissionais(): SimpleProfissional[] {
    return this.profissionais.filter(prof => {
      const matchesSearch = !this.searchTerm || 
        prof.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        prof.email.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesClinic = !this.selectedClinic || 
        prof.clinic.toLowerCase().includes(this.selectedClinic.toLowerCase());
      
      const matchesStatus = !this.selectedStatus || 
        prof.status.toLowerCase() === this.selectedStatus.toLowerCase();
      
      return matchesSearch && matchesClinic && matchesStatus;
    });
  }

  getRoleSeverity(role: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const roleLower = role.toLowerCase();
    if (roleLower === 'médico') return 'success';
    if (roleLower === 'enfermeira') return 'info';
    if (roleLower === 'esteticista') return 'secondary';
    return 'secondary';
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const statusLower = status.toLowerCase();
    if (statusLower === 'ativo') return 'success';
    if (statusLower === 'inativo') return 'danger';
    if (statusLower === 'férias') return 'warning';
    return 'secondary';
  }

  newProfissional() {
    this.messageService.add({
      severity: 'info',
      summary: 'Novo Profissional',
      detail: 'Funcionalidade em desenvolvimento'
    });
  }

  viewProfissional(profissional: SimpleProfissional) {
    this.messageService.add({
      severity: 'info',
      summary: 'Visualizar Profissional',
      detail: `Visualizando: ${profissional.name}`
    });
  }

  editProfissional(profissional: SimpleProfissional) {
    this.messageService.add({
      severity: 'info',
      summary: 'Editar Profissional',
      detail: `Editando: ${profissional.name}`
    });
  }

  toggleProfissional(profissional: SimpleProfissional) {
    const newStatus = profissional.status === 'Ativo' ? 'Inativo' : 'Ativo';
    profissional.status = newStatus;
    
    this.messageService.add({
      severity: 'success',
      summary: 'Status Alterado',
      detail: `${profissional.name} agora está ${newStatus}`
    });
  }
}