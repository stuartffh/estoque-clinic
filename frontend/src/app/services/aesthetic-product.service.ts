import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

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

export interface ProductsResponse {
  products: AestheticProduct[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}

export interface CategoriesResponse {
  categories: ProductCategory[];
}

export interface BrandsResponse {
  brands: Array<{ brand: string; products_count: number }>;
}

@Injectable({
  providedIn: 'root'
})
export class AestheticProductService {
  private apiUrl = `${environment.apiUrl}/api/aesthetic-products`;

  constructor(private http: HttpClient) { }

  getProducts(params: any = {}): Observable<ProductsResponse> {
    let httpParams = new HttpParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        httpParams = httpParams.set(key, params[key].toString());
      }
    });

    return this.http.get<ProductsResponse>(this.apiUrl, { params: httpParams });
  }

  getProduct(id: number): Observable<AestheticProduct> {
    return this.http.get<AestheticProduct>(`${this.apiUrl}/${id}`);
  }

  createProduct(product: any): Observable<AestheticProduct> {
    return this.http.post<AestheticProduct>(this.apiUrl, product);
  }

  updateProduct(id: number, product: any): Observable<AestheticProduct> {
    return this.http.put<AestheticProduct>(`${this.apiUrl}/${id}`, product);
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getCategories(): Observable<CategoriesResponse> {
    return this.http.get<CategoriesResponse>(`${this.apiUrl}/categories`);
  }

  getBrands(): Observable<BrandsResponse> {
    return this.http.get<BrandsResponse>(`${this.apiUrl}/brands`);
  }
}