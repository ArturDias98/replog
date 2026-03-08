import { Component, inject, OnInit, ChangeDetectionStrategy, signal, viewChild, effect, ElementRef } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AuthUser } from '@replog/shared';
import { SyncQueuePort, SyncUseCase } from '@replog/application';
import { AuthPort, TokenRefreshUseCase } from './auth';
import { SyncJob } from './jobs/sync.job';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, RouterLink, TranslocoPipe],
    templateUrl: './app.html',
    styleUrl: './app.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit {
    private readonly authPort = inject(AuthPort);
    private readonly syncUseCase = inject(SyncUseCase);
    private readonly syncQueue = inject(SyncQueuePort);
    private readonly syncJob = inject(SyncJob);
    private readonly tokenRefreshUseCase = inject(TokenRefreshUseCase);

    protected readonly currentUser = signal<AuthUser | null>(null);
    protected readonly showUserMenu = signal(false);
    protected readonly initialSyncLoading = signal(false);
    protected readonly initialSyncError = signal(false);
    protected readonly googleBtnContainer = viewChild<ElementRef>('googleBtn');

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

        if (this.authPort.getUser() && this.authPort.isTokenExpired()) {
            this.authPort.refreshToken().then((token) => {
                if (!token) {
                    this.authPort.signOut();
                    this.currentUser.set(null);
                }
            });
        }

        this.authPort.onUserChange(async (user) => {
            this.currentUser.set(user);
            if (user) {
                await this.performInitialSync();
            }
        });

        this.syncJob.start();
        this.tokenRefreshUseCase.initialize();
    }

    private async performInitialSync(): Promise<void> {
        this.initialSyncError.set(false);
        this.initialSyncLoading.set(true);
        try {
            const status = await this.syncUseCase.sync();
            if (status !== 'success') {
                this.initialSyncError.set(true);
            }
        } finally {
            this.initialSyncLoading.set(false);
        }
    }

    protected async retrySync(): Promise<void> {
        await this.performInitialSync();
    }

    protected async onSignOut(): Promise<void> {
        await this.syncQueue.clearAll();
        this.authPort.signOut();
        this.currentUser.set(null);
        this.showUserMenu.set(false);
    }

    protected toggleUserMenu(): void {
        this.showUserMenu.update(v => !v);
    }

    protected closeUserMenu(): void {
        this.showUserMenu.set(false);
    }
}
