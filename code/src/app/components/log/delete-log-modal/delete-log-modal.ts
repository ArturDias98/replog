import { Component, signal, output, inject, input } from '@angular/core';
import { WorkoutDataService } from '../../../services/workout-data.service';

@Component({
    selector: 'app-delete-log-modal',
    templateUrl: './delete-log-modal.html',
    styleUrl: './delete-log-modal.css'
})
export class DeleteLogModal {
    private readonly workoutService = inject(WorkoutDataService);

    exerciseId = input.required<string>();
    logId = input.required<string>();

    protected readonly isDeleting = signal<boolean>(false);

    logDeleted = output<string>();
    closeModal = output<void>();

    protected close(): void {
        this.closeModal.emit();
    }

    protected async handleDelete(): Promise<void> {
        this.isDeleting.set(true);
        try {
            await this.workoutService.deleteLog(this.exerciseId(), this.logId());
            this.logDeleted.emit(this.logId());
            this.close();
        } finally {
            this.isDeleting.set(false);
        }
    }
}
