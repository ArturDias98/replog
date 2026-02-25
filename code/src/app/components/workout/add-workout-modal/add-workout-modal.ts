import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { WorkoutDataService } from '../../../services/workout-data.service';
import { AuthService } from '../../../services/auth.service';
import { CreateWorkoutModel } from '../../../models/workout';

@Component({
    selector: 'app-add-workout-modal',
    imports: [TranslocoPipe],
    templateUrl: './add-workout-modal.html',
    styleUrl: './add-workout-modal.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddWorkoutModal {
    private readonly workoutService = inject(WorkoutDataService);
    private readonly authService = inject(AuthService);

    protected readonly title = signal<string>('');
    protected readonly date = signal<string>(this.getTodayDate());
    protected readonly isSubmitting = signal<boolean>(false);
    protected readonly isClosing = signal<boolean>(false);

    workoutAdded = output<string>();
    closeModal = output<void>();

    private getTodayDate(): string {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    protected onSubmit(): void {
        if (!this.title() || !this.date()) {
            return;
        }

        this.isSubmitting.set(true);

        const model: CreateWorkoutModel = {
            title: this.title(),
            date: this.date(),
            userId: this.authService.getUser()?.id ?? 'temp-user-' + crypto.randomUUID()
        };

        this.workoutService.addWorkout(model)
            .then((newWorkout) => {
                this.workoutAdded.emit(newWorkout.id);
                this.close();
            })
            .catch(error => {
                console.error('Failed to add workout:', error);
            })
            .finally(() => {
                this.isSubmitting.set(false);
            });
    }

    protected close(): void {
        this.isClosing.set(true);
        setTimeout(() => {
            this.title.set('');
            this.date.set(this.getTodayDate());
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
