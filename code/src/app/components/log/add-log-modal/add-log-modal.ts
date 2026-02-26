import { Component, signal, output, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { TranslocoService, TranslocoPipe } from '@jsverse/transloco';
import { LogService } from '../../../services/log.service';
import { AddLogModel } from '../../../models/log';
import { Log } from '../../../models/log';

@Component({
    selector: 'app-add-log-modal',
    imports: [TranslocoPipe],
    templateUrl: './add-log-modal.html',
    styleUrl: './add-log-modal.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddLogModal {
    private readonly logService = inject(LogService);
    private readonly translocoService = inject(TranslocoService);

    exerciseId = input.required<string>();

    protected readonly newReps = signal<string>('');
    protected readonly newWeight = signal<string>('');
    protected readonly addError = signal<string>('');
    protected readonly isAdding = signal<boolean>(false);

    logAdded = output<Log>();
    closeModal = output<void>();

    protected close(): void {
        this.newReps.set('');
        this.newWeight.set('');
        this.addError.set('');
        this.closeModal.emit();
    }

    protected async handleAddLog(): Promise<void> {
        const reps = parseInt(this.newReps());
        const weight = parseFloat(this.newWeight().replace(',', '.'));

        if (!this.newReps() || isNaN(reps) || reps <= 0) {
            this.addError.set(this.translocoService.translate('addLog.errorReps'));
            return;
        }

        if (!this.newWeight() || isNaN(weight) || weight < 0) {
            this.addError.set(this.translocoService.translate('addLog.errorWeight'));
            return;
        }

        this.isAdding.set(true);
        try {
            const now = new Date();
            const model: AddLogModel = {
                exerciseId: this.exerciseId(),
                numberReps: reps,
                maxWeight: weight,
                date: now
            };
            const id = await this.logService.addLog(model);
            const newLog: Log = {
                id,
                numberReps: reps,
                maxWeight: weight,
                date: now
            };
            this.logAdded.emit(newLog);
            this.close();
        } catch (error) {
            this.addError.set(this.translocoService.translate('addLog.errorFailed'));
        } finally {
            this.isAdding.set(false);
        }
    }
}
