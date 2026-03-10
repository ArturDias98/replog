import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthPort } from './auth.port';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    if (!req.url.startsWith(environment.apiBaseUrl)) return next(req);
    if (req.url.includes('/api/auth/')) return next(req);

    const authService = inject(AuthPort);

    return from(authService.ensureValidToken()).pipe(
        switchMap((token) => {
            const authReq = token
                ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
                : req;
            return next(authReq);
        }),
    );
};
