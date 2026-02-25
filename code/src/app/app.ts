import { Component, inject, OnInit, ChangeDetectionStrategy, signal, viewChild, effect, ElementRef } from '@angular/core';
import { Router, RouterOutlet, RouterLink, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { filter, take } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import { App as CapacitorApp } from '@capacitor/app';
import { UserPreferencesService } from './services/user-preferences.service';
import { AuthService } from './services/auth.service';
import { AuthUser } from './models/auth';

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
    private readonly userPreferencesService = inject(UserPreferencesService);
    private readonly authService = inject(AuthService);

    protected readonly currentUser = signal<AuthUser | null>(null);
    protected readonly showUserMenu = signal(false);
    protected readonly googleBtnContainer = viewChild<ElementRef>('googleBtn');

    constructor() {
        effect(() => {
            const container = this.googleBtnContainer();
            if (container) {
                this.authService.renderButton(container.nativeElement);
            }
        });
    }

    ngOnInit(): void {
        this.authService.initialize();
        this.currentUser.set(this.authService.getUser());

        this.authService.onUserChange((user) => {
            this.currentUser.set(user);
        });

        // Wait for the first navigation to complete before checking if we should redirect
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd),
            take(1)
        ).subscribe((event: NavigationEnd) => {
            const lastVisitedWorkoutId = this.userPreferencesService.getLastVisitedWorkout();

            // Only navigate to saved workout if user landed on the root route
            if (lastVisitedWorkoutId && event.urlAfterRedirects === '/') {
                this.router.navigate(['/muscle-group', lastVisitedWorkoutId]);
            }
        });
    }

    protected onSignOut(): void {
        this.authService.signOut();
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
