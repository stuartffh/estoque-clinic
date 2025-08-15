/**
 * Rotas do módulo de Gestão
 * Lazy loading para otimização de performance
 */

import { Routes } from '@angular/router';

export const MANAGEMENT_ROUTES: Routes = [
  {
    path: '',
    children: [
      {
        path: 'clinicas',
        loadComponent: () => import('../clinicas/clinica-list').then(m => m.ClinicaListComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('../users/user-list').then(m => m.UserListComponent)
      },
      {
        path: 'users/new',
        loadComponent: () => import('../users/user-form').then(m => m.UserFormComponent)
      },
      {
        path: 'users/:id',
        loadComponent: () => import('../users/user-form').then(m => m.UserFormComponent)
      },
      {
        path: 'profissionais',
        loadComponent: () => import('../profissionais/profissional-list').then(m => m.ProfissionalListComponent)
      }
    ]
  }
];