import { Component, inject, output, signal, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ExerciseService } from '../../services/exercise.service';
import { Exercise } from '../../models/exercise';

@Component({
    selector: 'app-edit-exercise-modal',
    imports: [FormsModule],
    templateUrl: './edit-exercise-modal.html',
    styleUrl: './edit-exercise-modal.css'
})
export class EditExerciseModal {
    private readonly exerciseService = inject(ExerciseService);

    exerciseId = input.required<string>();
    initialTitle = input.required<string>();

    protected readonly title = signal<string>('');
    protected readonly isSubmitting = signal<boolean>(false);
    protected readonly isClosing = signal<boolean>(false);

    exerciseUpdated = output<Exercise>();
    closeModal = output<void>();

    ngOnInit(): void {
        this.title.set(this.initialTitle());
    }

    protected isFormValid(): boolean {
        return !!this.title();
    }

    protected onSubmit(): void {
        if (!this.isFormValid()) {
            return;
        }

        this.isSubmitting.set(true);

        this.exerciseService.updateExercise(this.exerciseId(), this.title())
            .then((updatedExercise) => {
                this.exerciseUpdated.emit(updatedExercise);
                this.close();
            })
            .catch(error => {
                console.error('Failed to update exercise:', error);
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
