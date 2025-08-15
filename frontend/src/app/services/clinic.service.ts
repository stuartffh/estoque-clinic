import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Clinic {
  id: number;
  name: string;
  code: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  logo_url?: string;
  timezone: string;
  is_active: boolean;
  clinic_group_id: number;
  created_at: string;
  updated_at: string;
}

export interface ClinicsResponse {
  clinics: Clinic[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ClinicService {
  private apiUrl = `${environment.apiUrl}/api/clinics`;

  constructor(private http: HttpClient) { }

  getClinics(params: any = {}): Observable<ClinicsResponse> {
    let httpParams = new HttpParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        httpParams = httpParams.set(key, params[key].toString());
      }
    });

    return this.http.get<ClinicsResponse>(this.apiUrl, { params: httpParams });
  }

  getClinic(id: number): Observable<Clinic> {
    return this.http.get<Clinic>(`${this.apiUrl}/${id}`);
  }

  createClinic(clinic: any): Observable<Clinic> {
    return this.http.post<Clinic>(this.apiUrl, clinic);
  }

  updateClinic(id: number, clinic: any): Observable<Clinic> {
    return this.http.put<Clinic>(`${this.apiUrl}/${id}`, clinic);
  }

  deleteClinic(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}