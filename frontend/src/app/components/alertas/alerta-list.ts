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

interface SimpleAlert {
  id: number;
  title: string;
  message: string;
  type: string;
  severity: string;
  date: string;
  status: string;
}

@Component({
  selector: 'app-alerta-list',
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
    <div class="alerta-container">
      <p-card>
        <h2>Alertas de Estoque</h2>
        
        <div class="stats">
          <div class="stat-item">
            <span class="stat-value">{{ getTotalAlerts() }}</span>
            <span class="stat-label">Total de Alertas</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ getActiveAlerts() }}</span>
            <span class="stat-label">Alertas Ativos</span>
          </div>
        </div>

        <div class="filters">
          <input type="text" 
                 pInputText 
                 placeholder="Buscar alertas..." 
                 [(ngModel)]="searchTerm"
                 (keyup.enter)="search()">
          <button pButton 
                  type="button" 
                  label="Buscar" 
                  (click)="search()">
          </button>
        </div>

        <p-table [value]="alertas" 
                 [loading]="loading">
          <ng-template pTemplate="header">
            <tr>
              <th>Data</th>
              <th>Título</th>
              <th>Mensagem</th>
              <th>Tipo</th>
              <th>Severidade</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </ng-template>
          
          <ng-template pTemplate="body" let-alerta>
            <tr [class.alert-critical]="alerta.severity === 'Crítico'">
              <td>{{ alerta.date }}</td>
              <td>{{ alerta.title }}</td>
              <td>{{ alerta.message }}</td>
              <td>{{ alerta.type }}</td>
              <td>{{ alerta.severity }}</td>
              <td>{{ alerta.status }}</td>
              <td>
                <button pButton 
                        type="button" 
                        label="Ver" 
                        class="p-button-sm"
                        (click)="viewAlert(alerta)">
                </button>
                <button pButton 
                        type="button" 
                        label="Marcar Lido" 
                        class="p-button-sm p-button-success"
                        (click)="markAsRead(alerta)"
                        *ngIf="alerta.status === 'Não lido'">
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
    .alerta-container {
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
      color: #dc3545;
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
    
    .alert-critical {
      background-color: #fff5f5 !important;
      border-left: 4px solid #dc3545;
    }
  `]
})
export class AlertaListComponent implements OnInit {
  alertas: SimpleAlert[] = [];
  loading = false;
  searchTerm = '';

  constructor(private messageService: MessageService) {}

  ngOnInit() {
    this.loadAlerts();
  }

  loadAlerts() {
    this.loading = true;
    
    setTimeout(() => {
      this.alertas = [
        { id: 1, title: 'Estoque Baixo', message: 'Botox 100UI com apenas 3 unidades', type: 'Estoque', severity: 'Alto', date: '15/08/2024', status: 'Não lido' },
        { id: 2, title: 'Vencimento Próximo', message: 'Ácido Hialurônico vence em 5 dias', type: 'Vencimento', severity: 'Crítico', date: '15/08/2024', status: 'Não lido' },
        { id: 3, title: 'Temperatura Alterada', message: 'Geladeira 01 registrou 12°C', type: 'Temperatura', severity: 'Médio', date: '14/08/2024', status: 'Lido' },
        { id: 4, title: 'Produto Vencido', message: 'Lote AH001 vencido há 2 dias', type: 'Vencimento', severity: 'Crítico', date: '14/08/2024', status: 'Não lido' }
      ];
      this.loading = false;
    }, 500);
  }

  search() {
    this.loadAlerts();
  }

  getTotalAlerts(): number {
    return this.alertas.length;
  }

  getActiveAlerts(): number {
    return this.alertas.filter(a => a.status === 'Não lido').length;
  }

  viewAlert(alerta: SimpleAlert) {
    this.messageService.add({
      severity: 'info',
      summary: 'Alerta',
      detail: `Visualizando: ${alerta.title}`
    });
  }

  markAsRead(alerta: SimpleAlert) {
    alerta.status = 'Lido';
    this.messageService.add({
      severity: 'success',
      summary: 'Sucesso',
      detail: 'Alerta marcado como lido'
    });
  }
}