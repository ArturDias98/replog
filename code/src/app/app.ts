import { Component, inject, OnInit, ChangeDetectionStrategy, signal, viewChild, effect, ElementRef } from '@angular/core';
import { Router, RouterOutlet, RouterLink, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { filter, take } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import { App as CapacitorApp } from '@capacitor/app';
import { AuthUser } from '@replog/shared';
import { AuthPort, SyncQueuePort, UserPreferencesPort, SyncUseCase, TokenRefreshUseCase } from '@replog/application';
import { SyncJob } from './jobs/sync.job';

@Component({
    selector: 'app-root',
    imports: [RouterOutlet, RouterLink, TranslocoPipe],
    templateUrl: './app.html',
    styleUrl: './app.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit {
    private readonly router = inject(Router);
    private readonly location = inject(Location);
    private readonly userPreferencesPort = inject(UserPreferencesPort);
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

        // Wait for the first navigation to complete before checking if we should redirect
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            take(1)
        ).subscribe((event: NavigationEnd) => {
            const lastVisitedWorkoutId = this.userPreferencesPort.getLastVisitedWorkout();

            // Only navigate to saved workout if user landed on the root route
            if (lastVisitedWorkoutId && event.urlAfterRedirects === '/') {
                this.router.navigate(['/muscle-group', lastVisitedWorkoutId]);
            }
        });
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
