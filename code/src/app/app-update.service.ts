import { Injectable, NgZone, inject, signal } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AppUpdateService {
    private readonly swUpdate = inject(SwUpdate);
    private readonly zone = inject(NgZone);
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private readonly onVisibilityChange = () => this.handleVisibilityChange();

    readonly updateAvailable = signal(false);

    start(): void {
        if (!this.swUpdate.isEnabled) return;

        this.swUpdate.versionUpdates
            .pipe(filter(event => event.type === 'VERSION_READY'))
            .subscribe(() => {
                this.updateAvailable.set(true);
            });

        this.swUpdate.unrecoverable.subscribe(event => {
            console.error('SW unrecoverable state:', event.reason);
            document.location.reload();
        });

        this.zone.runOutsideAngular(() => {
            setTimeout(() => this.checkForUpdate(), 35_000);

            this.intervalId = setInterval(() => this.checkForUpdate(), 60_000);
        });

        document.addEventListener('visibilitychange', this.onVisibilityChange);
    }

    activateAndReload(): void {
        this.swUpdate.activateUpdate().then(() => document.location.reload());
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        document.removeEventListener('visibilitychange', this.onVisibilityChange);
    }

    private checkForUpdate(): void {
        this.swUpdate.checkForUpdate().catch(err =>
            console.warn('SW update check failed:', err)
        );
    }

    private handleVisibilityChange(): void {
        if (document.visibilityState === 'visible') {
            this.checkForUpdate();
        }
    }
}
