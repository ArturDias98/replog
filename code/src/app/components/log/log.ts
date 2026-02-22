import { Component, signal, inject, OnInit, OnDestroy, ChangeDetectionStrategy, computed, viewChild } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { App } from '@capacitor/app';
import { ExerciseService } from '../../services/exercise.service';
import { MuscleGroupService } from '../../services/muscle-group.service';
import { LogService } from '../../services/log.service';
import { I18nService } from '../../services/i18n.service';
import { Log } from '../../models/log';
import { Exercise } from '../../models/exercise';
import { EditExerciseModal } from '../exercises/edit-exercise-modal/edit-exercise-modal';
import { AddLogModal } from './add-log-modal/add-log-modal';
import { EditLogModal } from './edit-log-modal/edit-log-modal';
import { ActionButtonsComponent } from '../shared/action-buttons/action-buttons';
import { ConfirmationDialogComponent } from '../shared/confirmation-dialog/confirmation-dialog';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

type LogGroup = {
    date: string;
    logs: Log[];
};

type VirtualScrollItem =
    | { type: 'header'; date: string }
    | { type: 'log'; log: Log }
    | { type: 'spacer' };

@Component({
    selector: 'app-log',
    imports: [DatePipe, DecimalPipe, TranslocoPipe, EditExerciseModal, AddLogModal, EditLogModal, ActionButtonsComponent, ConfirmationDialogComponent, ScrollingModule],
    templateUrl: './log.html',
    styleUrl: './log.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogComponent implements OnInit, OnDestroy {
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly exerciseService = inject(ExerciseService);
    private readonly muscleGroupService = inject(MuscleGroupService);
    private readonly logService = inject(LogService);
    protected readonly i18n = inject(I18nService);

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
    protected readonly showDeleteExerciseConfirm = signal<boolean>(false);
    protected readonly isDeletingExercise = signal<boolean>(false);
    protected readonly showScrollToTop = signal<boolean>(false);

    protected readonly viewport = viewChild<CdkVirtualScrollViewport>('viewport');

    private backButtonListener?: any;

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

    protected readonly virtualScrollItems = computed<VirtualScrollItem[]>(() => {
        const groups = this.groupedLogs();
        const items: VirtualScrollItem[] = [];

        // Flatten the grouped structure for virtual scrolling
        groups.forEach(group => {
            // Add date header
            items.push({ type: 'header', date: group.date });

            // Add all logs for this date
            group.logs.forEach(log => {
                items.push({ type: 'log', log });
            });
        });

        // Add spacer at the end for action buttons clearance
        if (items.length > 0) {
            items.push({ type: 'spacer' });
        }

        return items;
    });

    async ngOnInit(): Promise<void> {
        const exerciseId = this.route.snapshot.paramMap.get('exerciseId');

        if (exerciseId) {
            this.exerciseId.set(exerciseId);
            await this.loadExercise();
        }

        // Handle hardware back button - navigate to exercises page
        this.backButtonListener = await App.addListener('backButton', () => {
            this.navigateBack();
        });
    }

    ngOnDestroy(): void {
        // Remove back button listener
        this.backButtonListener?.remove();
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
            } else {
                // Exercise not found, redirect to main page
                this.router.navigate(['/']);
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

    protected confirmDeleteExercise(): void {
        this.showDeleteExerciseConfirm.set(true);
    }

    protected closeDeleteExerciseConfirm(): void {
        this.showDeleteExerciseConfirm.set(false);
    }

    protected async deleteExercise(): Promise<void> {
        const exerciseId = this.exerciseId();
        if (!exerciseId) {
            return;
        }

        this.isDeletingExercise.set(true);
        try {
            await this.exerciseService.deleteExercise(exerciseId);
            // Navigate back to the exercises list after deletion
            this.router.navigate(['/exercises', this.muscleGroupId()]);
        } catch (error) {
            console.error('Error deleting exercise:', error);
        } finally {
            this.isDeletingExercise.set(false);
        }
    }

    protected onScroll(): void {
        const vp = this.viewport();
        if (vp) {
            const offset = vp.measureScrollOffset('top');
            this.showScrollToTop.set(offset > 300);
        }
    }

    protected scrollToTop(): void {
        const vp = this.viewport();
        if (vp) {
            vp.scrollToIndex(0, 'smooth');
        }
    }
}
