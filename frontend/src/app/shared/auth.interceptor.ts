import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const token = typeof localStorage === 'undefined' ? null : localStorage.getItem('bicicletas_token');
  if (!token) return next(request);
  return next(request.clone({ setHeaders: { Authorization: `Bearer ${token}` } })).pipe(
    catchError((error: unknown) => {
      // Un token vencido o firmado con otro secreto se descarta para no seguir fallando
      if (error instanceof HttpErrorResponse && error.status === 401) {
        localStorage.removeItem('bicicletas_token');
        localStorage.removeItem('bicicletas_usuario');
      }
      return throwError(() => error);
    })
  );
};
