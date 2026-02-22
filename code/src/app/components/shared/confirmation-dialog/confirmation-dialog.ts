import {
    Component,
    ChangeDetectionStrategy,
    output,
    input,
} from '@angular/core';

@Component({
    selector: 'app-confirmation-dialog',
    templateUrl: './confirmation-dialog.html',
    styleUrl: './confirmation-dialog.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmationDialogComponent {
    // Inputs
    title = input.required<string>();
    message = input.required<string>();
    confirmText = input<string>('Confirm');
    cancelText = input<string>('Cancel');
    isProcessing = input<boolean>(false);
    processingText = input<string>('Processing...');
    isDangerous = input<boolean>(true);

    // Outputs
    confirm = output<void>();
    cancel = output<void>();

    onConfirm(): void {
        this.confirm.emit();
    }

    onCancel(): void {
        this.cancel.emit();
    }

    onBackdropClick(): void {
        this.cancel.emit();
    }
}
