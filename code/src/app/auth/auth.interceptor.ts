import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, switchMap } from 'rxjs';
import { AuthPort } from './auth.port';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const apiBaseUrl = environment.apiBaseUrl;
    const isApiRequest = apiBaseUrl
        ? req.url.startsWith(apiBaseUrl)
        : req.url.startsWith('/api/');

    if (!isApiRequest) return next(req);

    const reqWithCredentials = req.clone({ withCredentials: true });

    if (req.url.includes('/api/auth/')) return next(reqWithCredentials);

    const authService = inject(AuthPort);

    return from(authService.ensureValidToken()).pipe(
        switchMap(() => next(reqWithCredentials)),
    );
};
