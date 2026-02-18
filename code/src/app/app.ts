import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
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
    const lastVisitedWorkoutId = this.userPreferencesService.getLastVisitedWorkout();

    if (lastVisitedWorkoutId) {
      this.router.navigate(['/muscle-group', lastVisitedWorkoutId]);
    }
  }
}
