import { Component, signal, output, inject, input } from '@angular/core';
import { WorkoutDataService } from '../../../services/workout-data.service';
import { AddLogModel } from '../../../models/log';
import { Log } from '../../../models/log';

@Component({
    selector: 'app-add-log-modal',
    templateUrl: './add-log-modal.html',
    styleUrl: './add-log-modal.css'
})
export class AddLogModal {
    private readonly workoutService = inject(WorkoutDataService);

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
            const now = new Date();
            const model: AddLogModel = {
                exerciseId: this.exerciseId(),
                numberReps: reps,
                maxWeight: weight,
                date: now
            };
            await this.workoutService.addLog(model);
            const newLog: Log = {
                id: crypto.randomUUID(),
                numberReps: reps,
                maxWeight: weight,
                date: now
            };
            this.logAdded.emit(newLog);
            this.close();
        } catch (error) {
            this.addError.set('Failed to add log. Please try again.');
        } finally {
            this.isAdding.set(false);
        }
    }
}
