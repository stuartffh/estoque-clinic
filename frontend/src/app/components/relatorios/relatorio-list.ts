import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG imports - only basic ones
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { InputTextModule } from 'primeng/inputtext';

import { MessageService } from 'primeng/api';

interface SimpleReport {
  id: string;
  name: string;
  description: string;
  category: string;
  format: string;
  status: string;
}

@Component({
  selector: 'app-relatorio-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    ToastModule,
    InputTextModule
  ],
  providers: [MessageService],
  template: `
    <div class="relatorio-container">
      <p-card>
        <h2>Centro de Relatórios</h2>
        
        <div class="filters">
          <input type="text" 
                 pInputText 
                 placeholder="Todas as clínicas" 
                 [(ngModel)]="selectedClinic">
          <input type="date" 
                 placeholder="Data inicial">
          <input type="date" 
                 placeholder="Data final">
          <input type="text" 
                 pInputText 
                 placeholder="Formato" 
                 [(ngModel)]="selectedFormat">
        </div>

        <div class="report-categories">
          <div class="category-section">
            <h3>Relatórios de Estoque</h3>
            <div class="report-grid">
              <div class="report-card" *ngFor="let report of getReportsByCategory('estoque')">
                <div class="report-header">
                  <i class="pi pi-box report-icon"></i>
                  <div class="report-info">
                    <h4>{{ report.name }}</h4>
                    <p>{{ report.description }}</p>
                  </div>
                </div>
                <div class="report-actions">
                  <button pButton 
                          type="button" 
                          label="Gerar" 
                          class="p-button-primary p-button-sm"
                          (click)="generateReport(report)">
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="category-section">
            <h3>Relatórios de Movimentação</h3>
            <div class="report-grid">
              <div class="report-card" *ngFor="let report of getReportsByCategory('movimentacao')">
                <div class="report-header">
                  <i class="pi pi-arrows-h report-icon"></i>
                  <div class="report-info">
                    <h4>{{ report.name }}</h4>
                    <p>{{ report.description }}</p>
                  </div>
                </div>
                <div class="report-actions">
                  <button pButton 
                          type="button" 
                          label="Gerar" 
                          class="p-button-primary p-button-sm"
                          (click)="generateReport(report)">
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="category-section">
            <h3>Relatórios Financeiros</h3>
            <div class="report-grid">
              <div class="report-card" *ngFor="let report of getReportsByCategory('financeiro')">
                <div class="report-header">
                  <i class="pi pi-dollar report-icon"></i>
                  <div class="report-info">
                    <h4>{{ report.name }}</h4>
                    <p>{{ report.description }}</p>
                  </div>
                </div>
                <div class="report-actions">
                  <button pButton 
                          type="button" 
                          label="Gerar" 
                          class="p-button-primary p-button-sm"
                          (click)="generateReport(report)">
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </p-card>

      <p-toast></p-toast>
    </div>
  `,
  styles: [`
    .relatorio-container {
      padding: 1rem;
    }
    
    .filters {
      margin-bottom: 1.5rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 6px;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.5rem;
    }
    
    .category-section {
      margin-bottom: 2rem;
    }
    
    .category-section h3 {
      margin-bottom: 1rem;
      color: #495057;
      border-bottom: 2px solid #e9ecef;
      padding-bottom: 0.5rem;
    }
    
    .report-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1rem;
    }
    
    .report-card {
      border: 1px solid #e9ecef;
      border-radius: 8px;
      padding: 1rem;
      background: white;
      transition: all 0.3s ease;
    }
    
    .report-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);
    }
    
    .report-header {
      display: flex;
      align-items: flex-start;
      margin-bottom: 1rem;
    }
    
    .report-icon {
      font-size: 2rem;
      margin-right: 1rem;
      padding: 0.75rem;
      border-radius: 8px;
      background: #e7f3ff;
      color: #0d6efd;
    }
    
    .report-info h4 {
      margin: 0 0 0.5rem 0;
      color: #212529;
    }
    
    .report-info p {
      margin: 0;
      color: #6c757d;
      font-size: 0.875rem;
    }
    
    .report-actions {
      display: flex;
      justify-content: flex-end;
    }
  `]
})
export class RelatorioListComponent implements OnInit {
  loading = false;
  selectedClinic = '';
  selectedFormat = 'pdf';

  reportTemplates: SimpleReport[] = [
    // Estoque
    { id: 'estoque-atual', name: 'Estoque Atual', description: 'Posição atual do estoque por produto e clínica', category: 'estoque', format: 'PDF', status: 'Ativo' },
    { id: 'estoque-minimo', name: 'Produtos Abaixo do Mínimo', description: 'Lista de produtos com estoque abaixo do limite', category: 'estoque', format: 'Excel', status: 'Ativo' },
    { id: 'valor-estoque', name: 'Valor do Estoque', description: 'Valor total do estoque por categoria', category: 'estoque', format: 'PDF', status: 'Ativo' },

    // Movimentação
    { id: 'movimentacoes-periodo', name: 'Movimentações por Período', description: 'Histórico de entradas e saídas', category: 'movimentacao', format: 'Excel', status: 'Ativo' },
    { id: 'consumo-produto', name: 'Consumo por Produto', description: 'Análise de consumo de produtos', category: 'movimentacao', format: 'PDF', status: 'Ativo' },

    // Financeiro
    { id: 'custo-estoque', name: 'Custo do Estoque', description: 'Análise de custos do estoque por categoria', category: 'financeiro', format: 'Excel', status: 'Ativo' },
    { id: 'giro-estoque', name: 'Giro de Estoque', description: 'Análise de rotatividade dos produtos', category: 'financeiro', format: 'PDF', status: 'Ativo' }
  ];

  constructor(private messageService: MessageService) {}

  ngOnInit() {
    // Inicializar com mês atual
    const now = new Date();
    // Setup inicial se necessário
  }

  getReportsByCategory(category: string): SimpleReport[] {
    return this.reportTemplates.filter(report => report.category === category);
  }

  generateReport(report: SimpleReport) {
    this.loading = true;
    
    this.messageService.add({
      severity: 'info',
      summary: 'Gerando Relatório',
      detail: `Iniciando geração: ${report.name}`
    });

    // Simular geração de relatório
    setTimeout(() => {
      this.loading = false;
      this.messageService.add({
        severity: 'success',
        summary: 'Relatório Gerado',
        detail: `${report.name} gerado com sucesso!`
      });
    }, 2000);
  }
}