import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { WorkoutDataService } from '../services/workout-data.service';
import { WorkOutGroup } from '../models/workout-group';

@Component({
    selector: 'app-workout',
    imports: [DatePipe],
    templateUrl: './workout.html',
    styleUrl: './workout.css'
})
export class Workout implements OnInit {
    private readonly router = inject(Router);
    private readonly workoutService = inject(WorkoutDataService);

    protected readonly items = signal<WorkOutGroup[]>([]);
    protected readonly isLoading = signal<boolean>(false);

    async ngOnInit(): Promise<void> {
        this.isLoading.set(true);
        try {
            const workouts = await this.workoutService.getWorkouts();
            this.items.set(workouts);
        } finally {
            this.isLoading.set(false);
        }
    }

    protected navigateToMuscleGroups(workoutId: string): void {
        this.router.navigate(['workout', workoutId, 'muscle-groups']);
    }
}
