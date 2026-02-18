import { Component, inject, signal, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { WorkoutDataService } from '../../services/workout-data.service';
import { WorkOutGroup } from '../../models/workout-group';
import { AddWorkoutModal } from '../add-workout-modal/add-workout-modal';

@Component({
    selector: 'app-workout',
    imports: [DatePipe, AddWorkoutModal],
    templateUrl: './workout.html',
    styleUrl: './workout.css'
})
export class Workout implements OnInit {
    private readonly router = inject(Router);
    private readonly workoutService = inject(WorkoutDataService);

    protected readonly items = signal<WorkOutGroup[]>([]);
    protected readonly isLoading = signal<boolean>(false);
    protected readonly showAddModal = signal<boolean>(false);
    protected readonly showDeleteConfirm = signal<boolean>(false);
    protected readonly workoutToDelete = signal<string | null>(null);
    protected readonly isDeleting = signal<boolean>(false);
    protected readonly showClearAllConfirm = signal<boolean>(false);
    protected readonly isClearing = signal<boolean>(false);

    async ngOnInit(): Promise<void> {
        await this.loadWorkouts();
    }

    protected openAddModal(): void {
        this.showAddModal.set(true);
    }

    protected closeAddModal(): void {
        this.showAddModal.set(false);
    }

    protected confirmDelete(workoutId: string): void {
        this.workoutToDelete.set(workoutId);
        this.showDeleteConfirm.set(true);
    }

    protected closeDeleteConfirm(): void {
        this.showDeleteConfirm.set(false);
        this.workoutToDelete.set(null);
    }

    protected async deleteWorkout(): Promise<void> {
        const id = this.workoutToDelete();
        if (!id) return;

        this.isDeleting.set(true);
        try {
            await this.workoutService.deleteWorkout(id);
            // Update items list directly without showing loading state
            this.items.set(this.items().filter(item => item.id !== id));
            this.closeDeleteConfirm();
        } catch (error) {
            console.error('Failed to delete workout:', error);
        } finally {
            this.isDeleting.set(false);
        }
    }

    protected async onWorkoutAdded(workoutId: string): Promise<void> {
        this.router.navigate(['muscle-group', workoutId]);
    }

    private async loadWorkouts(): Promise<void> {
        this.isLoading.set(true);
        try {
            const workouts = await this.workoutService.getWorkouts();
            this.items.set(workouts);
        } finally {
            this.isLoading.set(false);
        }
    }

    protected navigateToMuscleGroups(workoutId: string): void {
        this.router.navigate(['muscle-group', workoutId]);
    }

    protected confirmClearAll(): void {
        this.showClearAllConfirm.set(true);
    }

    protected closeClearAllConfirm(): void {
        this.showClearAllConfirm.set(false);
    }

    protected async clearAllWorkouts(): Promise<void> {
        this.isClearing.set(true);
        try {
            // Clear all workouts (you can pass a userId here if needed)
            await this.workoutService.clearAllWorkouts();
            this.closeClearAllConfirm();
            await this.loadWorkouts();
        } catch (error) {
            console.error('Failed to clear workouts:', error);
        } finally {
            this.isClearing.set(false);
        }
    }
}
