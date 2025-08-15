/**
 * ESTOQUE CLINIC - PRELOAD STRATEGY
 * Estratégia customizada de preload para otimização
 */

import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CustomPreloadStrategy implements PreloadingStrategy {
  
  preload(route: Route, load: () => Observable<any>): Observable<any> {
    // Não precarregar se especificado
    if (route.data?.['skipPreload']) {
      return of(null);
    }

    // Preload imediato para rotas críticas
    if (route.data?.['preloadPriority'] === 'high') {
      console.log('🚀 Preloading high priority:', route.path);
      return load();
    }

    // Preload com delay para rotas de prioridade média
    if (route.data?.['preloadPriority'] === 'medium') {
      console.log('⏳ Preloading medium priority:', route.path);
      return timer(2000).pipe(mergeMap(() => load()));
    }

    // Preload com delay maior para rotas de baixa prioridade
    if (route.data?.['preloadPriority'] === 'low') {
      console.log('🐌 Preloading low priority:', route.path);
      return timer(5000).pipe(mergeMap(() => load()));
    }

    // Default: preload após 1 segundo
    console.log('📦 Preloading default:', route.path);
    return timer(1000).pipe(mergeMap(() => load()));
  }
}