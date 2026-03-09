import { Injectable, inject } from '@angular/core';
import { AuthPort } from './auth.port';

@Injectable({ providedIn: 'root' })
export class TokenRefreshUseCase {
    private static readonly CHECK_INTERVAL_MS = 60_000;

    private readonly auth = inject(AuthPort);
    private intervalId: ReturnType<typeof setInterval> | null = null;

    initialize(): void {
        if (this.intervalId) return;

        this.intervalId = setInterval(async () => {
            if (this.auth.isAuthenticated()) return;
            if (!this.auth.getUser()) return;

            await this.auth.refreshToken();
        }, TokenRefreshUseCase.CHECK_INTERVAL_MS);
    }

    destroy(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
