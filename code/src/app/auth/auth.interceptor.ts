import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthPort } from './auth.port';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    if (!req.url.startsWith(environment.apiBaseUrl)) return next(req);

    const authService = inject(AuthPort);
    const token = authService.getIdToken();
    const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
    return next(authReq);
};
