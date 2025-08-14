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
import { PanelModule } from 'primeng/panel';
import { AccordionModule } from 'primeng/accordion';
import { ImageModule } from 'primeng/image';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';

import { MessageService, ConfirmationService } from 'primeng/api';

// Services
import { AestheticProductService } from '../../services/aesthetic-product.service';
import { AuthService } from '../../services/auth.service';

export interface AestheticProduct {
  id: number;
  name: string;
  brand: string;
  category: 'botox' | 'filler' | 'biostimulator' | 'equipment' | 'consumable';
  subcategory?: string;
  concentration?: string;
  volume_ml?: number;
  units_per_package: number;
  anvisa_registry?: string;
  manufacturer?: string;
  active_principle?: string;
  storage_temp_min: number;
  storage_temp_max: number;
  shelf_life_months: number;
  description?: string;
  usage_instructions?: string;
  contraindications?: string;
  image_url?: string;
  barcode?: string;
  is_controlled: boolean;
  requires_prescription: boolean;
  is_active: boolean;
  batches_count?: number;
  total_stock?: number;
  created_at: string;
  updated_at: string;
}

export interface ProductCategory {
  value: string;
  label: string;
  icon: string;
  description: string;
  subcategories: Array<{ value: string; label: string }>;
}

@Component({
  selector: 'app-product-list',
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
    ProgressSpinnerModule,
    PanelModule,
    AccordionModule,
    ImageModule,
    InputTextareaModule,
    InputNumberModule,
    CheckboxModule
  ],
  providers: [MessageService, ConfirmationService],
  template: ''
})
export class ProductListComponent implements OnInit {
  products: AestheticProduct[] = [];
  loading = true;
  
  // Search and filters
  searchTerm = '';
  selectedCategory: string | null = null;
  selectedBrand: string | null = null;
  isActiveFilter: any = true;
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 20;
  totalItems = 0;
  totalPages = 0;
  
  // Dialog
  showDialog = false;
  showDetailDialog = false;
  selectedProduct: AestheticProduct | null = null;
  isEditMode = false;
  
  // Categories and brands
  categories: ProductCategory[] = [];
  brands: Array<{ brand: string; products_count: number }> = [];
  
  // Form data
  productForm = {
    name: '',
    brand: '',
    category: '',
    subcategory: '',
    concentration: '',
    volume_ml: null,
    units_per_package: 1,
    anvisa_registry: '',
    manufacturer: '',
    active_principle: '',
    storage_temp_min: 2.0,
    storage_temp_max: 8.0,
    shelf_life_months: 24,
    description: '',
    usage_instructions: '',
    contraindications: '',
    image_url: '',
    barcode: '',
    is_controlled: false,
    requires_prescription: true
  };
  
  // Dropdown options
  categoryOptions: Array<{ label: string; value: string; icon: string }> = [];
  subcategoryOptions: Array<{ label: string; value: string }> = [];
  brandOptions: Array<{ label: string; value: string }> = [];
  
  filterOptions = [
    { label: 'Todos', value: null },
    { label: 'Ativos', value: true },
    { label: 'Inativos', value: false }
  ];

  // View modes
  viewMode: 'table' | 'grid' = 'table';

  constructor(
    private productService: AestheticProductService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCategories();
    this.loadBrands();
    this.loadProducts();
  }

  loadCategories() {
    this.productService.getCategories().subscribe({
      next: (response) => {
        this.categories = response.categories;
        this.categoryOptions = this.categories.map(cat => ({
          label: cat.label,
          value: cat.value,
          icon: cat.icon
        }));
      },
      error: (error) => {
        console.error('Error loading categories:', error);
      }
    });
  }

  loadBrands() {
    this.productService.getBrands().subscribe({
      next: (response) => {
        this.brands = response.brands;
        this.brandOptions = this.brands.map(brand => ({
          label: `${brand.brand} (${brand.products_count})`,
          value: brand.brand
        }));
      },
      error: (error) => {
        console.error('Error loading brands:', error);
      }
    });
  }

