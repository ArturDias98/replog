import { Component, signal, output, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { TranslocoService, TranslocoPipe } from '@jsverse/transloco';
import { LogService } from '../../../services/log.service';
import { UpdateLogModel, Log } from '../../../models/log';

@Component({
    selector: 'app-edit-log-modal',
    imports: [TranslocoPipe],
    templateUrl: './edit-log-modal.html',
    styleUrl: './edit-log-modal.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditLogModal {
    private readonly logService = inject(LogService);
    private readonly translocoService = inject(TranslocoService);

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
        const weight = parseFloat(this.editWeight().replace(',', '.'));

        if (!this.editReps() || isNaN(reps) || reps <= 0) {
            this.editError.set(this.translocoService.translate('editLog.errorReps'));
            return;
        }

        if (!this.editWeight() || isNaN(weight) || weight < 0) {
            this.editError.set(this.translocoService.translate('editLog.errorWeight'));
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
            this.editError.set(this.translocoService.translate('editLog.errorFailed'));
        } finally {
            this.isEditing.set(false);
        }
    }
}
