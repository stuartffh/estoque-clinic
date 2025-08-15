import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, AppMenuitem, RouterModule],
  template: `<ul class="layout-menu">
        <ng-container *ngFor="let item of model; let i = index">
            <li app-menuitem *ngIf="!item.separator" [item]="item" [index]="i" [root]="true"></li>
            <li *ngIf="item.separator" class="menu-separator"></li>
        </ng-container>
    </ul> `
})
export class AppMenu {
  model: MenuItem[] = [];

  ngOnInit() {
    this.model = [
      {
        label: 'Dashboard',
        items: [
          { label: 'Visão Geral', icon: 'pi pi-fw pi-home', routerLink: ['/'] },
          { label: 'Inventário', icon: 'pi pi-fw pi-chart-line', routerLink: ['/inventory-dashboard'] }
        ]
      },
      {
        label: 'Estoque',
        items: [
          { label: 'Produtos Estéticos', icon: 'pi pi-fw pi-box', routerLink: ['/produtos-esteticos'] },
          { label: 'Movimentações', icon: 'pi pi-fw pi-arrows-h', routerLink: ['/movimentacoes'] },
          { label: 'Alertas', icon: 'pi pi-fw pi-exclamation-triangle', routerLink: ['/alertas'] },
          { label: 'Relatórios', icon: 'pi pi-fw pi-file-pdf', routerLink: ['/relatorios'] }
        ]
      },
      {
        label: 'Gestão',
        items: [
          { label: 'Clínicas', icon: 'pi pi-fw pi-building', routerLink: ['/clinicas'] },
          { label: 'Usuários', icon: 'pi pi-fw pi-users', routerLink: ['/users'] },
          { label: 'Profissionais', icon: 'pi pi-fw pi-user-edit', routerLink: ['/profissionais'] }
        ]
      }
    ];
  }
}