  loadProducts() {
    this.loading = true;
    
    const params = {
      page: this.currentPage,
      limit: this.itemsPerPage,
      search: this.searchTerm,
      category: this.selectedCategory,
      brand: this.selectedBrand,
      is_active: this.isActiveFilter
    };

    this.productService.getProducts(params).subscribe({
      next: (response) => {
        this.products = response.products;
        this.totalItems = response.pagination.total_items;
        this.totalPages = response.pagination.total_pages;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: 'Erro ao carregar produtos'
        });
        this.loading = false;
      }
    });
  }

  search() {
    this.currentPage = 1;
    this.loadProducts();
  }

  onPageChange(event: any) {
    this.currentPage = event.page + 1;
    this.loadProducts();
  }

  onCategoryChange() {
    this.updateSubcategories();
    this.search();
  }

  updateSubcategories() {
    if (this.productForm.category) {
      const category = this.categories.find(cat => cat.value === this.productForm.category);
      this.subcategoryOptions = category?.subcategories || [];
    } else {
      this.subcategoryOptions = [];
    }
    this.productForm.subcategory = '';
  }

  openNewProductDialog() {
    this.isEditMode = false;
    this.selectedProduct = null;
    this.resetForm();
    this.showDialog = true;
  }

  editProduct(product: AestheticProduct) {
    this.isEditMode = true;
    this.selectedProduct = product;
    this.populateForm(product);
    this.updateSubcategories();
    this.showDialog = true;
  }

  viewProduct(product: AestheticProduct) {
    this.selectedProduct = product;
    this.showDetailDialog = true;
  }

  deleteProduct(product: AestheticProduct) {
    this.confirmationService.confirm({
      message: `Tem certeza que deseja desativar o produto "${product.name}"?`,
      header: 'Confirmar Desativação',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.productService.deleteProduct(product.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Sucesso',
              detail: 'Produto desativado com sucesso'
            });
            this.loadProducts();
          },
          error: (error) => {
            console.error('Error deleting product:', error);
            this.messageService.add({
              severity: 'error',
              summary: 'Erro',
              detail: error.error?.error || 'Erro ao desativar produto'
            });
          }
        });
      }
    });
  }

  saveProduct() {
    if (!this.productForm.name || !this.productForm.brand || !this.productForm.category) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Aviso',
        detail: 'Nome, marca e categoria são obrigatórios'
      });
      return;
    }

    const operation = this.isEditMode 
      ? this.productService.updateProduct(this.selectedProduct!.id, this.productForm)
      : this.productService.createProduct(this.productForm);

    operation.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Sucesso',
          detail: `Produto ${this.isEditMode ? 'atualizado' : 'criado'} com sucesso`
        });
        this.showDialog = false;
        this.loadProducts();
        this.loadBrands(); // Refresh brands list
      },
      error: (error) => {
        console.error('Error saving product:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Erro',
          detail: error.error?.error || `Erro ao ${this.isEditMode ? 'atualizar' : 'criar'} produto`
        });
      }
    });
  }

  resetForm() {
    this.productForm = {
      name: '',
      brand: '',
      category: '',
      subcategory: '',
      concentration: '',
      volume_ml: null,
      units_per_package: 1,
      anvisa_registry: '',
      manufacturer: '',
      active_principle: '',
      storage_temp_min: 2.0,
      storage_temp_max: 8.0,
      shelf_life_months: 24,
      description: '',
      usage_instructions: '',
      contraindications: '',
      image_url: '',
      barcode: '',
      is_controlled: false,
      requires_prescription: true
    };
    this.subcategoryOptions = [];
  }

  populateForm(product: AestheticProduct) {
    this.productForm = {
      name: product.name || '',
      brand: product.brand || '',
      category: product.category || '',
      subcategory: product.subcategory || '',
      concentration: product.concentration || '',
      volume_ml: product.volume_ml || null,
      units_per_package: product.units_per_package || 1,
      anvisa_registry: product.anvisa_registry || '',
      manufacturer: product.manufacturer || '',
      active_principle: product.active_principle || '',
      storage_temp_min: product.storage_temp_min || 2.0,
      storage_temp_max: product.storage_temp_max || 8.0,
      shelf_life_months: product.shelf_life_months || 24,
      description: product.description || '',
      usage_instructions: product.usage_instructions || '',
      contraindications: product.contraindications || '',
      image_url: product.image_url || '',
      barcode: product.barcode || '',
      is_controlled: product.is_controlled || false,
      requires_prescription: product.requires_prescription !== false
    };
  }

  getCategoryLabel(category: string): string {
    const cat = this.categories.find(c => c.value === category);
    return cat?.label || category;
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

  getCategorySeverity(category: string): string {
    const severities: { [key: string]: string } = {
      'botox': 'danger',
      'filler': 'warning',
      'biostimulator': 'success',
      'equipment': 'info',
      'consumable': 'secondary'
    };
    return severities[category] || 'secondary';
  }

  getStatusSeverity(isActive: boolean): string {
    return isActive ? 'success' : 'danger';
  }

  getStatusLabel(isActive: boolean): string {
    return isActive ? 'Ativo' : 'Inativo';
  }

  getControlledLabel(isControlled: boolean): string {
    return isControlled ? 'Controlado' : 'Livre';
  }

  getControlledSeverity(isControlled: boolean): string {
    return isControlled ? 'warning' : 'info';
  }

  formatTemperatureRange(min: number, max: number): string {
    return `${min}°C a ${max}°C`;
  }

  formatVolume(volume: number | null): string {
    return volume ? `${volume}ml` : 'N/A';
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'table' ? 'grid' : 'table';
  }

  canEdit(): boolean {
    const userRole = this.authService.getCurrentUser()?.role;
    return ['super_admin', 'admin', 'manager'].includes(userRole);
  }

  canDelete(): boolean {
    const userRole = this.authService.getCurrentUser()?.role;
    return ['super_admin', 'admin'].includes(userRole);
  }

  navigateToInventory(productId: number) {
    this.router.navigate(['/inventory'], { queryParams: { product: productId } });
  }

  exportProducts() {
    // TODO: Implement export functionality
    this.messageService.add({
      severity: 'info',
      summary: 'Em Desenvolvimento',
      detail: 'Funcionalidade de exportação será implementada em breve'
    });
  }

  importProducts() {
    // TODO: Implement import functionality
    this.messageService.add({
      severity: 'info',
      summary: 'Em Desenvolvimento',
      detail: 'Funcionalidade de importação será implementada em breve'
    });
  }
}