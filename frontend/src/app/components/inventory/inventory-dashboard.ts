import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { ChartModule } from 'primeng/chart';
import { ToolbarModule } from 'primeng/toolbar';
import { MenuModule } from 'primeng/menu';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PanelModule } from 'primeng/panel';
import { TimelineModule } from 'primeng/timeline';
import { BadgeModule } from 'primeng/badge';

import { MessageService } from 'primeng/api';

// Services
import { InventoryService } from '../../services/inventory.service';
import { AuthService } from '../../services/auth.service';

export interface DashboardData {
  statistics: {
    total_batches: number;
    active_batches: number;
    expiring_soon: number;
    low_stock: number;
    total_units: number;
    distinct_products: number;
  };
  stock_by_category: Array<{
    category: string;
    batches_count: number;
    total_units: number;
    expiring_soon: number;
  }>;
  recent_movements: Array<{
    id: number;
    movement_type: string;
    quantity: number;
    product_name: string;
    brand: string;
    batch_number: string;
    moved_by_name: string;
    created_at: string;
  }>;
  critical_alerts: Array<{
    id: number;
    alert_type: string;
    severity: string;
    title: string;
    message: string;
    created_at: string;
  }>;
}

@Component({
  selector: 'app-inventory-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    TableModule,
    ButtonModule,
    TagModule,
    ProgressBarModule,
    ChartModule,
    ToolbarModule,
    MenuModule,
    ToastModule,
    ProgressSpinnerModule,
    PanelModule,
    TimelineModule,
    BadgeModule
  ],
  providers: [MessageService],
  template: ''
})
export class InventoryDashboardComponent implements OnInit, OnDestroy {
  dashboardData: DashboardData | null = null;
  loading = true;
  selectedClinicId: number | null = null;
  
  // Chart data
  categoryChartData: any;
  categoryChartOptions: any;
  
  // Refresh interval
  private refreshSubscription?: Subscription;
  autoRefresh = true;
  refreshInterval = 30000; // 30 seconds

  // Quick actions menu
  quickActions = [
    {
      label: 'Entrada de Estoque',
      icon: 'pi pi-plus-circle',
      command: () => this.router.navigate(['/inventory/entry'])
    },
    {
      label: 'Saída de Estoque',
      icon: 'pi pi-minus-circle',
      command: () => this.router.navigate(['/inventory/exit'])
    },
    {
      label: 'Ajuste de Estoque',
      icon: 'pi pi-cog',
      command: () => this.router.navigate(['/inventory/adjustment'])
    },
    {
      label: 'Relatórios',
      icon: 'pi pi-chart-bar',
      command: () => this.router.navigate(['/inventory/reports'])
    }
  ];

  constructor(
    private inventoryService: InventoryService,
    private authService: AuthService,
    private messageService: MessageService,
    private router: Router
  ) {
    this.initializeChartOptions();
  }

