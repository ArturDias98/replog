import { Injectable, inject } from '@angular/core';
import { SyncUseCase } from '@replog/application';

const DEFAULT_INTERVAL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class SyncJob {
    private readonly syncUseCase = inject(SyncUseCase);
    private intervalId: ReturnType<typeof setInterval> | null = null;

    start(intervalMs = DEFAULT_INTERVAL_MS): void {
        if (this.intervalId) return;

        this.intervalId = setInterval(() => {
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
