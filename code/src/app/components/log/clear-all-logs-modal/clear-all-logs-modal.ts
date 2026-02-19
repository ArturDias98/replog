import { Component, signal, output, inject, input } from '@angular/core';
import { LogService } from '../../../services/log.service';

@Component({
    selector: 'app-clear-all-logs-modal',
    templateUrl: './clear-all-logs-modal.html',
    styleUrl: './clear-all-logs-modal.css'
})
export class ClearAllLogsModal {
    private readonly logService = inject(LogService);

    exerciseId = input.required<string>();

    protected readonly isClearing = signal<boolean>(false);

    logsCleared = output<void>();
    closeModal = output<void>();

    protected close(): void {
        this.closeModal.emit();
    }

    protected async handleClearAll(): Promise<void> {
        this.isClearing.set(true);
        try {
            await this.logService.clearAllLogs(this.exerciseId());
            this.logsCleared.emit();
            this.close();
        } finally {
            this.isClearing.set(false);
        }
    }
}
