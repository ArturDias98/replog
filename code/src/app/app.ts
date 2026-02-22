import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterOutlet, RouterLink, NavigationEnd } from '@angular/router';
import { Location } from '@angular/common';
import { filter, take } from 'rxjs';
import { TranslocoPipe } from '@jsverse/transloco';
import { App as CapacitorApp } from '@capacitor/app';
import { UserPreferencesService } from './services/user-preferences.service';

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

    ngOnInit(): void {
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
}
