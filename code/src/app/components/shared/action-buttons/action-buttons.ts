import {
    Component,
    ChangeDetectionStrategy,
    output,
    input,
} from '@angular/core';

@Component({
    selector: 'app-action-buttons',
    templateUrl: './action-buttons.html',
    styleUrl: './action-buttons.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionButtonsComponent {
    // Inputs
    showClearAll = input<boolean>(false);
    clearAllLabel = input<string>('Clear All');
    addLabel = input<string>('Add');
    clearAllAriaLabel = input<string>('Clear all items');
    addAriaLabel = input<string>('Add item');

    // Outputs
    clearAllClick = output<void>();
    addClick = output<void>();

    onClearAllClick(): void {
        this.clearAllClick.emit();
    }

    onAddClick(): void {
        this.addClick.emit();
    }
}
