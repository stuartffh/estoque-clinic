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

interface SimpleMovement {
  id: number;
  product: string;
  type: string;
  quantity: number;
  date: string;
  user: string;
}

@Component({
  selector: 'app-movimentacao-list',
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
    <div class="movimentacao-container">
      <p-card>
        <h2>Movimentações de Estoque</h2>
        
        <div class="filters">
          <input type="text" 
                 pInputText 
                 placeholder="Buscar movimentações..." 
                 [(ngModel)]="searchTerm"
                 (keyup.enter)="search()">
          <button pButton 
                  type="button" 
                  label="Buscar" 
                  (click)="search()">
          </button>
        </div>

        <p-table [value]="movimentacoes" 
                 [loading]="loading">
          <ng-template pTemplate="header">
            <tr>
              <th>Data</th>
              <th>Produto</th>
              <th>Tipo</th>
              <th>Quantidade</th>
              <th>Usuário</th>
              <th>Ações</th>
            </tr>
          </ng-template>
          
          <ng-template pTemplate="body" let-movimento>
            <tr>
              <td>{{ movimento.date }}</td>
              <td>{{ movimento.product }}</td>
              <td>{{ movimento.type }}</td>
              <td>{{ movimento.quantity }}</td>
              <td>{{ movimento.user }}</td>
              <td>
                <button pButton 
                        type="button" 
                        label="Ver" 
                        class="p-button-sm"
                        (click)="viewMovement(movimento)">
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
    .movimentacao-container {
      padding: 1rem;
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
  `]
})
export class MovimentacaoListComponent implements OnInit {
  movimentacoes: SimpleMovement[] = [];
  loading = false;
  searchTerm = '';

  constructor(private messageService: MessageService) {}

  ngOnInit() {
    this.loadMovements();
  }

  loadMovements() {
    this.loading = true;
    
    setTimeout(() => {
      this.movimentacoes = [
        { id: 1, product: 'Botox 100UI', type: 'Entrada', quantity: 10, date: '15/08/2024', user: 'Dr. Silva' },
        { id: 2, product: 'Ácido Hialurônico 1ml', type: 'Saída', quantity: 2, date: '15/08/2024', user: 'Dra. Santos' },
        { id: 3, product: 'Sculptra 5ml', type: 'Entrada', quantity: 5, date: '14/08/2024', user: 'Dr. Silva' },
        { id: 4, product: 'Radiesse 1.5ml', type: 'Saída', quantity: 1, date: '14/08/2024', user: 'Dra. Lima' }
      ];
      this.loading = false;
    }, 500);
  }

  search() {
    this.loadMovements();
  }

  viewMovement(movimento: SimpleMovement) {
    this.messageService.add({
      severity: 'info',
      summary: 'Movimentação',
      detail: `Visualizando movimentação: ${movimento.product}`
    });
  }
}