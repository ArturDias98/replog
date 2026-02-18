import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { filter, take } from 'rxjs';
import { UserPreferencesService } from './services/user-preferences.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private router = inject(Router);
  private userPreferencesService = inject(UserPreferencesService);

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
