import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { MessageService } from 'primeng/api';
import { catchError, throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const messageService = inject(MessageService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      const detail = err.error?.error || err.error?.message || 'Erro desconhecido';
      messageService.add({ severity: 'error', summary: 'Erro', detail });
      return throwError(() => err);
    })
  );
};
