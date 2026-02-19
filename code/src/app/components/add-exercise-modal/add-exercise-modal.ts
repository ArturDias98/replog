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
    protected readonly pendingExercises = signal<string[]>([]);
    protected readonly editingIndex = signal<number | null>(null);

    exerciseAdded = output<Exercise>();
    closeModal = output<void>();

    protected isFormValid(): boolean {
        return !!this.title().trim();
    }

    protected canSave(): boolean {
        return this.isFormValid() || this.pendingExercises().length > 0;
    }

    protected removePendingExercise(index: number): void {
        this.pendingExercises.update(items => items.filter((_, i) => i !== index));
    }

    protected editPendingExercise(index: number): void {
        const pendingExercises = this.pendingExercises();
        const exerciseToEdit = pendingExercises[index];

        // Load the data into the form
        this.title.set(exerciseToEdit);

        // Track that we're editing this item
        this.editingIndex.set(index);
    }

    protected cancelEdit(): void {
        this.title.set('');
        this.editingIndex.set(null);
    }

    protected onFormKeyDown(event: KeyboardEvent): void {
        // If Enter is pressed and Ctrl/Shift are not held, treat it as "Next"
        if (event.key === 'Enter' && !event.ctrlKey && !event.shiftKey) {
            if (this.isFormValid()) {
                event.preventDefault();
                this.addToQueue();
            } else {
                // Prevent form submission if form is invalid
                event.preventDefault();
            }
        }
    }

    protected addToQueue(): void {
        if (!this.isFormValid()) {
            return;
        }

        const exerciseTitle = this.title().trim();
        const currentEditingIndex = this.editingIndex();

        if (currentEditingIndex !== null) {
            // Update existing item
            this.pendingExercises.update(items => {
                const newItems = [...items];
                newItems[currentEditingIndex] = exerciseTitle;
                return newItems;
            });
            this.editingIndex.set(null);
        } else {
            // Add new item
            this.pendingExercises.update(items => [...items, exerciseTitle]);
        }

        // Reset the form for the next entry
        this.title.set('');
    }

    protected onSubmit(): void {
        if (!this.canSave()) {
            return;
        }

        this.isSubmitting.set(true);

        // Start with pending exercises
        const allExercises = [...this.pendingExercises()];

        // Only add current form if it's valid
        if (this.isFormValid()) {
            allExercises.push(this.title().trim());
        }

        this.exerciseService.addExercises(this.muscleGroupId(), allExercises)
            .then((newExercises) => {
                // Emit all newly created exercises
                newExercises.forEach(ex => this.exerciseAdded.emit(ex));
                this.close();
            })
            .catch(error => {
                console.error('Failed to add exercises:', error);
            })
            .finally(() => {
                this.isSubmitting.set(false);
            });
    }

    protected close(): void {
        this.isClosing.set(true);
        setTimeout(() => {
            this.title.set('');
            this.pendingExercises.set([]);
            this.editingIndex.set(null);
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
