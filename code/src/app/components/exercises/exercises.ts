import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { WorkoutDataService } from '../../services/workout-data.service';
import { Exercise } from '../../models/exercise';
import { AddExerciseModal } from '../add-exercise-modal/add-exercise-modal';

@Component({
    selector: 'app-exercises',
    imports: [DatePipe, AddExerciseModal],
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
    protected readonly showAddExerciseModal = signal<boolean>(false);
    protected readonly showDeleteConfirm = signal<boolean>(false);
    protected readonly isDeleting = signal<boolean>(false);
    protected readonly exerciseToDelete = signal<string>('');

    async ngOnInit(): Promise<void> {
        const muscleGroupId = this.route.snapshot.paramMap.get('muscleGroupId');

        if (muscleGroupId) {
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
                this.workoutId.set(muscleGroup.workoutId);
            }
        } finally {
            this.isLoading.set(false);
        }
    }

    protected navigateBack(): void {
        this.router.navigate(['/muscle-group', this.workoutId()]);
    }

    protected openAddExerciseModal(): void {
        this.showAddExerciseModal.set(true);
    }

    protected closeAddExerciseModal(): void {
        this.showAddExerciseModal.set(false);
    }

    protected handleExerciseAdded(exercise: Exercise): void {
        this.exercises.update(current => [...current, exercise]);
    }

    protected confirmDelete(exerciseId: string): void {
        this.exerciseToDelete.set(exerciseId);
        this.showDeleteConfirm.set(true);
    }

    protected closeDeleteConfirm(): void {
        this.showDeleteConfirm.set(false);
        this.exerciseToDelete.set('');
    }

    protected async deleteExercise(): Promise<void> {
        const exerciseId = this.exerciseToDelete();
        if (!exerciseId) {
            return;
        }

        this.isDeleting.set(true);
        try {
            await this.workoutService.deleteExercise(exerciseId);
            // Remove from local state
            this.exercises.set(
                this.exercises().filter(ex => ex.id !== exerciseId)
            );
            this.closeDeleteConfirm();
        } catch (error) {
            console.error('Error deleting exercise:', error);
        } finally {
            this.isDeleting.set(false);
        }
    }
}
