import { Component, inject, output, signal, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkoutDataService } from '../../services/workout-data.service';
import { CreateMuscleGroupModel, CreateMuscleItemModel, MuscleGroup } from '../../models/muscle-group';

@Component({
    selector: 'app-add-muscle-group-modal',
    imports: [FormsModule],
    templateUrl: './add-muscle-group-modal.html',
    styleUrl: './add-muscle-group-modal.css'
})
export class AddMuscleGroupModal {
    private readonly workoutService = inject(WorkoutDataService);

    workoutId = input.required<string>();

    protected readonly title = signal<string>('');
    protected readonly date = signal<string>(this.getTodayDate());
    protected readonly muscleItems = signal<CreateMuscleItemModel[]>([]);
    protected readonly isSubmitting = signal<boolean>(false);
    protected readonly isClosing = signal<boolean>(false);

    muscleGroupAdded = output<MuscleGroup>();
    closeModal = output<void>();

    private getTodayDate(): string {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    protected addMuscleItem(): void {
        this.muscleItems.update(items => [...items, { title: '' }]);
    }

    protected removeMuscleItem(index: number): void {
        this.muscleItems.update(items => items.filter((_, i) => i !== index));
    }

    protected updateMuscleItemTitle(index: number, title: string): void {
        this.muscleItems.update(items => {
            const newItems = [...items];
            newItems[index] = { title };
            return newItems;
        });
    }

    protected isFormValid(): boolean {
        const hasTitle = !!this.title();
        const hasDate = !!this.date();

        // If there are muscle items, all must have titles
        const muscleItemsValid = this.muscleItems().length === 0 ||
            this.muscleItems().every(item => item.title.trim());

        return hasTitle && hasDate && muscleItemsValid;
    }

    protected canAddMoreItems(): boolean {
        // Can add more items only if all existing items have titles
        return this.muscleItems().length === 0 ||
            this.muscleItems().every(item => item.title.trim());
    }

    protected onSubmit(): void {
        if (!this.isFormValid()) {
            return;
        }

        this.isSubmitting.set(true);

        const model: CreateMuscleGroupModel = {
            title: this.title(),
            date: this.date(),
            workoutId: this.workoutId(),
            muscleItems: this.muscleItems().filter(item => item.title.trim())
        };

        this.workoutService.addMuscleGroup(model)
            .then((newMuscleGroup) => {
                this.muscleGroupAdded.emit(newMuscleGroup);
                this.close();
            })
            .catch(error => {
                console.error('Failed to add muscle group:', error);
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
            this.muscleItems.set([]);
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
