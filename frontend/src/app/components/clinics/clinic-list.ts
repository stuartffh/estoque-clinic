import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// PrimeNG imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { ToolbarModule } from 'primeng/toolbar';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { MessageService, ConfirmationService } from 'primeng/api';

// Services
import { ClinicService } from '../../services/clinic.service';
import { AuthService } from '../../services/auth.service';

export interface Clinic {
  id: number;
  name: string;
  cnpj?: string;
  address_city?: string;
  address_state?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  users_count?: number;
  batches_count?: number;
  professionals_count?: number;
  created_at: string;
}

@Component({
  selector: 'app-clinic-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    InputTextModule,
    DropdownModule,
    TagModule,
    CardModule,
    ToolbarModule,
    ConfirmDialogModule,
    ToastModule,
    DialogModule,
    ProgressSpinnerModule
  ],
  providers: [MessageService, ConfirmationService],
  template: ''
})
export class ClinicListComponent implements OnInit {
  clinics: Clinic[] = [];
  loading = true;
  
  // Search and filters
  searchTerm = '';
  isActiveFilter: any = null;
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;
  totalPages = 0;
  
  // Dialog
  showDialog = false;
  selectedClinic: Clinic | null = null;
  isEditMode = false;
  
  // Form data
  clinicForm = {
    name: '',
    cnpj: '',
    cro_number: '',
    address_street: '',
    address_number: '',
    address_complement: '',
    address_neighborhood: '',
    address_city: '',
    address_state: '',
    address_zipcode: '',
    phone: '',
    email: '',
    website: '',
    timezone: 'America/Sao_Paulo'
  };
  
  // Dropdown options
  stateOptions = [
    { label: 'Acre', value: 'AC' },
    { label: 'Alagoas', value: 'AL' },
    { label: 'Amapá', value: 'AP' },
    { label: 'Amazonas', value: 'AM' },
    { label: 'Bahia', value: 'BA' },
    { label: 'Ceará', value: 'CE' },
    { label: 'Distrito Federal', value: 'DF' },
    { label: 'Espírito Santo', value: 'ES' },
    { label: 'Goiás', value: 'GO' },
    { label: 'Maranhão', value: 'MA' },
    { label: 'Mato Grosso', value: 'MT' },
    { label: 'Mato Grosso do Sul', value: 'MS' },
    { label: 'Minas Gerais', value: 'MG' },
    { label: 'Pará', value: 'PA' },
    { label: 'Paraíba', value: 'PB' },
    { label: 'Paraná', value: 'PR' },
    { label: 'Pernambuco', value: 'PE' },
    { label: 'Piauí', value: 'PI' },
    { label: 'Rio de Janeiro', value: 'RJ' },
    { label: 'Rio Grande do Norte', value: 'RN' },
    { label: 'Rio Grande do Sul', value: 'RS' },
    { label: 'Rondônia', value: 'RO' },
    { label: 'Roraima', value: 'RR' },
    { label: 'Santa Catarina', value: 'SC' },
    { label: 'São Paulo', value: 'SP' },
    { label: 'Sergipe', value: 'SE' },
    { label: 'Tocantins', value: 'TO' }
  ];
  
  filterOptions = [
    { label: 'Todas', value: null },
    { label: 'Ativas', value: true },
    { label: 'Inativas', value: false }
  ];

  constructor(
    private clinicService: ClinicService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadClinics();
  }

  loadClinics() {
    this.loading = true;
    
    const params = {
      page: this.currentPage,
      limit: this.itemsPerPage,
      search: this.searchTerm,
      is_active: this.isActiveFilter
    };

    this.clinicService.getClinics(params).subscribe({
      next: (response) => {
        this.clinics = response.clinics;
        this.totalItems = response.pagination.total_items;
        this.totalPages = response.pagination.total_pages;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading clinics:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Erro ao carregar clínicas'
        });
        this.loading = false;
      }
    });
  }

  search() {
    this.currentPage = 1;
    this.loadClinics();
  }

  onPageChange(event: any) {
    this.currentPage = event.page + 1;
    this.loadClinics();
  }

  openNewClinicDialog() {
    this.isEditMode = false;
    this.selectedClinic = null;
    this.resetForm();
    this.showDialog = true;
  }

  editClinic(clinic: Clinic) {
    this.isEditMode = true;
    this.selectedClinic = clinic;
    this.populateForm(clinic);
    this.showDialog = true;
  }

  viewClinic(clinic: Clinic) {
    this.router.navigate(['/clinics', clinic.id]);
  }

  deleteClinic(clinic: Clinic) {
    this.confirmationService.confirm({
      message: `Tem certeza que deseja desativar a clínica "${clinic.name}"?`,
      header: 'Confirmar Desativação',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.clinicService.deleteClinic(clinic.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Sucesso',
              detail: 'Clínica desativada com sucesso'
            });
            this.loadClinics();
          },
          error: (error) => {
            console.error('Error deleting clinic:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Erro',
              detail: error.error?.error || 'Erro ao desativar clínica'
            });
          }
        });
      }
    });
  }

  saveClinic() {
    if (!this.clinicForm.name) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Aviso',
        detail: 'Nome da clínica é obrigatório'
      });
      return;
    }

    const operation = this.isEditMode 
      ? this.clinicService.updateClinic(this.selectedClinic!.id, this.clinicForm)
      : this.clinicService.createClinic(this.clinicForm);

    operation.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: `Clínica ${this.isEditMode ? 'atualizada' : 'criada'} com sucesso`
        });
        this.showDialog = false;
        this.loadClinics();
      },
      error: (error) => {
        console.error('Error saving clinic:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: error.error?.error || `Erro ao ${this.isEditMode ? 'atualizar' : 'criar'} clínica`
        });
      }
    });
  }

  resetForm() {
    this.clinicForm = {
      name: '',
      cnpj: '',
      cro_number: '',
      address_street: '',
      address_number: '',
      address_complement: '',
      address_neighborhood: '',
      address_city: '',
      address_state: '',
      address_zipcode: '',
      phone: '',
      email: '',
      website: '',
      timezone: 'America/Sao_Paulo'
    };
  }

  populateForm(clinic: any) {
    this.clinicForm = {
      name: clinic.name || '',
      cnpj: clinic.cnpj || '',
      cro_number: clinic.cro_number || '',
      address_street: clinic.address_street || '',
      address_number: clinic.address_number || '',
      address_complement: clinic.address_complement || '',
      address_neighborhood: clinic.address_neighborhood || '',
      address_city: clinic.address_city || '',
      address_state: clinic.address_state || '',
      address_zipcode: clinic.address_zipcode || '',
      phone: clinic.phone || '',
      email: clinic.email || '',
      website: clinic.website || '',
      timezone: clinic.timezone || 'America/Sao_Paulo'
    };
  }

  formatCNPJ(value: string): string {
    if (!value) return '';
    return value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  formatPhone(value: string): string {
    if (!value) return '';
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
      return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    }
    return value;
  }

  getSeverity(isActive: boolean): string {
    return isActive ? 'success' : 'danger';
  }

  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Ativa' : 'Inativa';
  }

  canEdit(): boolean {
    const userRole = this.authService.getCurrentUser()?.role;
    return ['super_admin', 'admin', 'manager'].includes(userRole);
  }

  canDelete(): boolean {
    const userRole = this.authService.getCurrentUser()?.role;
    return ['super_admin', 'admin'].includes(userRole);
  }
}