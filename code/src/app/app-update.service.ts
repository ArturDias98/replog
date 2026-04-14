import { Injectable, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
    private readonly swUpdate = inject(SwUpdate);
    private intervalId: ReturnType<typeof setInterval> | null = null;

    readonly updateAvailable = signal(false);

    start(): void {
        if (!this.swUpdate.isEnabled) return;

        this.swUpdate.versionUpdates
            .pipe(filter(event => event.type === 'VERSION_READY'))
            .subscribe(() => {
                this.updateAvailable.set(true);
            });

        this.intervalId = setInterval(() => {
            this.swUpdate.checkForUpdate();
        }, 60_000);
    }

    activateAndReload(): void {
        this.swUpdate.activateUpdate().then(() => document.location.reload());
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}
