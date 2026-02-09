import { Component, signal, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { WorkoutDataService } from '../services/workout-data.service';
import { MuscleGroup } from '../models/muscle-group';

@Component({
    selector: 'app-muscle-group',
    imports: [DatePipe],
    templateUrl: './muscle-group.html',
    styleUrl: './muscle-group.css'
})
export class MuscleGroupComponent implements OnInit {
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly workoutService = inject(WorkoutDataService);

    protected readonly muscleGroups = signal<MuscleGroup[]>([]);
    protected readonly isLoading = signal<boolean>(false);
    protected readonly workoutTitle = signal<string>('');
    protected readonly workoutDate = signal<string>('');

    async ngOnInit(): Promise<void> {
        const workoutId = this.route.snapshot.paramMap.get('id');
        if (workoutId) {
            this.isLoading.set(true);
            try {
                const workout = await this.workoutService.getWorkoutById(workoutId);
                if (workout) {
                    this.muscleGroups.set(workout.muscleGroup);
                    this.workoutTitle.set(workout.title);
                    this.workoutDate.set(workout.date);
                }
            } finally {
                this.isLoading.set(false);
            }
        }
    }
}
