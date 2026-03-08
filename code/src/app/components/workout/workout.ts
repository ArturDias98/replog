import { Component, inject, signal, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { App } from '@capacitor/app';
import { CdkDragDrop, CdkDrag, moveItemInArray } from '@angular/cdk/drag-drop';
import { WorkoutUseCase, StoragePort } from '@replog/application';
import { I18nUseCase } from '../../i18n';
import { WorkOutGroup } from '@replog/shared';
import { AddWorkoutModal } from './add-workout-modal/add-workout-modal';
import { ActionButtonsComponent } from '../shared/action-buttons/action-buttons';
import { ConfirmationDialogComponent } from '../shared/confirmation-dialog/confirmation-dialog';
import { ItemListComponent } from '../shared/item-list/item-list';
import { ItemCardComponent } from '../shared/item-list/item-card';

@Component({
    selector: 'app-workout',
    imports: [DatePipe, TranslocoPipe, CdkDrag, AddWorkoutModal, ActionButtonsComponent, ConfirmationDialogComponent, ItemListComponent, ItemCardComponent],
    templateUrl: './workout.html',
    styleUrl: './workout.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class Workout implements OnInit, OnDestroy {
    private readonly router = inject(Router);
    private readonly workoutUseCase = inject(WorkoutUseCase);
    private readonly storagePort = inject(StoragePort);
    protected readonly i18n = inject(I18nUseCase);

    protected readonly items = signal<WorkOutGroup[]>([]);
    protected readonly isLoading = signal<boolean>(false);
    protected readonly showAddModal = signal<boolean>(false);
    protected readonly showClearAllConfirm = signal<boolean>(false);
    protected readonly isClearing = signal<boolean>(false);
    protected readonly workoutToDelete = signal<string>('');
    protected readonly showDeleteConfirm = signal<boolean>(false);
    protected readonly isDeleting = signal<boolean>(false);

    private backButtonListener?: any;
    private unsubscribeStorage?: () => void;

    async ngOnInit(): Promise<void> {
        this.unsubscribeStorage = this.storagePort.onDataChanged(() => this.loadWorkouts());
        await this.loadWorkouts();

        // Handle hardware back button - exit app when on main page
        this.backButtonListener = await App.addListener('backButton', () => {
            App.exitApp();
        });
    }

    ngOnDestroy(): void {
        this.unsubscribeStorage?.();
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
            const workouts = await this.workoutUseCase.getWorkouts();
            this.items.set(workouts);
        } finally {
            this.isLoading.set(false);
        }
    }

    protected navigateToMuscleGroups(workoutId: string): void {
        this.router.navigate(['muscle-group', workoutId]);
    }

    protected async onItemDropped(event: CdkDragDrop<unknown>): Promise<void> {
        if (event.previousIndex === event.currentIndex) return;
        this.items.update(items => {
            const updated = [...items];
            moveItemInArray(updated, event.previousIndex, event.currentIndex);
            return updated;
        });
        await this.workoutUseCase.reorderWorkouts(event.previousIndex, event.currentIndex);
    }

    protected async onMoveItem(currentIndex: number, direction: 'up' | 'down'): Promise<void> {
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= this.items().length) return;
        this.items.update(items => {
            const updated = [...items];
            moveItemInArray(updated, currentIndex, newIndex);
            return updated;
        });
        await this.workoutUseCase.reorderWorkouts(currentIndex, newIndex);
    }

    protected confirmDeleteWorkoutById(workoutId: string): void {
        this.workoutToDelete.set(workoutId);
        this.showDeleteConfirm.set(true);
    }

    protected closeDeleteConfirm(): void {
        this.showDeleteConfirm.set(false);
        this.workoutToDelete.set('');
    }

    protected async deleteWorkout(): Promise<void> {
        const workoutId = this.workoutToDelete();
        if (!workoutId) return;

        this.isDeleting.set(true);
        try {
            await this.workoutUseCase.deleteWorkout(workoutId);
            this.items.update(items => items.filter(item => item.id !== workoutId));
            this.closeDeleteConfirm();
        } catch (error) {
            console.error('Failed to delete workout:', error);
        } finally {
            this.isDeleting.set(false);
        }
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
            await this.workoutUseCase.clearAllWorkouts();
            this.closeClearAllConfirm();
            await this.loadWorkouts();
        } catch (error) {
            console.error('Failed to clear workouts:', error);
        } finally {
            this.isClearing.set(false);
        }
    }
}
