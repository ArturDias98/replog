import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class TokenRefreshService {
    private static readonly CHECK_INTERVAL_MS = 60_000;

    private readonly authService = inject(AuthService);
    private intervalId: ReturnType<typeof setInterval> | null = null;

    initialize(): void {
        if (this.intervalId) return;

        this.intervalId = setInterval(async () => {
            if (!this.authService.getUser()) return;
            if (!this.authService.isTokenExpired()) return;

            const token = await this.authService.refreshToken();
            if (!token) {
                this.authService.signOut();
            }
        }, TokenRefreshService.CHECK_INTERVAL_MS);
    }

    destroy(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
