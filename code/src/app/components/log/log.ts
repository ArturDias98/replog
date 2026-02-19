import { Component, signal, inject, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { ExerciseService } from '../../services/exercise.service';
import { MuscleGroupService } from '../../services/muscle-group.service';
import { LogService } from '../../services/log.service';
import { Log } from '../../models/log';
import { Exercise } from '../../models/exercise';
import { EditExerciseModal } from '../edit-exercise-modal/edit-exercise-modal';
import { AddLogModal } from './add-log-modal/add-log-modal';
import { EditLogModal } from './edit-log-modal/edit-log-modal';
import { ActionButtonsComponent } from '../action-buttons/action-buttons';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog';

type LogGroup = {
    date: string;
    logs: Log[];
};

@Component({
    selector: 'app-log',
    imports: [DatePipe, EditExerciseModal, AddLogModal, EditLogModal, ActionButtonsComponent, ConfirmationDialogComponent],
    templateUrl: './log.html',
    styleUrl: './log.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogComponent implements OnInit {
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly exerciseService = inject(ExerciseService);
    private readonly muscleGroupService = inject(MuscleGroupService);
    private readonly logService = inject(LogService);

    protected readonly logs = signal<Log[]>([]);
    protected readonly isLoading = signal<boolean>(false);
    protected readonly exerciseTitle = signal<string>('');
    protected readonly exerciseDate = signal<string>('');
    protected readonly exerciseId = signal<string>('');
    protected readonly muscleGroupId = signal<string>('');
    protected readonly showAddLogModal = signal<boolean>(false);
    protected readonly showDeleteConfirm = signal<boolean>(false);
    protected readonly logToDelete = signal<string>('');
    protected readonly isDeleting = signal<boolean>(false);
    protected readonly showEditLogModal = signal<boolean>(false);
    protected readonly logToEdit = signal<Log | null>(null);
    protected readonly showClearAllConfirm = signal<boolean>(false);
    protected readonly isClearing = signal<boolean>(false);
    protected readonly showEditExerciseModal = signal<boolean>(false);

    protected readonly groupedLogs = computed<LogGroup[]>(() => {
        const logs = this.logs();
        const groups = new Map<string, Log[]>();

        // Group logs by date (without time)
        logs.forEach(log => {
            // Handle logs without date property (legacy data)
            if (!log.date) {
                return;
            }

            const date = new Date(log.date);

            // Skip invalid dates
            if (isNaN(date.getTime())) {
                return;
            }

            const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

            if (!groups.has(dateKey)) {
                groups.set(dateKey, []);
            }
            groups.get(dateKey)!.push(log);
        });

        // Convert to array and sort by date (most recent first)
        return Array.from(groups.entries())
            .map(([date, logs]) => ({ date, logs }))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

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
            const exercise = await this.exerciseService.getExerciseById(this.exerciseId());
            if (exercise) {
                this.logs.set(exercise.log);
                this.exerciseTitle.set(exercise.title);
                this.muscleGroupId.set(exercise.muscleGroupId);

                // Load muscle group to get the date
                const muscleGroup = await this.muscleGroupService.getMuscleGroupById(exercise.muscleGroupId);
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

    protected async deleteLog(): Promise<void> {
        const logId = this.logToDelete();
        if (!logId) return;

        this.isDeleting.set(true);
        try {
            await this.logService.deleteLog(this.exerciseId(), logId);
            this.logs.update(logs => logs.filter(log => log.id !== logId));
            this.closeDeleteModal();
        } finally {
            this.isDeleting.set(false);
        }
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

    protected async clearAllLogs(): Promise<void> {
        this.isClearing.set(true);
        try {
            await this.logService.clearAllLogs(this.exerciseId());
            this.logs.set([]);
            this.closeClearAllModal();
        } finally {
            this.isClearing.set(false);
        }
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
