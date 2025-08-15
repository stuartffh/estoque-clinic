import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ProgressBarModule } from 'primeng/progressbar';

import { MessageService } from 'primeng/api';

interface InventoryData {
  product: string;
  category: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  value: number;
  status: string;
  lastMovement: string;
}

@Component({
  selector: 'app-inventory-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    ChartModule,
    TableModule,
    TagModule,
    ToastModule,
    ProgressBarModule
  ],
  providers: [MessageService],
  template: `
    <div class="inventory-dashboard">
      <div class="dashboard-header mb-4">
        <h2>Dashboard de Inventário</h2>
        <button pButton 
                type="button" 
                label="Atualizar Dados" 
                icon="pi pi-refresh"
                class="p-button-outlined"
                (click)="refreshData()">
        </button>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid mb-4">
        <p-card class="kpi-card">
          <div class="kpi-content">
            <div class="kpi-icon bg-blue-500">
              <i class="pi pi-box"></i>
            </div>
            <div class="kpi-details">
              <h3>{{ totalProducts }}</h3>
              <p>Total de Produtos</p>
              <small class="text-green-500">+5% vs mês anterior</small>
            </div>
          </div>
        </p-card>

        <p-card class="kpi-card">
          <div class="kpi-content">
            <div class="kpi-icon bg-green-500">
              <i class="pi pi-dollar"></i>
            </div>
            <div class="kpi-details">
              <h3>R$ {{ totalValue.toLocaleString('pt-BR') }}</h3>
              <p>Valor Total do Estoque</p>
              <small class="text-green-500">+12% vs mês anterior</small>
            </div>
          </div>
        </p-card>

        <p-card class="kpi-card">
          <div class="kpi-content">
            <div class="kpi-icon bg-orange-500">
              <i class="pi pi-exclamation-triangle"></i>
            </div>
            <div class="kpi-details">
              <h3>{{ lowStockItems }}</h3>
              <p>Produtos em Falta</p>
              <small class="text-red-500">Atenção necessária</small>
            </div>
          </div>
        </p-card>

        <p-card class="kpi-card">
          <div class="kpi-content">
            <div class="kpi-icon bg-purple-500">
              <i class="pi pi-chart-line"></i>
            </div>
            <div class="kpi-details">
              <h3>{{ turnoverRate }}%</h3>
              <p>Taxa de Giro</p>
              <small class="text-blue-500">Média mensal</small>
            </div>
          </div>
        </p-card>
      </div>

      <div class="dashboard-content">
        <!-- Charts Row -->
        <div class="charts-row mb-4">
          <p-card header="Distribuição por Categoria" class="chart-card">
            <p-chart type="doughnut" 
                     [data]="categoryChartData" 
                     [options]="chartOptions"
                     width="100%" 
                     height="300px">
            </p-chart>
          </p-card>

          <p-card header="Movimentação dos Últimos 30 Dias" class="chart-card">
            <p-chart type="line" 
                     [data]="movementChartData" 
                     [options]="lineChartOptions"
                     width="100%" 
                     height="300px">
            </p-chart>
          </p-card>
        </div>

        <!-- Stock Levels -->
        <p-card header="Níveis de Estoque" class="mb-4">
          <div class="stock-levels">
            <div class="stock-item" *ngFor="let item of stockLevels">
              <div class="stock-info">
                <h4>{{ item.product }}</h4>
                <p>{{ item.category }}</p>
              </div>
              <div class="stock-progress">
                <div class="stock-numbers">
                  <span>{{ item.currentStock }} / {{ item.maxStock }}</span>
                  <p-tag [value]="item.status" 
                         [severity]="getStockSeverity(item.status)">
                  </p-tag>
                </div>
                <p-progressBar [value]="getStockPercentage(item)" 
                               [showValue]="false"
                               [style]="{'height': '8px', 'margin-top': '0.5rem'}">
                </p-progressBar>
              </div>
            </div>
          </div>
        </p-card>

        <!-- Recent Movements -->
        <p-card header="Movimentações Recentes">
          <p-table [value]="recentMovements" 
                   [paginator]="true" 
                   [rows]="5"
                   [tableStyle]="{'min-width': '50rem'}">
            <ng-template pTemplate="header">
              <tr>
                <th>Produto</th>
                <th>Tipo</th>
                <th>Quantidade</th>
                <th>Data/Hora</th>
                <th>Usuário</th>
                <th>Valor</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-movement>
              <tr>
                <td>{{ movement.product }}</td>
                <td>
                  <p-tag [value]="movement.type" 
                         [severity]="getMovementSeverity(movement.type)">
                  </p-tag>
                </td>
                <td>{{ movement.quantity }}</td>
                <td>{{ movement.datetime }}</td>
                <td>{{ movement.user }}</td>
                <td>R$ {{ movement.value.toLocaleString('pt-BR') }}</td>
              </tr>
            </ng-template>
          </p-table>
        </p-card>
      </div>

      <p-toast></p-toast>
    </div>
  `,
  styles: [`
    .inventory-dashboard {
      padding: 1rem;
    }
    
    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
    }
    
    .kpi-card .p-card-body {
      padding: 1rem;
    }
    
    .kpi-content {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .kpi-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    
    .kpi-icon i {
      font-size: 1.5rem;
    }
    
    .kpi-details h3 {
      margin: 0 0 0.25rem 0;
      font-size: 1.8rem;
      font-weight: 600;
      color: #212529;
    }
    
    .kpi-details p {
      margin: 0 0 0.25rem 0;
      color: #6c757d;
      font-size: 0.875rem;
    }
    
    .kpi-details small {
      font-size: 0.75rem;
    }
    
    .charts-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    
    .chart-card .p-card-body {
      padding: 1rem;
    }
    
    .stock-levels {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .stock-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      border: 1px solid #e9ecef;
      border-radius: 6px;
      background: #f8f9fa;
    }
    
    .stock-info h4 {
      margin: 0 0 0.25rem 0;
      color: #212529;
    }
    
    .stock-info p {
      margin: 0;
      color: #6c757d;
      font-size: 0.875rem;
    }
    
    .stock-progress {
      min-width: 200px;
    }
    
    .stock-numbers {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    
    .bg-blue-500 { background-color: #3b82f6; }
    .bg-green-500 { background-color: #10b981; }
    .bg-orange-500 { background-color: #f59e0b; }
    .bg-purple-500 { background-color: #8b5cf6; }
    
    .text-green-500 { color: #10b981; }
    .text-red-500 { color: #ef4444; }
    .text-blue-500 { color: #3b82f6; }
    
    @media (max-width: 768px) {
      .charts-row {
        grid-template-columns: 1fr;
      }
      
      .stock-item {
        flex-direction: column;
        gap: 1rem;
      }
      
      .stock-progress {
        width: 100%;
      }
    }
  `]
})
export class InventoryDashboardComponent implements OnInit {
  loading = false;
  
