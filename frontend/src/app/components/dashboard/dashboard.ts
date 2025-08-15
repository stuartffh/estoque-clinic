/**
 * Componente de Dashboard
 * Tela principal protegida com dados do usuário
 */

import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

// PrimeNG imports
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { SkeletonModule } from 'primeng/skeleton';

import { AuthService, User } from '../../services/auth';
import { ApiService } from '../../services/api';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    TableModule,
    TagModule,
    ProgressBarModule,
    ToastModule,
    SkeletonModule
  ],
  providers: [MessageService],
  templateUrl: './dashboard.html',
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  dashboardData: any = null;
  isLoading = true;
  statsCards: any[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    // Obter usuário atual
    this.currentUser = this.authService.getCurrentUser();

    // Carregar dados do dashboard
    this.loadDashboardData();

    // Escutar mudanças no estado de autenticação
    this.authService.authState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.currentUser = state.user;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboardData(): void {
    this.isLoading = true;

    // Simular dados mock para o dashboard
    setTimeout(() => {
      this.dashboardData = {
        stats: {
          totalProducts: 127,
          expiringSoon: 8,
          lowStock: 5,
          activeClinics: 3
        },
        charts: {
          systemPerformance: {
            cpu: 45,
            memory: 67,
            disk: 23
          }
        },
        notifications: [
          {
            type: 'warning',
            title: 'Estoque Baixo',
            message: 'Botox 100UI com apenas 5 unidades',
            timestamp: new Date().toISOString()
          },
          {
            type: 'info',
            title: 'Nova Movimentação',
            message: 'Entrada de 20 unidades de Ácido Hialurônico',
            timestamp: new Date().toISOString()
          },
          {
            type: 'success',
            title: 'Backup Realizado',
            message: 'Backup automático concluído com sucesso',
            timestamp: new Date().toISOString()
          }
        ],
        recentActivity: [
          {
            id: 1,
            action: 'Entrada de Produto',
            user: 'Dr. Silva',
            timestamp: new Date().toISOString()
          },
          {
            id: 2,
            action: 'Saída de Produto',
            user: 'Dra. Santos',
            timestamp: new Date().toISOString()
          },
          {
            id: 3,
            action: 'Cadastro de Profissional',
            user: 'Admin',
            timestamp: new Date().toISOString()
          }
        ]
      };
      
      this.setupStatsCards();
      this.isLoading = false;

      this.messageService.add({
        severity: 'success',
        summary: 'Dashboard carregado',
        detail: 'Dados atualizados com sucesso'
      });
    }, 1000);
  }

  setupStatsCards(): void {
    if (!this.dashboardData?.stats) return;

    this.statsCards = [
      {
        title: 'Produtos em Estoque',
        value: this.dashboardData.stats.totalProducts || 0,
        subtitle: 'Produtos cadastrados',
        icon: 'pi pi-box',
        iconBg: 'bg-blue-100 text-blue-600'
      },
      {
        title: 'Lotes Vencendo',
        value: this.dashboardData.stats.expiringSoon || 0,
        subtitle: 'Próximo ao vencimento',
        icon: 'pi pi-exclamation-triangle',
        iconBg: 'bg-orange-100 text-orange-600',
      },
      {
        title: 'Estoque Baixo',
        value: this.dashboardData.stats.lowStock || 0,
        subtitle: 'Produtos em falta',
        icon: 'pi pi-minus-circle',
        iconBg: 'bg-red-100 text-red-600',
      },
      {
        title: 'Clínicas Ativas',
        value: this.dashboardData.stats.activeClinics || 1,
        subtitle: 'Clínicas cadastradas',
        icon: 'pi pi-building',
        iconBg: 'bg-purple-100 text-purple-600',
      }
    ];
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'info': return 'pi pi-info-circle';
      case 'success': return 'pi pi-check-circle';
      case 'warning': return 'pi pi-exclamation-triangle';
      case 'error': return 'pi pi-times-circle';
      default: return 'pi pi-info-circle';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR');
  }

  formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes}m`;
  }
}
