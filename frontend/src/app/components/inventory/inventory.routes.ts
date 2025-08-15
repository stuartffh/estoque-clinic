/**
 * Rotas do módulo de Inventário
 * Lazy loading para otimização de performance
 */

import { Routes } from '@angular/router';

export const INVENTORY_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('../inventory-dashboard/inventory-dashboard').then(m => m.InventoryDashboardComponent)
      },
      {
        path: 'produtos-esteticos',
        loadComponent: () => import('../produtos-esteticos/produto-list').then(m => m.ProdutoListComponent)
      },
      {
        path: 'movimentacoes',
        loadComponent: () => import('../movimentacoes/movimentacao-list').then(m => m.MovimentacaoListComponent)
      },
      {
        path: 'alertas',
        loadComponent: () => import('../alertas/alerta-list').then(m => m.AlertaListComponent)
      },
      {
        path: 'relatorios',
        loadComponent: () => import('../relatorios/relatorio-list').then(m => m.RelatorioListComponent)
      }
    ]
  }
];