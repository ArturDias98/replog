import { Component, signal, inject, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { App } from '@capacitor/app';
import { MuscleGroupService } from '../../services/muscle-group.service';
import { ExerciseService } from '../../services/exercise.service';
import { I18nService } from '../../services/i18n.service';
import { Exercise } from '../../models/exercise';
import { MuscleGroup } from '../../models/muscle-group';
import { AddExerciseModal } from './add-exercise-modal/add-exercise-modal';
import { EditMuscleGroupModal } from '../muscle-group/edit-muscle-group-modal/edit-muscle-group-modal';
import { EditExerciseModal } from './edit-exercise-modal/edit-exercise-modal';
import { ActionButtonsComponent } from '../shared/action-buttons/action-buttons';
import { ConfirmationDialogComponent } from '../shared/confirmation-dialog/confirmation-dialog';
import { ItemListComponent } from '../shared/item-list/item-list';
import { ItemCardComponent } from '../shared/item-list/item-card';

@Component({
    selector: 'app-exercises',
    imports: [DatePipe, TranslocoPipe, AddExerciseModal, EditMuscleGroupModal, EditExerciseModal, ActionButtonsComponent, ConfirmationDialogComponent, ItemListComponent, ItemCardComponent],
    templateUrl: './exercises.html',
    styleUrl: './exercises.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExercisesComponent implements OnInit, OnDestroy {
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly muscleGroupService = inject(MuscleGroupService);
    private readonly exerciseService = inject(ExerciseService);
    protected readonly i18n = inject(I18nService);

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
    protected readonly showEditMuscleGroupModal = signal<boolean>(false);
    protected readonly showEditExerciseModal = signal<boolean>(false);
    protected readonly exerciseToEdit = signal<string>('');
    protected readonly exerciseToEditTitle = signal<string>('');
    protected readonly showClearAllConfirm = signal<boolean>(false);
    protected readonly isClearing = signal<boolean>(false);
    protected readonly showDeleteMuscleGroupConfirm = signal<boolean>(false);
    protected readonly isDeletingMuscleGroup = signal<boolean>(false);

    private backButtonListener?: any;

    async ngOnInit(): Promise<void> {
        const muscleGroupId = this.route.snapshot.paramMap.get('muscleGroupId');

        if (muscleGroupId) {
            this.muscleGroupId.set(muscleGroupId);
            await this.loadMuscleGroup();
        }

        // Handle hardware back button - navigate to muscle group page
        this.backButtonListener = await App.addListener('backButton', () => {
            this.navigateBack();
        });
    }

    ngOnDestroy(): void {
        // Remove back button listener
        this.backButtonListener?.remove();
    }

    private async loadMuscleGroup(): Promise<void> {
        this.isLoading.set(true);
        try {
            const muscleGroup = await this.muscleGroupService.getMuscleGroupById(this.muscleGroupId());
            if (muscleGroup) {
                this.exercises.set(muscleGroup.exercises);
                this.muscleGroupTitle.set(muscleGroup.title);
                this.muscleGroupDate.set(muscleGroup.date);
                this.workoutId.set(muscleGroup.workoutId);
            } else {
                // Muscle group not found, redirect to main page
                this.router.navigate(['/']);
            }
        } finally {
            this.isLoading.set(false);
        }
    }

    protected navigateBack(): void {
        this.router.navigate(['/muscle-group', this.workoutId()]);
    }

    protected navigateToLog(exerciseId: string): void {
        this.router.navigate(['/log', exerciseId]);
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
            await this.exerciseService.deleteExercise(exerciseId);
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

    protected openEditMuscleGroupModal(): void {
        this.showEditMuscleGroupModal.set(true);
    }

    protected closeEditMuscleGroupModal(): void {
        this.showEditMuscleGroupModal.set(false);
    }

    protected async onMuscleGroupUpdated(updatedMuscleGroup: MuscleGroup): Promise<void> {
        // Update the muscle group title and date
        this.muscleGroupTitle.set(updatedMuscleGroup.title);
        this.muscleGroupDate.set(updatedMuscleGroup.date);
    }

    protected openEditExerciseModal(exercise: Exercise): void {
        this.exerciseToEdit.set(exercise.id);
        this.exerciseToEditTitle.set(exercise.title);
        this.showEditExerciseModal.set(true);
    }

    protected closeEditExerciseModal(): void {
        this.showEditExerciseModal.set(false);
        this.exerciseToEdit.set('');
        this.exerciseToEditTitle.set('');
    }

    protected async onExerciseUpdated(updatedExercise: Exercise): Promise<void> {
        // Update the exercise in the list
        this.exercises.update(exercises =>
            exercises.map(ex => ex.id === updatedExercise.id ? updatedExercise : ex)
        );
    }

    protected confirmClearAll(): void {
        this.showClearAllConfirm.set(true);
    }

    protected closeClearAllConfirm(): void {
        this.showClearAllConfirm.set(false);
    }

    protected async clearAllExercises(): Promise<void> {
        this.isClearing.set(true);
        try {
            await this.exerciseService.clearAllExercises(this.muscleGroupId());
            this.exercises.set([]);
            this.closeClearAllConfirm();
        } catch (error) {
            console.error('Error clearing exercises:', error);
        } finally {
            this.isClearing.set(false);
        }
    }

    protected confirmDeleteMuscleGroup(): void {
        this.showDeleteMuscleGroupConfirm.set(true);
    }

    protected closeDeleteMuscleGroupConfirm(): void {
        this.showDeleteMuscleGroupConfirm.set(false);
    }

    protected async deleteMuscleGroup(): Promise<void> {
        const muscleGroupId = this.muscleGroupId();
        if (!muscleGroupId) {
            return;
        }

        this.isDeletingMuscleGroup.set(true);
        try {
            await this.muscleGroupService.deleteMuscleGroup(muscleGroupId);
            // Navigate back to the muscle group list after deletion
            this.router.navigate(['/muscle-group', this.workoutId()]);
        } catch (error) {
            console.error('Error deleting muscle group:', error);
        } finally {
            this.isDeletingMuscleGroup.set(false);
        }
    }
}
