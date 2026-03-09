import { Injectable, inject } from '@angular/core';
import { SyncUseCase } from '@replog/application';
import { AuthPort } from '../auth';

const DEFAULT_INTERVAL_MS = 1000;

@Injectable({ providedIn: 'root' })
export class SyncJob {
    private readonly syncUseCase = inject(SyncUseCase);
    private readonly authPort = inject(AuthPort);
    private intervalId: ReturnType<typeof setInterval> | null = null;

    start(intervalMs = DEFAULT_INTERVAL_MS): void {
        if (this.intervalId) return;

        this.intervalId = setInterval(() => {
            if (!this.authPort.isAuthenticated()) return;
            this.syncUseCase.sync();
        }, intervalMs);
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
