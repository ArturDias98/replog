import { Component, signal, output, inject, input } from '@angular/core';
import { LogService } from '../../../services/log.service';
import { UpdateLogModel, Log } from '../../../models/log';

@Component({
    selector: 'app-edit-log-modal',
    templateUrl: './edit-log-modal.html',
    styleUrl: './edit-log-modal.css'
})
export class EditLogModal {
    private readonly logService = inject(LogService);

    exerciseId = input.required<string>();
    log = input.required<Log>();

    protected readonly editReps = signal<string>('');
    protected readonly editWeight = signal<string>('');
    protected readonly editError = signal<string>('');
    protected readonly isEditing = signal<boolean>(false);

    logUpdated = output<Log>();
    closeModal = output<void>();

    ngOnInit(): void {
        const logData = this.log();
        this.editReps.set(logData.numberReps.toString());
        this.editWeight.set(logData.maxWeight.toString());
    }

    protected close(): void {
        this.editReps.set('');
        this.editWeight.set('');
        this.editError.set('');
        this.closeModal.emit();
    }

    protected async handleEditLog(): Promise<void> {
        const logData = this.log();
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
            const model: UpdateLogModel = {
                exerciseId: this.exerciseId(),
                logId: logData.id,
                numberReps: reps,
                maxWeight: weight
            };
            await this.logService.updateLog(model);
            const updatedLog: Log = { ...logData, numberReps: reps, maxWeight: weight };
            this.logUpdated.emit(updatedLog);
            this.close();
        } catch (error) {
            this.editError.set('Failed to update log. Please try again.');
        } finally {
            this.isEditing.set(false);
        }
    }
}
