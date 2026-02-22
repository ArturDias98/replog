import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'app-item-list',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'item-list' },
    template: '<ng-content />'
})
export class ItemListComponent {}
