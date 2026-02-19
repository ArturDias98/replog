import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { WorkoutDataService } from '../../services/workout-data.service';
import { Log } from '../../models/log';

@Component({
    selector: 'app-log',
    imports: [],
    templateUrl: './log.html',
    styleUrl: './log.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogComponent implements OnInit {
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly workoutService = inject(WorkoutDataService);

    protected readonly logs = signal<Log[]>([]);
    protected readonly isLoading = signal<boolean>(false);
    protected readonly exerciseTitle = signal<string>('');
    protected readonly exerciseId = signal<string>('');
    protected readonly muscleGroupId = signal<string>('');
    protected readonly showAddLogModal = signal<boolean>(false);
    protected readonly showDeleteConfirm = signal<boolean>(false);
    protected readonly isDeleting = signal<boolean>(false);
    protected readonly logToDelete = signal<string>('');
    protected readonly showEditLogModal = signal<boolean>(false);
    protected readonly logToEdit = signal<Log | null>(null);
    protected readonly showClearAllConfirm = signal<boolean>(false);
    protected readonly isClearing = signal<boolean>(false);
    protected readonly newReps = signal<string>('');
    protected readonly newWeight = signal<string>('');
    protected readonly editReps = signal<string>('');
    protected readonly editWeight = signal<string>('');
    protected readonly addError = signal<string>('');
    protected readonly editError = signal<string>('');
    protected readonly isAdding = signal<boolean>(false);
    protected readonly isEditing = signal<boolean>(false);

    async ngOnInit(): Promise<void> {
        const exerciseId = this.route.snapshot.paramMap.get('exerciseId');

        if (exerciseId) {
            this.exerciseId.set(exerciseId);
            await this.loadExercise();
        }
    }

    private async loadExercise(): Promise<void> {
        this.isLoading.set(true);
        try {
            const exercise = await this.workoutService.getExerciseById(this.exerciseId());
            if (exercise) {
                this.logs.set(exercise.log);
                this.exerciseTitle.set(exercise.title);
                this.muscleGroupId.set(exercise.muscleGroupId);
            }
        } finally {
            this.isLoading.set(false);
        }
    }

    protected navigateBack(): void {
        this.router.navigate(['/exercises', this.muscleGroupId()]);
    }

    protected openAddLogModal(): void {
        this.newReps.set('');
        this.newWeight.set('');
        this.addError.set('');
        this.showAddLogModal.set(true);
    }

    protected closeAddLogModal(): void {
        this.showAddLogModal.set(false);
        this.newReps.set('');
        this.newWeight.set('');
        this.addError.set('');
    }

    protected async handleAddLog(): Promise<void> {
        const reps = parseInt(this.newReps());
        const weight = parseFloat(this.newWeight());

        if (!this.newReps() || isNaN(reps) || reps <= 0) {
            this.addError.set('Please enter a valid number of reps');
            return;
        }

        if (!this.newWeight() || isNaN(weight) || weight < 0) {
            this.addError.set('Please enter a valid weight');
            return;
        }

        this.isAdding.set(true);
        try {
            await this.workoutService.addLog(this.exerciseId(), reps, weight);
            // Add the new log to the local state
            const newLog: Log = {
                id: crypto.randomUUID(),
                numberReps: reps,
                maxWeight: weight
            };
            this.logs.update(current => [...current, newLog]);
            this.closeAddLogModal();
        } catch (error) {
            this.addError.set('Failed to add log. Please try again.');
        } finally {
            this.isAdding.set(false);
        }
    }

    protected confirmDelete(logId: string): void {
        this.logToDelete.set(logId);
        this.showDeleteConfirm.set(true);
    }

    protected cancelDelete(): void {
        this.showDeleteConfirm.set(false);
        this.logToDelete.set('');
    }

    protected async handleDelete(): Promise<void> {
        this.isDeleting.set(true);
        try {
            await this.workoutService.deleteLog(this.exerciseId(), this.logToDelete());
            await this.loadExercise();
            this.showDeleteConfirm.set(false);
            this.logToDelete.set('');
        } finally {
            this.isDeleting.set(false);
        }
    }

    protected openEditLogModal(log: Log): void {
        this.logToEdit.set(log);
        this.editReps.set(log.numberReps.toString());
        this.editWeight.set(log.maxWeight.toString());
        this.editError.set('');
        this.showEditLogModal.set(true);
    }

    protected closeEditLogModal(): void {
        this.showEditLogModal.set(false);
        this.logToEdit.set(null);
        this.editReps.set('');
        this.editWeight.set('');
        this.editError.set('');
    }

    protected async handleEditLog(): Promise<void> {
        const log = this.logToEdit();
        if (!log) return;

        const reps = parseInt(this.editReps());
        const weight = parseFloat(this.editWeight());

        if (!this.editReps() || isNaN(reps) || reps <= 0) {
            this.editError.set('Please enter a valid number of reps');
            return;
        }

        if (!this.editWeight() || isNaN(weight) || weight < 0) {
            this.editError.set('Please enter a valid weight');
            return;
        }

        this.isEditing.set(true);
        try {
            await this.workoutService.updateLog(this.exerciseId(), log.id, reps, weight);
            // Update the log in the local state
            this.logs.update(logs =>
                logs.map(l => l.id === log.id ? { ...l, numberReps: reps, maxWeight: weight } : l)
            );
            this.closeEditLogModal();
        } catch (error) {
            this.editError.set('Failed to update log. Please try again.');
        } finally {
            this.isEditing.set(false);
        }
    }

    protected confirmClearAll(): void {
        this.showClearAllConfirm.set(true);
    }

    protected cancelClearAll(): void {
        this.showClearAllConfirm.set(false);
    }

    protected async handleClearAll(): Promise<void> {
        this.isClearing.set(true);
        try {
            await this.workoutService.clearAllLogs(this.exerciseId());
            await this.loadExercise();
            this.showClearAllConfirm.set(false);
        } finally {
            this.isClearing.set(false);
        }
    }
}
