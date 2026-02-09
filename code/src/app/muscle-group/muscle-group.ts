import { Component, signal, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { WorkoutDataService } from '../services/workout-data.service';
import { MuscleGroup } from '../models/muscle-group';
import { EditWorkoutModal } from '../edit-workout-modal/edit-workout-modal';

@Component({
    selector: 'app-muscle-group',
    imports: [DatePipe, EditWorkoutModal],
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
    protected readonly workoutId = signal<string>('');
    protected readonly showEditModal = signal<boolean>(false);
    protected readonly showDeleteConfirm = signal<boolean>(false);
    protected readonly isDeleting = signal<boolean>(false);
    protected readonly muscleGroupToDelete = signal<string>('');

    async ngOnInit(): Promise<void> {
        const workoutId = this.route.snapshot.paramMap.get('id');
        if (workoutId) {
            this.workoutId.set(workoutId);
            await this.loadWorkout();
        }
    }

    private async loadWorkout(): Promise<void> {
        this.isLoading.set(true);
        try {
            const workout = await this.workoutService.getWorkoutById(this.workoutId());
            if (workout) {
                this.muscleGroups.set(workout.muscleGroup);
                this.workoutTitle.set(workout.title);
                this.workoutDate.set(workout.date);
            }
        } finally {
            this.isLoading.set(false);
        }
    }

    protected openEditModal(): void {
        this.showEditModal.set(true);
    }

    protected closeEditModal(): void {
        this.showEditModal.set(false);
    }

    protected onWorkoutUpdated(updatedData: { title: string; date: string }): void {
        // Update workout title and date with the returned data
        this.workoutTitle.set(updatedData.title);
        this.workoutDate.set(updatedData.date);
    }

    protected confirmDelete(muscleGroupId: string): void {
        this.muscleGroupToDelete.set(muscleGroupId);
        this.showDeleteConfirm.set(true);
    }

    protected closeDeleteConfirm(): void {
        this.showDeleteConfirm.set(false);
        this.muscleGroupToDelete.set('');
    }

    protected async deleteMuscleGroup(): Promise<void> {
        const muscleGroupId = this.muscleGroupToDelete();
        if (!muscleGroupId) {
            return;
        }

        this.isDeleting.set(true);
        try {
            await this.workoutService.deleteMuscleGroup(muscleGroupId);
            // Remove from local state
            this.muscleGroups.set(
                this.muscleGroups().filter(mg => mg.id !== muscleGroupId)
            );
            this.closeDeleteConfirm();
        } catch (error) {
            console.error('Error deleting muscle group:', error);
        } finally {
            this.isDeleting.set(false);
        }
    }
}
