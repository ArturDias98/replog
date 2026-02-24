import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, output, signal } from '@angular/core';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { TranslocoPipe } from '@jsverse/transloco';

const SWIPE_THRESHOLD = 80;
const SWIPE_DEAD_ZONE = 10;

@Component({
    selector: 'app-item-card',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [CdkDragHandle, TranslocoPipe],
    host: {
        class: 'item-card',
        role: 'listitem',
        tabindex: '0',
        '[class.is-swiping]': 'isSwiping()',
        '(keydown.enter)': 'itemClick.emit()',
        '(keydown.delete)': 'itemDelete.emit()',
        '(pointerdown)': 'onPointerDown($event)',
        '(pointermove)': 'onPointerMove($event)',
        '(pointerup)': 'onPointerUp($event)',
        '(pointercancel)': 'onPointerCancel()',
        '(click)': 'onHostClick()',
    },
    styleUrl: './item-card.css',
    template: `
        <button class="drag-handle"
                cdkDragHandle
                type="button"
                [attr.aria-label]="'common.reorder' | transloco"
                aria-roledescription="drag handle"
                (keydown.arrowUp)="moveUp.emit(); $event.preventDefault()"
                (keydown.arrowDown)="moveDown.emit(); $event.preventDefault()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="9" cy="6" r="1.5"/>
                <circle cx="15" cy="6" r="1.5"/>
                <circle cx="9" cy="12" r="1.5"/>
                <circle cx="15" cy="12" r="1.5"/>
                <circle cx="9" cy="18" r="1.5"/>
                <circle cx="15" cy="18" r="1.5"/>
            </svg>
        </button>
        <div class="delete-hint" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M9 3v1H4v2h1v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6h1V4h-5V3H9zm0 5h2v9H9V8zm4 0h2v9h-2V8z"/>
            </svg>
        </div>
        <div class="card-inner"
            [style.transform]="cardInnerTransform()"
            [style.transition]="cardInnerTransition()">
            <div class="item-content">
                <h3 class="item-title" [title]="title()">{{ title() }}</h3>
            </div>
            <div class="item-content">
                <p class="item-subtitle">{{ subtitle() }}</p>
            </div>
        </div>
    `
})
export class ItemCardComponent {
    title = input.required<string>();
    subtitle = input.required<string>();
    itemClick = output<void>();
    itemDelete = output<void>();
    moveUp = output<void>();
    moveDown = output<void>();

    private readonly el = inject(ElementRef<HTMLElement>);

    private pointerId: number | null = null;
    private startX = 0;
    private startY = 0;
    private swipeStarted = false;
    readonly swipeOffset = signal(0);
    readonly isSwiping = signal(false);

    readonly cardInnerTransform = computed(() => `translateX(${this.swipeOffset()}px)`);
    readonly cardInnerTransition = computed(() =>
        this.isSwiping() ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    );

    onHostClick(): void {
        if (this.swipeStarted) {
            this.swipeStarted = false;
            return;
        }
        this.itemClick.emit();
    }

    onPointerDown(event: PointerEvent): void {
        const target = event.target as HTMLElement;
        if (target.closest('.drag-handle')) {
            return;
        }
        this.pointerId = event.pointerId;
        this.startX = event.clientX;
        this.startY = event.clientY;
        this.swipeStarted = false;
        this.el.nativeElement.setPointerCapture(event.pointerId);
    }

    onPointerMove(event: PointerEvent): void {
        if (this.pointerId === null || event.pointerId !== this.pointerId) return;

        const deltaX = event.clientX - this.startX;
        const deltaY = event.clientY - this.startY;

        if (!this.swipeStarted) {
            if (Math.abs(deltaX) > SWIPE_DEAD_ZONE) {
                this.swipeStarted = true;
                this.isSwiping.set(true);
            } else if (Math.abs(deltaY) > SWIPE_DEAD_ZONE) {
                this.el.nativeElement.releasePointerCapture(event.pointerId);
                this.pointerId = null;
                return;
            }
        }

        if (this.swipeStarted) {
            this.swipeOffset.set(deltaX);
        }
    }

    onPointerUp(event: PointerEvent): void {
        if (this.pointerId === null || event.pointerId !== this.pointerId) return;
        this.pointerId = null;

        if (!this.swipeStarted) return;

        const offset = this.swipeOffset();
        if (Math.abs(offset) >= SWIPE_THRESHOLD) {
            this.triggerDelete();
        } else {
            this.snapBack();
        }
    }

    onPointerCancel(): void {
        this.snapBack();
    }

    private triggerDelete(): void {
        this.snapBack();
        this.itemDelete.emit();
    }

    private snapBack(): void {
        this.isSwiping.set(false);
        this.swipeOffset.set(0);
        this.pointerId = null;
    }
}
