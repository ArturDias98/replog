import { Component, inject, output, signal, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExerciseService } from '../../services/exercise.service';
import { Exercise } from '../../models/exercise';

@Component({
    selector: 'app-add-exercise-modal',
    imports: [FormsModule],
    templateUrl: './add-exercise-modal.html',
    styleUrl: './add-exercise-modal.css'
})
export class AddExerciseModal {
    private readonly exerciseService = inject(ExerciseService);

    muscleGroupId = input.required<string>();

    protected readonly title = signal<string>('');
    protected readonly isSubmitting = signal<boolean>(false);
    protected readonly isClosing = signal<boolean>(false);

    exerciseAdded = output<Exercise>();
    closeModal = output<void>();

    protected onSubmit(): void {
        if (!this.title()) {
            return;
        }

        this.isSubmitting.set(true);

        this.exerciseService.addExercise(this.muscleGroupId(), this.title())
            .then((newExercise) => {
                this.exerciseAdded.emit(newExercise);
                this.close();
            })
            .catch(error => {
                console.error('Failed to add exercise:', error);
            })
            .finally(() => {
                this.isSubmitting.set(false);
            });
    }

    protected close(): void {
        this.isClosing.set(true);
        setTimeout(() => {
            this.title.set('');
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
