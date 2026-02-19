import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { WorkoutDataService } from '../../services/workout-data.service';
import { Log } from '../../models/log';
import { Exercise } from '../../models/exercise';
import { EditExerciseModal } from '../edit-exercise-modal/edit-exercise-modal';
import { AddLogModal } from './add-log-modal/add-log-modal';
import { EditLogModal } from './edit-log-modal/edit-log-modal';
import { DeleteLogModal } from './delete-log-modal/delete-log-modal';
import { ClearAllLogsModal } from './clear-all-logs-modal/clear-all-logs-modal';

@Component({
    selector: 'app-log',
    imports: [DatePipe, EditExerciseModal, AddLogModal, EditLogModal, DeleteLogModal, ClearAllLogsModal],
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
    protected readonly exerciseDate = signal<string>('');
    protected readonly exerciseId = signal<string>('');
    protected readonly muscleGroupId = signal<string>('');
    protected readonly showAddLogModal = signal<boolean>(false);
    protected readonly showDeleteConfirm = signal<boolean>(false);
    protected readonly logToDelete = signal<string>('');
    protected readonly showEditLogModal = signal<boolean>(false);
    protected readonly logToEdit = signal<Log | null>(null);
    protected readonly showClearAllConfirm = signal<boolean>(false);
    protected readonly showEditExerciseModal = signal<boolean>(false);

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

                // Load muscle group to get the date
                const muscleGroup = await this.workoutService.getMuscleGroupById(exercise.muscleGroupId);
                if (muscleGroup) {
                    this.exerciseDate.set(muscleGroup.date);
                }
            }
        } finally {
            this.isLoading.set(false);
        }
    }

    protected navigateBack(): void {
        this.router.navigate(['/exercises', this.muscleGroupId()]);
    }

    protected openAddLogModal(): void {
        this.showAddLogModal.set(true);
    }

    protected closeAddLogModal(): void {
        this.showAddLogModal.set(false);
    }

    protected onLogAdded(newLog: Log): void {
        this.logs.update(current => [...current, newLog]);
    }

    protected confirmDelete(logId: string): void {
        this.logToDelete.set(logId);
        this.showDeleteConfirm.set(true);
    }

    protected closeDeleteModal(): void {
        this.showDeleteConfirm.set(false);
        this.logToDelete.set('');
    }

    protected onLogDeleted(logId: string): void {
        this.logs.update(logs => logs.filter(log => log.id !== logId));
    }

    protected openEditLogModal(log: Log): void {
        this.logToEdit.set(log);
        this.showEditLogModal.set(true);
    }

    protected closeEditLogModal(): void {
        this.showEditLogModal.set(false);
        this.logToEdit.set(null);
    }

    protected onLogUpdated(updatedLog: Log): void {
        this.logs.update(logs =>
            logs.map(l => l.id === updatedLog.id ? updatedLog : l)
        );
    }

    protected confirmClearAll(): void {
        this.showClearAllConfirm.set(true);
    }

    protected closeClearAllModal(): void {
        this.showClearAllConfirm.set(false);
    }

    protected onLogsCleared(): void {
        this.logs.set([]);
    }

    protected openEditExerciseModal(): void {
        this.showEditExerciseModal.set(true);
    }

    protected closeEditExerciseModal(): void {
        this.showEditExerciseModal.set(false);
    }

    protected onExerciseUpdated(updatedExercise: Exercise): void {
        this.exerciseTitle.set(updatedExercise.title);
    }
}
