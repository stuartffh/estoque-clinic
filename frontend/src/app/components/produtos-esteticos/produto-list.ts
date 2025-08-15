import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG imports - only basic ones
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';

import { MessageService } from 'primeng/api';

interface SimpleProduct {
  id: number;
  name: string;
  brand: string;
  category: string;
  stock: number;
  status: string;
}

@Component({
  selector: 'app-produto-list',
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
    <div class="produto-container">
      <p-card>
        <h2>Produtos Estéticos</h2>
        
        <div class="filters">
          <input type="text" 
                 pInputText 
                 placeholder="Buscar produtos..." 
                 [(ngModel)]="searchTerm"
                 (keyup.enter)="search()">
          <button pButton 
                  type="button" 
                  label="Buscar" 
                  (click)="search()">
          </button>
        </div>

        <p-table [value]="produtos" 
                 [loading]="loading">
          <ng-template pTemplate="header">
            <tr>
              <th>Nome</th>
              <th>Marca</th>
              <th>Categoria</th>
              <th>Estoque</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </ng-template>
          
          <ng-template pTemplate="body" let-produto>
            <tr>
              <td>{{ produto.name }}</td>
              <td>{{ produto.brand }}</td>
              <td>{{ produto.category }}</td>
              <td>{{ produto.stock }}</td>
              <td>{{ produto.status }}</td>
              <td>
                <button pButton 
                        type="button" 
                        label="Ver" 
                        class="p-button-sm"
                        (click)="viewProduct(produto)">
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
    .produto-container {
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
export class ProdutoListComponent implements OnInit {
  produtos: SimpleProduct[] = [];
  loading = false;
  searchTerm = '';

  constructor(
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.loading = true;
    
    // Dados de exemplo
    setTimeout(() => {
      this.produtos = [
        { id: 1, name: 'Botox 100UI', brand: 'Allergan', category: 'Botox', stock: 15, status: 'Ativo' },
        { id: 2, name: 'Ácido Hialurônico 1ml', brand: 'Juvederm', category: 'Preenchedor', stock: 8, status: 'Ativo' },
        { id: 3, name: 'Sculptra 5ml', brand: 'Galderma', category: 'Bioestimulador', stock: 3, status: 'Baixo' },
        { id: 4, name: 'Radiesse 1.5ml', brand: 'Merz', category: 'Preenchedor', stock: 12, status: 'Ativo' }
      ];
      this.loading = false;
    }, 500);
  }

  search() {
    this.loadProducts();
  }

  viewProduct(produto: SimpleProduct) {
    this.messageService.add({
      severity: 'info',
      summary: 'Produto',
      detail: `Visualizando: ${produto.name}`
    });
  }
}