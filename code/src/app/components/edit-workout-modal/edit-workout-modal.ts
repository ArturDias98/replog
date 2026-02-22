import { ChangeDetectionStrategy, Component, inject, output, signal, input, effect } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { WorkoutDataService } from '../../services/workout-data.service';
import { UpdateWorkoutModel } from '../../models/workout';

@Component({
    selector: 'app-edit-workout-modal',
    imports: [TranslocoPipe],
    templateUrl: './edit-workout-modal.html',
    styleUrl: './edit-workout-modal.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditWorkoutModal {
    private readonly workoutService = inject(WorkoutDataService);

    workoutId = input.required<string>();
    initialTitle = input.required<string>();
    initialDate = input.required<string>();

    protected readonly title = signal<string>('');
    protected readonly date = signal<string>('');
    protected readonly isSubmitting = signal<boolean>(false);
    protected readonly isClosing = signal<boolean>(false);

    workoutUpdated = output<{ title: string; date: string }>();
    closeModal = output<void>();

    constructor() {
        // Initialize signals with input values when inputs change
        effect(() => {
            this.title.set(this.initialTitle());
            this.date.set(this.initialDate());
        });
    }

    protected onSubmit(): void {
        if (!this.title() || !this.date()) {
            return;
        }

        this.isSubmitting.set(true);

        const model: UpdateWorkoutModel = {
            id: this.workoutId(),
            title: this.title(),
            date: this.date()
        };

        this.workoutService.updateWorkout(model)
            .then(() => {
                this.workoutUpdated.emit({ title: this.title(), date: this.date() });
                this.close();
            })
            .catch(error => {
                console.error('Failed to update workout:', error);
            })
            .finally(() => {
                this.isSubmitting.set(false);
            });
    }

    protected close(): void {
        this.isClosing.set(true);
        setTimeout(() => {
            this.isClosing.set(false);
            this.closeModal.emit();
        }, 200);
    }

    protected onBackdropClick(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.close();
        }
    }
}
