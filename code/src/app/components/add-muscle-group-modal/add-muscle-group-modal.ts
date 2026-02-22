import { ChangeDetectionStrategy, Component, computed, inject, output, signal, input } from '@angular/core';
import { TranslocoService, TranslocoPipe } from '@jsverse/transloco';
import { MuscleGroupService } from '../../services/muscle-group.service';
import { CreateMuscleGroupModel, CreateExerciseModel, MuscleGroup } from '../../models/muscle-group';

@Component({
    selector: 'app-add-muscle-group-modal',
    imports: [TranslocoPipe],
    templateUrl: './add-muscle-group-modal.html',
    styleUrl: './add-muscle-group-modal.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddMuscleGroupModal {
    private readonly muscleGroupService = inject(MuscleGroupService);
    private readonly translocoService = inject(TranslocoService);

    protected readonly queueLabel = computed(() => {
        const count = this.pendingMuscleGroups().length;
        return this.translocoService.translate(
            count === 1 ? 'addMuscleGroup.queueReadyToSaveSingular' : 'addMuscleGroup.queueReadyToSavePlural'
        );
    });

    workoutId = input.required<string>();

    protected readonly title = signal<string>('');
    protected readonly date = signal<string>(this.getTodayDate());
    protected readonly exercises = signal<CreateExerciseModel[]>([]);
    protected readonly isSubmitting = signal<boolean>(false);
    protected readonly isClosing = signal<boolean>(false);
    protected readonly pendingMuscleGroups = signal<CreateMuscleGroupModel[]>([]);
    protected readonly editingIndex = signal<number | null>(null);

    muscleGroupAdded = output<MuscleGroup>();
    closeModal = output<void>();

    private getTodayDate(): string {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    protected addExercise(): void {
        this.exercises.update(items => [...items, { title: '' }]);
    }

    protected removeExercise(index: number): void {
        this.exercises.update(items => items.filter((_, i) => i !== index));
    }

    protected updateExerciseTitle(index: number, title: string): void {
        this.exercises.update(items => {
            const newItems = [...items];
            newItems[index] = { title };
            return newItems;
        });
    }

    protected isFormValid(): boolean {
        const hasTitle = !!this.title();
        const hasDate = !!this.date();

        // If there are exercises, all must have titles
        const exercisesValid = this.exercises().length === 0 ||
            this.exercises().every(item => item.title.trim());

        return hasTitle && hasDate && exercisesValid;
    }

    protected canAddMoreItems(): boolean {
        // Can add more items only if all existing items have titles
        return this.exercises().length === 0 ||
            this.exercises().every(item => item.title.trim());
    }

    protected canSave(): boolean {
        // Can save if current form is valid OR there are pending muscle groups
        return this.isFormValid() || this.pendingMuscleGroups().length > 0;
    }

    protected removePendingMuscleGroup(index: number): void {
        this.pendingMuscleGroups.update(items => items.filter((_, i) => i !== index));
    }

    protected editPendingMuscleGroup(index: number): void {
        const pendingGroups = this.pendingMuscleGroups();
        const groupToEdit = pendingGroups[index];

        // Load the data into the form
        this.title.set(groupToEdit.title);
        this.date.set(groupToEdit.date);
        this.exercises.set([...groupToEdit.exercises]);

        // Track that we're editing this item
        this.editingIndex.set(index);
    }

    protected cancelEdit(): void {
        this.title.set('');
        this.date.set(this.getTodayDate());
        this.exercises.set([]);
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

        const model: CreateMuscleGroupModel = {
            title: this.title(),
            date: this.date(),
            workoutId: this.workoutId(),
            exercises: this.exercises().filter(item => item.title.trim())
        };

        const currentEditingIndex = this.editingIndex();

        if (currentEditingIndex !== null) {
            // Update existing item
            this.pendingMuscleGroups.update(items => {
                const newItems = [...items];
                newItems[currentEditingIndex] = model;
                return newItems;
            });
            this.editingIndex.set(null);
        } else {
            // Add new item
            this.pendingMuscleGroups.update(items => [...items, model]);
        }

        // Reset the form for the next entry
        this.title.set('');
        this.date.set(this.getTodayDate());
        this.exercises.set([]);
    }

    protected onSubmit(): void {
        if (!this.canSave()) {
            return;
        }

        this.isSubmitting.set(true);

        // Start with pending muscle groups
        const allMuscleGroups = [...this.pendingMuscleGroups()];

        // Only add current form if it's valid
        if (this.isFormValid()) {
            const model: CreateMuscleGroupModel = {
                title: this.title(),
                date: this.date(),
                workoutId: this.workoutId(),
                exercises: this.exercises().filter(item => item.title.trim())
            };
            allMuscleGroups.push(model);
        }

        this.muscleGroupService.addMuscleGroups(allMuscleGroups)
            .then((newMuscleGroups) => {
                // Emit all newly created muscle groups
                newMuscleGroups.forEach(mg => this.muscleGroupAdded.emit(mg));
                this.close();
            })
            .catch(error => {
                console.error('Failed to add muscle groups:', error);
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
            this.exercises.set([]);
            this.pendingMuscleGroups.set([]);
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
