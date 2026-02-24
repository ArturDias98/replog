import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CdkDropList } from '@angular/cdk/drag-drop';

@Component({
    selector: 'app-item-list',
    changeDetection: ChangeDetectionStrategy.OnPush,
    hostDirectives: [{
        directive: CdkDropList,
        outputs: ['cdkDropListDropped: itemDropped']
    }],
    host: { class: 'item-list' },
    template: '<ng-content />',
    styles: `
        :host {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
    `
})
export class ItemListComponent {
    constructor() {
        inject(CdkDropList).lockAxis = 'y';
    }
}