  ngOnInit() {
    this.selectedClinicId = this.authService.getCurrentUser()?.clinic_id;
    
    if (!this.selectedClinicId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Erro',
        detail: 'Nenhuma clínica selecionada'
      });
      return;
    }

    this.loadDashboardData();
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    this.stopAutoRefresh();
  }

  loadDashboardData() {
    if (!this.selectedClinicId) return;
    
    this.loading = true;
    
    this.inventoryService.getDashboard(this.selectedClinicId).subscribe({
      next: (data) => {
        this.dashboardData = data;
        this.updateChartData();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading dashboard data:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Erro ao carregar dados do dashboard'
        });
        this.loading = false;
      }
    });
  }

  updateChartData() {
    if (!this.dashboardData) return;

    const categories = this.dashboardData.stock_by_category;
    
    this.categoryChartData = {
      labels: categories.map(cat => this.getCategoryLabel(cat.category)),
      datasets: [
        {
          label: 'Unidades em Estoque',
          data: categories.map(cat => cat.total_units),
          backgroundColor: [
            '#42A5F5',
            '#66BB6A',
            '#FFA726',
            '#EF5350',
            '#AB47BC'
          ],
          borderColor: [
            '#1976D2',
            '#388E3C',
            '#F57C00',
            '#D32F2F',
            '#7B1FA2'
          ],
          borderWidth: 1
        }
      ]
    };
  }

  initializeChartOptions() {
    this.categoryChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom'
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              return context.label + ': ' + context.parsed + ' unidades';
            }
          }
        }
      }
    };
  }

  startAutoRefresh() {
    if (this.autoRefresh) {
      this.refreshSubscription = interval(this.refreshInterval).subscribe(() => {
        this.loadDashboardData();
      });
    }
  }

  stopAutoRefresh() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = undefined;
    }
  }

  toggleAutoRefresh() {
    this.autoRefresh = !this.autoRefresh;
    
    if (this.autoRefresh) {
      this.startAutoRefresh();
      this.messageService.add({
        severity: 'info',
        summary: 'Auto-atualização',
        detail: 'Auto-atualização ativada'
      });
    } else {
      this.stopAutoRefresh();
      this.messageService.add({
        severity: 'info',
        summary: 'Auto-atualização',
        detail: 'Auto-atualização desativada'
      });
    }
  }

  refreshData() {
    this.loadDashboardData();
    this.messageService.add({
      severity: 'success',
      summary: 'Atualizado',
      detail: 'Dados atualizados com sucesso'
    });
  }

  getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      'botox': 'Botox',
      'filler': 'Preenchedores',
      'biostimulator': 'Bioestimuladores',
      'equipment': 'Equipamentos',
      'consumable': 'Consumíveis'
    };
    return labels[category] || category;
  }

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'botox': 'pi pi-heart',
      'filler': 'pi pi-circle',
      'biostimulator': 'pi pi-star',
      'equipment': 'pi pi-cog',
      'consumable': 'pi pi-box'
    };
    return icons[category] || 'pi pi-box';
  }

  getMovementTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'inbound': 'Entrada',
      'outbound': 'Saída',
      'adjustment': 'Ajuste',
      'transfer': 'Transferência',
      'return': 'Devolução'
    };
    return labels[type] || type;
  }

  getMovementTypeIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'inbound': 'pi pi-arrow-up',
      'outbound': 'pi pi-arrow-down',
      'adjustment': 'pi pi-cog',
      'transfer': 'pi pi-arrow-right',
      'return': 'pi pi-undo'
    };
    return icons[type] || 'pi pi-arrow-right';
  }

  getMovementTypeSeverity(type: string): string {
    const severities: { [key: string]: string } = {
      'inbound': 'success',
      'outbound': 'danger',
      'adjustment': 'warning',
      'transfer': 'info',
      'return': 'secondary'
    };
    return severities[type] || 'info';
  }

  getAlertSeverity(severity: string): string {
    const severities: { [key: string]: string } = {
      'low': 'info',
      'medium': 'warning',
      'high': 'danger',
      'critical': 'danger'
    };
    return severities[severity] || 'info';
  }

  getExpiryStatus(expiringSoon: number, total: number): { severity: string; percentage: number } {
    const percentage = total > 0 ? (expiringSoon / total) * 100 : 0;
    
    let severity = 'success';
    if (percentage > 30) severity = 'danger';
    else if (percentage > 15) severity = 'warning';
    else if (percentage > 5) severity = 'info';
    
    return { severity, percentage };
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('pt-BR');
  }

  formatQuantity(quantity: number, type: string): string {
    const sign = type === 'outbound' ? '-' : '+';
    return `${sign}${Math.abs(quantity)}`;
  }

  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  viewBatches() {
    this.router.navigate(['/inventory/batches', this.selectedClinicId]);
  }

  viewMovements() {
    this.router.navigate(['/inventory/movements', this.selectedClinicId]);
  }

  viewAlerts() {
    this.router.navigate(['/inventory/alerts', this.selectedClinicId]);
  }

  viewProducts() {
    this.router.navigate(['/products']);
  }

  getStockStatusColor(category: any): string {
    const expiryStatus = this.getExpiryStatus(category.expiring_soon, category.batches_count);
    
    if (expiryStatus.percentage > 30) return '#ef4444';
    if (expiryStatus.percentage > 15) return '#f59e0b';
    if (expiryStatus.percentage > 5) return '#3b82f6';
    return '#10b981';
  }

  calculateStockHealth(): { status: string; percentage: number; color: string } {
    if (!this.dashboardData) return { status: 'Carregando...', percentage: 0, color: '#6b7280' };

    const stats = this.dashboardData.statistics;
    const totalIssues = stats.expiring_soon + stats.low_stock;
    const totalBatches = stats.active_batches;
    
    if (totalBatches === 0) return { status: 'Sem dados', percentage: 0, color: '#6b7280' };
    
    const healthPercentage = ((totalBatches - totalIssues) / totalBatches) * 100;
    
    let status = 'Excelente';
    let color = '#10b981';
    
    if (healthPercentage < 60) {
      status = 'Crítico';
      color = '#ef4444';
    } else if (healthPercentage < 80) {
      status = 'Atenção';
      color = '#f59e0b';
    } else if (healthPercentage < 95) {
      status = 'Bom';
      color = '#3b82f6';
    }
    
    return { status, percentage: Math.max(0, healthPercentage), color };
  }
}