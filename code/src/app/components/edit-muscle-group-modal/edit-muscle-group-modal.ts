import { ChangeDetectionStrategy, Component, inject, output, signal, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MuscleGroupService } from '../../services/muscle-group.service';
import { UpdateMuscleGroupModel, MuscleGroup } from '../../models/muscle-group';

@Component({
    selector: 'app-edit-muscle-group-modal',
    imports: [TranslocoPipe],
    templateUrl: './edit-muscle-group-modal.html',
    styleUrl: './edit-muscle-group-modal.css',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class EditMuscleGroupModal {
    private readonly muscleGroupService = inject(MuscleGroupService);

    muscleGroupId = input.required<string>();
    initialTitle = input.required<string>();
    initialDate = input.required<string>();

    protected readonly title = signal<string>('');
    protected readonly date = signal<string>('');
    protected readonly isSubmitting = signal<boolean>(false);
    protected readonly isClosing = signal<boolean>(false);

    muscleGroupUpdated = output<MuscleGroup>();
    closeModal = output<void>();

    ngOnInit(): void {
        this.title.set(this.initialTitle());
        this.date.set(this.initialDate());
    }

    protected isFormValid(): boolean {
        return !!(this.title() && this.date());
    }

    protected onSubmit(): void {
        if (!this.isFormValid()) {
            return;
        }

        this.isSubmitting.set(true);

        const model: UpdateMuscleGroupModel = {
            muscleGroupId: this.muscleGroupId(),
            title: this.title(),
            date: this.date()
        };

        this.muscleGroupService.updateMuscleGroup(model)
            .then((updatedMuscleGroup) => {
                this.muscleGroupUpdated.emit(updatedMuscleGroup);
                this.close();
            })
            .catch(error => {
                console.error('Failed to update muscle group:', error);
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
