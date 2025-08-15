/**
 * Configuração de rotas do Angular
 * Define navegação entre login e dashboard
 */

import { Routes } from '@angular/router';
import { authGuard } from './guards/auth-guard';
import { MasterLayoutComponent } from './components/layout/component/master-layout';

export const routes: Routes = [
  // Rota de login
  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then(m => m.LoginComponent)
  },

  // Reset de senha
  {
    path: 'reset-password',
    loadComponent: () => import('./components/reset-password/reset-password').then(m => m.ResetPasswordComponent)
  },

  // Rotas protegidas dentro do layout principal
  {
    path: '',
    component: MasterLayoutComponent,
    canActivate: [authGuard],
    children: [
      // Dashboard
      { path: 'dashboard', loadComponent: () => import('./components/dashboard/dashboard').then(m => m.DashboardComponent) },
      { path: 'inventory-dashboard', loadComponent: () => import('./components/inventory-dashboard/inventory-dashboard').then(m => m.InventoryDashboardComponent) },
      
      // Estoque
      { path: 'produtos-esteticos', loadComponent: () => import('./components/produtos-esteticos/produto-list').then(m => m.ProdutoListComponent) },
      { path: 'movimentacoes', loadComponent: () => import('./components/movimentacoes/movimentacao-list').then(m => m.MovimentacaoListComponent) },
      { path: 'alertas', loadComponent: () => import('./components/alertas/alerta-list').then(m => m.AlertaListComponent) },
      { path: 'relatorios', loadComponent: () => import('./components/relatorios/relatorio-list').then(m => m.RelatorioListComponent) },
      
      // Gestão
      { path: 'clinicas', loadComponent: () => import('./components/clinicas/clinica-list').then(m => m.ClinicaListComponent) },
      { path: 'users', loadComponent: () => import('./components/users/user-list').then(m => m.UserListComponent) },
      { path: 'users/new', loadComponent: () => import('./components/users/user-form').then(m => m.UserFormComponent) },
      { path: 'users/:id', loadComponent: () => import('./components/users/user-form').then(m => m.UserFormComponent) },
      { path: 'profissionais', loadComponent: () => import('./components/profissionais/profissional-list').then(m => m.ProfissionalListComponent) },
      
      // Configurações
      { path: 'change-password', loadComponent: () => import('./components/change-password/change-password').then(m => m.ChangePasswordComponent) },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: '**', redirectTo: 'dashboard' }
    ]
  }
];
