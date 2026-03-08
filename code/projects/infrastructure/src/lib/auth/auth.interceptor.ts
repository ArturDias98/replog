import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { inject } from '@angular/core';
import { from, Observable, switchMap, throwError, catchError } from 'rxjs';
import { AuthPort } from '@replog/application';
import { environment } from '../../../../../src/environments/environment';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    if (!req.url.startsWith(environment.apiBaseUrl)) return next(req);

    const authService = inject(AuthPort);

    return from(ensureFreshToken(authService)).pipe(
        switchMap((token) => {
            const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
            return next(authReq).pipe(catchError((error) => handle401(error, req, next, authService)));
        })
    );
};

async function ensureFreshToken(authService: AuthPort): Promise<string | null> {
    const token = authService.getIdToken();
    if (!token) return null;
    if (!authService.isTokenExpired()) return token;
    return await authService.refreshToken();
}

function handle401(error: unknown, req: HttpRequest<unknown>, next: HttpHandlerFn, authService: AuthPort): Observable<HttpEvent<unknown>> {
    if (!(error instanceof HttpErrorResponse) || error.status !== 401) return throwError(() => error);

    return from(authService.refreshToken()).pipe(
        switchMap((newToken) => {
            if (!newToken) {
                authService.signOut();
                return throwError(() => error);
            }
            return next(req.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } }));
        })
    );
}
