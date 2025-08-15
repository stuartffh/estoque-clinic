import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface InventoryMetrics {
  total_products: number;
  total_batches: number;
  total_units: number;
  expiring_soon: number;
  low_stock: number;
  stock_value: number;
  health_score: number;
}

export interface InventoryMovement {
  id: number;
  batch_id: number;
  movement_type: 'inbound' | 'outbound' | 'adjustment' | 'transfer' | 'return';
  quantity: number;
  reason?: string;
  reference_document?: string;
  professional_id?: number;
  from_clinic_id?: number;
  to_clinic_id?: number;
  notes?: string;
  created_at: string;
  batch?: {
    batch_number: string;
    product_name: string;
  };
  professional?: {
    name: string;
  };
}

export interface InventoryAlert {
  id: number;
  type: 'low_stock' | 'expiry_warning' | 'expiry_critical' | 'temperature_alert';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  batch_id?: number;
  product_id?: number;
  is_resolved: boolean;
  created_at: string;
  batch?: {
    batch_number: string;
    product_name: string;
  };
  product?: {
    name: string;
  };
}

export interface CategoryStats {
  category: string;
  total_products: number;
  total_stock: number;
  stock_value: number;
  percentage: number;
}

export interface DashboardData {
  metrics: InventoryMetrics;
  recent_movements: InventoryMovement[];
  active_alerts: InventoryAlert[];
  category_stats: CategoryStats[];
  stock_chart_data: any;
}

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private apiUrl = `${environment.apiUrl}/api/inventory`;

  constructor(private http: HttpClient) { }

  getDashboardData(clinicId?: number): Observable<DashboardData> {
    let params = new HttpParams();
    if (clinicId) {
      params = params.set('clinic_id', clinicId.toString());
    }
    
    return this.http.get<DashboardData>(`${this.apiUrl}/dashboard`, { params });
  }

  getMetrics(clinicId?: number): Observable<InventoryMetrics> {
    let params = new HttpParams();
    if (clinicId) {
      params = params.set('clinic_id', clinicId.toString());
    }
    
    return this.http.get<InventoryMetrics>(`${this.apiUrl}/metrics`, { params });
  }

  getMovements(params: any = {}): Observable<{ movements: InventoryMovement[], pagination: any }> {
    let httpParams = new HttpParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        httpParams = httpParams.set(key, params[key].toString());
      }
    });

    return this.http.get<{ movements: InventoryMovement[], pagination: any }>(`${this.apiUrl}/movements`, { params: httpParams });
  }

  getAlerts(params: any = {}): Observable<{ alerts: InventoryAlert[], pagination: any }> {
    let httpParams = new HttpParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        httpParams = httpParams.set(key, params[key].toString());
      }
    });

    return this.http.get<{ alerts: InventoryAlert[], pagination: any }>(`${this.apiUrl}/alerts`, { params: httpParams });
  }

  resolveAlert(id: number): Observable<any> {
    return this.http.patch(`${this.apiUrl}/alerts/${id}/resolve`, {});
  }

  createMovement(movement: any): Observable<InventoryMovement> {
    return this.http.post<InventoryMovement>(`${this.apiUrl}/movements`, movement);
  }
}