  // KPI Data
  totalProducts = 127;
  totalValue = 458750;
  lowStockItems = 8;
  turnoverRate = 85;

  // Chart Data
  categoryChartData: any;
  movementChartData: any;
  chartOptions: any;
  lineChartOptions: any;

  stockLevels: InventoryData[] = [
    { product: 'Botox 100UI', category: 'Toxina Botulínica', currentStock: 15, minStock: 10, maxStock: 50, value: 18500, status: 'Normal', lastMovement: '15/08/2024' },
    { product: 'Ácido Hialurônico 1ml', category: 'Preenchedor', currentStock: 5, minStock: 8, maxStock: 30, value: 12500, status: 'Baixo', lastMovement: '14/08/2024' },
    { product: 'Peeling Químico TCA', category: 'Peeling', currentStock: 25, minStock: 15, maxStock: 40, value: 7800, status: 'Normal', lastMovement: '13/08/2024' },
    { product: 'Fios PDO', category: 'Fios de Sustentação', currentStock: 2, minStock: 5, maxStock: 20, value: 3200, status: 'Crítico', lastMovement: '12/08/2024' }
  ];

  recentMovements = [
    { product: 'Botox 100UI', type: 'Saída', quantity: 2, datetime: '15/08/2024 14:30', user: 'Dr. Silva', value: 2400 },
    { product: 'Ácido Hialurônico 1ml', type: 'Entrada', quantity: 10, datetime: '15/08/2024 10:15', user: 'Dra. Santos', value: 15000 },
    { product: 'Peeling Químico', type: 'Saída', quantity: 1, datetime: '14/08/2024 16:45', user: 'Ana Costa', value: 350 },
    { product: 'Vitamina C Sérum', type: 'Entrada', quantity: 20, datetime: '14/08/2024 09:20', user: 'Dr. Oliveira', value: 1800 },
    { product: 'Fios PDO', type: 'Saída', quantity: 3, datetime: '13/08/2024 15:10', user: 'Dr. Silva', value: 1800 }
  ];

  constructor(private messageService: MessageService) {}

  ngOnInit() {
    this.initChartData();
  }

  initChartData() {
    // Category Chart
    this.categoryChartData = {
      labels: ['Toxina Botulínica', 'Preenchedores', 'Peelings', 'Fios', 'Cosméticos'],
      datasets: [{
        data: [35, 25, 15, 10, 15],
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'],
        borderWidth: 0
      }]
    };

    // Movement Chart
    this.movementChartData = {
      labels: ['01/08', '05/08', '10/08', '15/08', '20/08', '25/08', '30/08'],
      datasets: [
        {
          label: 'Entradas',
          data: [12, 8, 15, 10, 18, 6, 14],
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4
        },
        {
          label: 'Saídas',
          data: [8, 12, 10, 15, 9, 12, 8],
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4
        }
      ]
    };

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    };

    this.lineChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    };
  }

  getStockPercentage(item: InventoryData): number {
    return (item.currentStock / item.maxStock) * 100;
  }

  getStockSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    const statusLower = status.toLowerCase();
    if (statusLower === 'normal') return 'success';
    if (statusLower === 'baixo') return 'warning';
    if (statusLower === 'crítico') return 'danger';
    return 'info';
  }

  getMovementSeverity(type: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' {
    return type === 'Entrada' ? 'success' : 'danger';
  }

  refreshData() {
    this.loading = true;
    
    this.messageService.add({
      severity: 'info',
      summary: 'Atualizando',
      detail: 'Carregando dados atualizados...'
    });

    setTimeout(() => {
      this.loading = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Atualizado',
        detail: 'Dados atualizados com sucesso!'
      });
    }, 2000);
  }
}