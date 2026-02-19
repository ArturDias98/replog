import { Component, signal, inject, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { WorkoutDataService } from '../../services/workout-data.service';
import { MuscleGroupService } from '../../services/muscle-group.service';
import { UserPreferencesService } from '../../services/user-preferences.service';
import { MuscleGroup } from '../../models/muscle-group';
import { EditWorkoutModal } from '../edit-workout-modal/edit-workout-modal';
import { AddMuscleGroupModal } from '../add-muscle-group-modal/add-muscle-group-modal';
import { EditMuscleGroupModal } from '../edit-muscle-group-modal/edit-muscle-group-modal';
import { ActionButtonsComponent } from '../action-buttons/action-buttons';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog';

@Component({
    selector: 'app-muscle-group',
    imports: [DatePipe, EditWorkoutModal, AddMuscleGroupModal, EditMuscleGroupModal, ActionButtonsComponent, ConfirmationDialogComponent],
    templateUrl: './muscle-group.html',
    styleUrl: './muscle-group.css'
})
export class MuscleGroupComponent implements OnInit {
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly workoutService = inject(WorkoutDataService);
    private readonly muscleGroupService = inject(MuscleGroupService);
    private readonly userPreferencesService = inject(UserPreferencesService);

    protected readonly muscleGroups = signal<MuscleGroup[]>([]);
    protected readonly isLoading = signal<boolean>(false);
    protected readonly workoutTitle = signal<string>('');
    protected readonly workoutDate = signal<string>('');
    protected readonly workoutId = signal<string>('');
    protected readonly showEditModal = signal<boolean>(false);
    protected readonly showAddModal = signal<boolean>(false);
    protected readonly showEditMuscleGroupModal = signal<boolean>(false);
    protected readonly showDeleteConfirm = signal<boolean>(false);
    protected readonly isDeleting = signal<boolean>(false);
    protected readonly muscleGroupToDelete = signal<string>('');
    protected readonly muscleGroupToEdit = signal<string>('');
    protected readonly muscleGroupTitle = signal<string>('');
    protected readonly muscleGroupDate = signal<string>('');
    protected readonly showClearAllConfirm = signal<boolean>(false);
    protected readonly isClearing = signal<boolean>(false);

    async ngOnInit(): Promise<void> {
        const workoutId = this.route.snapshot.paramMap.get('workoutId');
        if (workoutId) {
            this.workoutId.set(workoutId);
            this.userPreferencesService.setLastVisitedWorkout(workoutId);
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

    protected async onMuscleGroupAdded(newMuscleGroup: MuscleGroup): Promise<void> {
        // Add the new muscle group to the list
        this.muscleGroups.update(groups => [...groups, newMuscleGroup]);
    }

    protected openEditMuscleGroupModal(muscleGroup: MuscleGroup): void {
        this.muscleGroupToEdit.set(muscleGroup.id);
        this.muscleGroupTitle.set(muscleGroup.title);
        this.muscleGroupDate.set(muscleGroup.date);
        this.showEditMuscleGroupModal.set(true);
    }

    protected closeEditMuscleGroupModal(): void {
        this.showEditMuscleGroupModal.set(false);
        this.muscleGroupToEdit.set('');
        this.muscleGroupTitle.set('');
        this.muscleGroupDate.set('');
    }

    protected async onMuscleGroupUpdated(updatedMuscleGroup: MuscleGroup): Promise<void> {
        // Update the specific muscle group in the list
        this.muscleGroups.update(groups =>
            groups.map(mg => mg.id === updatedMuscleGroup.id ? updatedMuscleGroup : mg)
        );
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
            await this.muscleGroupService.deleteMuscleGroup(muscleGroupId);
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

    protected navigateBack(): void {
        this.router.navigate(['/']);
    }

    protected navigateToExercises(muscleGroupId: string): void {
        this.router.navigate(['/exercises', muscleGroupId]);
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
            await this.muscleGroupService.clearAllMuscleGroups(this.workoutId());
            this.muscleGroups.set([]);
            this.closeClearAllConfirm();
        } catch (error) {
            console.error('Error clearing muscle groups:', error);
        } finally {
            this.isClearing.set(false);
        }
    }
}
