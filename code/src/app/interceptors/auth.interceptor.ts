import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    if (!req.url.startsWith(environment.apiBaseUrl)) {
        return next(req);
    }

    const authService = inject(AuthService);
    const token = authService.getIdToken();

    if (token) {
        const authReq = req.clone({
            setHeaders: { Authorization: `Bearer ${token}` },
        });
        return next(authReq);
    }

    return next(req);
};
