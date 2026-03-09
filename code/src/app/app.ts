import { Component, inject, OnInit, OnDestroy, ChangeDetectionStrategy, signal, viewChild, effect, ElementRef } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthUser } from '@replog/shared';
import { StoragePort, SyncQueuePort, SyncUseCase } from '@replog/application';
import { AuthPort, TokenRefreshUseCase } from './auth';
import { SyncJob } from './jobs/sync.job';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, RouterLink, TranslocoPipe],
    templateUrl: './app.html',
    styleUrl: './app.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit, OnDestroy {
    private readonly authPort = inject(AuthPort);
    private readonly storagePort = inject(StoragePort);
    private readonly syncUseCase = inject(SyncUseCase);
    private readonly syncQueue = inject(SyncQueuePort);
    private readonly syncJob = inject(SyncJob);
    private readonly tokenRefreshUseCase = inject(TokenRefreshUseCase);

    protected readonly currentUser = signal<AuthUser | null>(null);
    protected readonly showUserMenu = signal(false);
    protected readonly syncStatus = signal<'idle' | 'synced' | 'pending'>('idle');
    protected readonly toastMessage = signal<string | null>(null);
    protected readonly toastType = signal<'success' | 'error' | null>(null);
    protected readonly toastVisible = signal(false);
    protected readonly tokenExpired = signal(false);
    protected readonly googleBtnContainer = viewChild<ElementRef>('googleBtn');

    private toastTimeout: ReturnType<typeof setTimeout> | null = null;
    private statusIntervalId: ReturnType<typeof setInterval> | null = null;

    constructor() {
        effect(() => {
            const container = this.googleBtnContainer();
            if (container) {
                this.authPort.renderButton(container.nativeElement);
            }
        });
    }

    ngOnInit(): void {
        this.authPort.initialize();
        this.currentUser.set(this.authPort.getUser());

        this.authPort.onUserChange(async (user) => {
            this.currentUser.set(user);
            if (user) {
                await this.performInitialSync();
            }
        });

        this.syncJob.start();
        this.tokenRefreshUseCase.initialize();
        this.startSyncStatusPolling();
    }

    ngOnDestroy(): void {
        if (this.statusIntervalId) {
            clearInterval(this.statusIntervalId);
        }
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
    }

    protected async syncNow(): Promise<void> {
        const status = await this.syncUseCase.sync();
        if (status === 'success') {
            this.showToast('sync.success', 'success');
        } else if (status !== 'idle') {
            this.showToast('sync.error', 'error');
        }
    }

    private async performInitialSync(): Promise<void> {
        try {
            const workouts = await this.storagePort.loadAll();
            await this.syncQueue.ensureInitialQueue(workouts);
            const status = await this.syncUseCase.sync();
            if (status === 'success') {
                this.showToast('sync.success', 'success');
            } else if (status !== 'idle') {
                this.showToast('sync.error', 'error');
            }
        } catch {
            this.showToast('sync.error', 'error');
        }
    }

    protected async onSignOut(): Promise<void> {
        await this.syncQueue.clearAll();
        this.authPort.signOut();
        this.currentUser.set(null);
        this.showUserMenu.set(false);
        this.syncStatus.set('idle');
    }

    protected toggleUserMenu(): void {
        this.showUserMenu.update(v => !v);
    }

    protected closeUserMenu(): void {
        this.showUserMenu.set(false);
    }

    private showToast(message: string, type: 'success' | 'error'): void {
        if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
        }
        this.toastMessage.set(message);
        this.toastType.set(type);
        this.toastVisible.set(true);
        this.toastTimeout = setTimeout(() => {
            this.toastVisible.set(false);
        }, 3000);
    }

    private startSyncStatusPolling(): void {
        this.statusIntervalId = setInterval(async () => {
            const user = this.currentUser();
            if (!user) {
                this.syncStatus.set('idle');
                this.tokenExpired.set(false);
                return;
            }
            this.tokenExpired.set(!this.authPort.isAuthenticated());
            const count = await this.syncQueue.getPendingChangeCount();
            this.syncStatus.set(count > 0 ? 'pending' : 'synced');
        }, 2000);
    }
}
