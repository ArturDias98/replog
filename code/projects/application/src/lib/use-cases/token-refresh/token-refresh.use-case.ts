import { Injectable, inject } from '@angular/core';
import { AuthPort } from '../../ports/auth.port';

@Injectable({ providedIn: 'root' })
export class TokenRefreshUseCase {
    private static readonly CHECK_INTERVAL_MS = 60_000;

    private readonly auth = inject(AuthPort);
    private intervalId: ReturnType<typeof setInterval> | null = null;

    initialize(): void {
        if (this.intervalId) return;

        this.intervalId = setInterval(async () => {
            if (!this.auth.getUser()) return;
            if (!this.auth.isTokenExpired()) return;

            const token = await this.auth.refreshToken();
            if (!token) {
                this.auth.signOut();
            }
        }, TokenRefreshUseCase.CHECK_INTERVAL_MS);
    }

    destroy(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
