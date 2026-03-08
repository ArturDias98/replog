import { ChangeDetectionStrategy, Component, inject, output, signal, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ExerciseUseCase } from '@replog/application';
import { Exercise } from '@replog/shared';

@Component({
    selector: 'app-edit-exercise-modal',
    imports: [TranslocoPipe],
    templateUrl: './edit-exercise-modal.html',
    styleUrl: './edit-exercise-modal.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditExerciseModal {
    private readonly exerciseUseCase = inject(ExerciseUseCase);

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

        this.exerciseUseCase.updateExercise(this.exerciseId(), this.title())
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
