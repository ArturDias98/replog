import { Component, signal, inject, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { App } from '@capacitor/app';
import { CdkDragDrop, CdkDrag, moveItemInArray } from '@angular/cdk/drag-drop';
import { WorkoutUseCase, MuscleGroupUseCase, StoragePort, UserPreferencesPort, I18nUseCase } from '@replog/application';
import { MuscleGroup } from '@replog/shared';
import { EditWorkoutModal } from '../workout/edit-workout-modal/edit-workout-modal';
import { AddMuscleGroupModal } from './add-muscle-group-modal/add-muscle-group-modal';
import { ActionButtonsComponent } from '../shared/action-buttons/action-buttons';
import { ConfirmationDialogComponent } from '../shared/confirmation-dialog/confirmation-dialog';
import { ItemListComponent } from '../shared/item-list/item-list';
import { ItemCardComponent } from '../shared/item-list/item-card';

@Component({
    selector: 'app-muscle-group',
    imports: [DatePipe, TranslocoPipe, CdkDrag, EditWorkoutModal, AddMuscleGroupModal, ActionButtonsComponent, ConfirmationDialogComponent, ItemListComponent, ItemCardComponent],
    templateUrl: './muscle-group.html',
    styleUrl: './muscle-group.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class MuscleGroupComponent implements OnInit, OnDestroy {
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly workoutUseCase = inject(WorkoutUseCase);
    private readonly muscleGroupUseCase = inject(MuscleGroupUseCase);
    private readonly userPreferencesPort = inject(UserPreferencesPort);
    private readonly storagePort = inject(StoragePort);
    protected readonly i18n = inject(I18nUseCase);

    protected readonly muscleGroups = signal<MuscleGroup[]>([]);
    protected readonly isLoading = signal<boolean>(false);
    protected readonly workoutTitle = signal<string>('');
    protected readonly workoutDate = signal<string>('');
    protected readonly workoutId = signal<string>('');
    protected readonly showEditModal = signal<boolean>(false);
    protected readonly showAddModal = signal<boolean>(false);
    protected readonly showClearAllConfirm = signal<boolean>(false);
    protected readonly isClearing = signal<boolean>(false);
    protected readonly showDeleteWorkoutConfirm = signal<boolean>(false);
    protected readonly isDeletingWorkout = signal<boolean>(false);
    protected readonly muscleGroupItemToDelete = signal<string>('');
    protected readonly showDeleteItemConfirm = signal<boolean>(false);
    protected readonly isDeletingItem = signal<boolean>(false);

    private backButtonListener?: any;
    private unsubscribeStorage?: () => void;

    async ngOnInit(): Promise<void> {
        const workoutId = this.route.snapshot.paramMap.get('workoutId');
        if (workoutId) {
            this.workoutId.set(workoutId);
            this.userPreferencesPort.setLastVisitedWorkout(workoutId);
            this.unsubscribeStorage = this.storagePort.onDataChanged(() => this.loadWorkout());
            await this.loadWorkout();
        }

        // Handle hardware back button - navigate to workout page
        this.backButtonListener = await App.addListener('backButton', () => {
            this.navigateBack();
        });
    }

    ngOnDestroy(): void {
        this.unsubscribeStorage?.();
        this.backButtonListener?.remove();
    }

    private async loadWorkout(): Promise<void> {
        this.isLoading.set(true);
        try {
            const workout = await this.workoutUseCase.getWorkoutById(this.workoutId());
            if (workout) {
                this.muscleGroups.set(workout.muscleGroup);
                this.workoutTitle.set(workout.title);
                this.workoutDate.set(workout.date);
            } else {
                // Workout not found, redirect to main page
                this.router.navigate(['/']);
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

    protected openAddModal(): void {
        this.showAddModal.set(true);
    }

    protected closeAddModal(): void {
        this.showAddModal.set(false);
    }

    protected onMuscleGroupAdded(): void {
        // Data reload is handled by onDataChanged listener
    }

    protected onWorkoutUpdated(updatedData: { title: string; date: string }): void {
        // Update workout title and date with the returned data
        this.workoutTitle.set(updatedData.title);
        this.workoutDate.set(updatedData.date);
    }

    protected navigateBack(): void {
        this.router.navigate(['/']);
    }

    protected navigateToExercises(muscleGroupId: string): void {
        this.router.navigate(['/exercises', muscleGroupId]);
    }

    protected async onItemDropped(event: CdkDragDrop<unknown>): Promise<void> {
        if (event.previousIndex === event.currentIndex) return;
        this.muscleGroups.update(groups => {
            const updated = [...groups];
            moveItemInArray(updated, event.previousIndex, event.currentIndex);
            return updated;
        });
        await this.muscleGroupUseCase.reorderMuscleGroups(
            this.workoutId(), event.previousIndex, event.currentIndex
        );
    }

    protected async onMoveItem(currentIndex: number, direction: 'up' | 'down'): Promise<void> {
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (newIndex < 0 || newIndex >= this.muscleGroups().length) return;
        this.muscleGroups.update(groups => {
            const updated = [...groups];
            moveItemInArray(updated, currentIndex, newIndex);
            return updated;
        });
        await this.muscleGroupUseCase.reorderMuscleGroups(
            this.workoutId(), currentIndex, newIndex
        );
    }

    protected confirmDeleteMuscleGroupById(muscleGroupId: string): void {
        this.muscleGroupItemToDelete.set(muscleGroupId);
        this.showDeleteItemConfirm.set(true);
    }

    protected closeDeleteItemConfirm(): void {
        this.showDeleteItemConfirm.set(false);
        this.muscleGroupItemToDelete.set('');
    }

    protected async deleteMuscleGroupItem(): Promise<void> {
        const muscleGroupId = this.muscleGroupItemToDelete();
        if (!muscleGroupId) return;

        this.isDeletingItem.set(true);
        try {
            await this.muscleGroupUseCase.deleteMuscleGroup(muscleGroupId);
            this.muscleGroups.update(groups => groups.filter(g => g.id !== muscleGroupId));
            this.closeDeleteItemConfirm();
        } catch (error) {
            console.error('Error deleting muscle group:', error);
        } finally {
            this.isDeletingItem.set(false);
        }
    }

    protected confirmClearAll(): void {
        this.showClearAllConfirm.set(true);
    }

    protected closeClearAllConfirm(): void {
        this.showClearAllConfirm.set(false);
    }

    protected async clearAllMuscleGroups(): Promise<void> {
        this.isClearing.set(true);
        try {
            await this.muscleGroupUseCase.clearAllMuscleGroups(this.workoutId());
            this.muscleGroups.set([]);
            this.closeClearAllConfirm();
        } catch (error) {
            console.error('Error clearing muscle groups:', error);
        } finally {
            this.isClearing.set(false);
        }
    }

    protected confirmDeleteWorkout(): void {
        this.showDeleteWorkoutConfirm.set(true);
    }

    protected closeDeleteWorkoutConfirm(): void {
        this.showDeleteWorkoutConfirm.set(false);
    }

    protected async deleteWorkout(): Promise<void> {
        const workoutId = this.workoutId();
        if (!workoutId) {
            return;
        }

        this.isDeletingWorkout.set(true);
        try {
            await this.workoutUseCase.deleteWorkout(workoutId);
            // Navigate back to the workout list after deletion
            this.router.navigate(['/']);
        } catch (error) {
            console.error('Error deleting workout:', error);
        } finally {
            this.isDeletingWorkout.set(false);
        }
    }
}
