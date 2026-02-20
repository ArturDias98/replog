import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { WorkoutDataService } from '../../services/workout-data.service';
import { WorkOutGroup } from '../../models/workout-group';
import { AddWorkoutModal } from '../add-workout-modal/add-workout-modal';
import { ActionButtonsComponent } from '../action-buttons/action-buttons';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog';

@Component({
    selector: 'app-workout',
    imports: [DatePipe, AddWorkoutModal, ActionButtonsComponent, ConfirmationDialogComponent],
    templateUrl: './workout.html',
    styleUrl: './workout.css'
})
export class Workout implements OnInit, OnDestroy {
    private readonly router = inject(Router);
    private readonly workoutService = inject(WorkoutDataService);

    protected readonly items = signal<WorkOutGroup[]>([]);
    protected readonly isLoading = signal<boolean>(false);
    protected readonly showAddModal = signal<boolean>(false);
    protected readonly showClearAllConfirm = signal<boolean>(false);
    protected readonly isClearing = signal<boolean>(false);

    private backButtonListener?: any;

    async ngOnInit(): Promise<void> {
        await this.loadWorkouts();

        // Handle hardware back button - exit app when on main page
        this.backButtonListener = await App.addListener('backButton', () => {
            App.exitApp();
        });
    }

    ngOnDestroy(): void {
        // Remove back button listener
        this.backButtonListener?.remove();
    }

    protected openAddModal(): void {
        this.showAddModal.set(true);
    }

    protected closeAddModal(): void {
        this.showAddModal.set(false);
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
