import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { WorkoutDataService } from '../../services/workout-data.service';
import { Exercise } from '../../models/exercise';

@Component({
    selector: 'app-exercises',
    imports: [DatePipe],
    templateUrl: './exercises.html',
    styleUrl: './exercises.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExercisesComponent implements OnInit {
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly workoutService = inject(WorkoutDataService);

    protected readonly exercises = signal<Exercise[]>([]);
    protected readonly isLoading = signal<boolean>(false);
    protected readonly muscleGroupTitle = signal<string>('');
    protected readonly muscleGroupDate = signal<string>('');
    protected readonly muscleGroupId = signal<string>('');
    protected readonly workoutId = signal<string>('');

    async ngOnInit(): Promise<void> {
        const workoutId = this.route.snapshot.paramMap.get('workoutId');
        const muscleGroupId = this.route.snapshot.paramMap.get('muscleGroupId');

        if (workoutId && muscleGroupId) {
            this.workoutId.set(workoutId);
            this.muscleGroupId.set(muscleGroupId);
            await this.loadMuscleGroup();
        }
    }

    private async loadMuscleGroup(): Promise<void> {
        this.isLoading.set(true);
        try {
            const muscleGroup = await this.workoutService.getMuscleGroupById(this.muscleGroupId());
            if (muscleGroup) {
                this.exercises.set(muscleGroup.exercises);
                this.muscleGroupTitle.set(muscleGroup.title);
                this.muscleGroupDate.set(muscleGroup.date);
            }
        } finally {
            this.isLoading.set(false);
        }
    }

    protected navigateBack(): void {
        this.router.navigate(['/workout', this.workoutId(), 'muscle-groups']);
    }
}
