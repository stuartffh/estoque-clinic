import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG imports - only basic ones
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';

import { MessageService } from 'primeng/api';

interface SimpleClinic {
  id: number;
  name: string;
  city: string;
  phone: string;
  manager: string;
  products: number;
  stock: number;
  alerts: number;
  status: string;
}

@Component({
  selector: 'app-clinica-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    CardModule,
    ToastModule
  ],
  providers: [MessageService],
  template: `
    <div class="clinica-container">
      <p-card>
        <h2>Gestão de Clínicas</h2>
        
        <div class="stats">
          <div class="stat-item">
            <span class="stat-value">{{ getActiveClinicCount() }}</span>
            <span class="stat-label">Clínicas Ativas</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ getTotalProducts() }}</span>
            <span class="stat-label">Total Produtos</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ getTotalStock() }}</span>
            <span class="stat-label">Itens Estoque</span>
          </div>
        </div>

        <div class="filters">
          <input type="text" 
                 pInputText 
                 placeholder="Buscar clínicas..." 
                 [(ngModel)]="searchTerm"
                 (keyup.enter)="search()">
          <button pButton 
                  type="button" 
                  label="Buscar" 
                  (click)="search()">
          </button>
          <button pButton 
                  type="button" 
                  label="Nova Clínica" 
                  class="p-button-success"
                  (click)="newClinic()">
          </button>
        </div>

        <p-table [value]="clinicas" 
                 [loading]="loading">
          <ng-template pTemplate="header">
            <tr>
              <th>Nome</th>
              <th>Cidade</th>
              <th>Telefone</th>
              <th>Gerente</th>
              <th>Produtos</th>
              <th>Estoque</th>
              <th>Alertas</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </ng-template>
          
          <ng-template pTemplate="body" let-clinica>
            <tr>
              <td><strong>{{ clinica.name }}</strong></td>
              <td>{{ clinica.city }}</td>
              <td>{{ clinica.phone }}</td>
              <td>{{ clinica.manager }}</td>
              <td>{{ clinica.products }}</td>
              <td>{{ clinica.stock }}</td>
              <td>
                <span class="alert-badge" 
                      [class.alert-high]="clinica.alerts > 3">
                  {{ clinica.alerts }}
                </span>
              </td>
              <td>
                <span class="status-badge" 
                      [class.status-active]="clinica.status === 'Ativa'"
                      [class.status-inactive]="clinica.status === 'Inativa'">
                  {{ clinica.status }}
                </span>
              </td>
              <td>
                <button pButton 
                        type="button" 
                        label="Ver" 
                        class="p-button-sm"
                        (click)="viewClinic(clinica)">
                </button>
                <button pButton 
                        type="button" 
                        label="Editar" 
                        class="p-button-sm p-button-outlined"
                        (click)="editClinic(clinica)">
                </button>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>

      <p-toast></p-toast>
    </div>
  `,
  styles: [`
    .clinica-container {
      padding: 1rem;
    }
    
    .stats {
      display: flex;
      gap: 2rem;
      margin-bottom: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 6px;
    }
    
    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
    }
    
    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: #0d6efd;
    }
    
    .stat-label {
      font-size: 0.875rem;
      color: #6c757d;
    }
    
    .filters {
      margin-bottom: 1rem;
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    
    .filters input {
      flex: 1;
    }
    
    .alert-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      background: #28a745;
      color: white;
      font-weight: bold;
    }
    
    .alert-badge.alert-high {
      background: #dc3545;
    }
    
    .status-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-weight: bold;
    }
    
    .status-badge.status-active {
      background: #d4edda;
      color: #155724;
    }
    
    .status-badge.status-inactive {
      background: #f8d7da;
      color: #721c24;
    }
  `]
})
export class ClinicaListComponent implements OnInit {
  clinicas: SimpleClinic[] = [];
  loading = false;
  searchTerm = '';

  constructor(private messageService: MessageService) {}

  ngOnInit() {
    this.loadClinics();
  }

  loadClinics() {
    this.loading = true;
    
    setTimeout(() => {
      this.clinicas = [
        { id: 1, name: 'EstoqueClinic Centro', city: 'São Paulo', phone: '(11) 98765-4321', manager: 'Dr. Silva', products: 45, stock: 320, alerts: 2, status: 'Ativa' },
        { id: 2, name: 'EstoqueClinic Norte', city: 'São Paulo', phone: '(11) 87654-3210', manager: 'Dra. Santos', products: 32, stock: 180, alerts: 5, status: 'Ativa' },
        { id: 3, name: 'EstoqueClinic Sul', city: 'São Paulo', phone: '(11) 76543-2109', manager: 'Dr. Oliveira', products: 28, stock: 95, alerts: 0, status: 'Inativa' },
        { id: 4, name: 'EstoqueClinic Oeste', city: 'São Paulo', phone: '(11) 65432-1098', manager: 'Dra. Lima', products: 38, stock: 250, alerts: 1, status: 'Ativa' }
      ];
      this.loading = false;
    }, 500);
  }

  search() {
    this.loadClinics();
  }

  getActiveClinicCount(): number {
    return this.clinicas.filter(c => c.status === 'Ativa').length;
  }

  getTotalProducts(): number {
    return this.clinicas.reduce((sum, c) => sum + c.products, 0);
  }

  getTotalStock(): number {
    return this.clinicas.reduce((sum, c) => sum + c.stock, 0);
  }

  newClinic() {
    this.messageService.add({
      severity: 'info',
      summary: 'Nova Clínica',
      detail: 'Abrindo formulário para cadastrar nova clínica'
    });
  }

  viewClinic(clinica: SimpleClinic) {
    this.messageService.add({
      severity: 'info',
      summary: 'Visualizar Clínica',
      detail: `Visualizando: ${clinica.name}`
    });
  }

  editClinic(clinica: SimpleClinic) {
    this.messageService.add({
      severity: 'info',
      summary: 'Editar Clínica',
      detail: `Editando: ${clinica.name}`
    });
  }
}