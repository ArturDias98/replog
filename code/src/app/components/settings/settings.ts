import { Component, inject, signal, ChangeDetectionStrategy, viewChild, ElementRef } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../services/i18n.service';
import { ExportImportService } from '../../services/export-import.service';
import { Language } from '../../models/user-preferences';

@Component({
    selector: 'app-settings',
    imports: [TranslocoPipe, RouterLink],
    templateUrl: './settings.html',
    styleUrl: './settings.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
    protected readonly i18n = inject(I18nService);
    private readonly exportImportService = inject(ExportImportService);

    protected readonly languages: { value: Language; labelKey: string }[] = [
        { value: 'en', labelKey: 'settings.languageEn' },
        { value: 'pt-BR', labelKey: 'settings.languagePtBR' },
    ];

    protected readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

    protected readonly exporting = signal(false);
    protected readonly importing = signal(false);
    protected readonly dataMessage = signal<string | null>(null);
    protected readonly dataMessageParams = signal<Record<string, unknown>>({});
    protected readonly dataMessageType = signal<'success' | 'error' | null>(null);

    protected selectLanguage(lang: Language): void {
        this.i18n.setLanguage(lang);
    }

    protected async exportData(): Promise<void> {
        if (this.exporting()) return;

        this.exporting.set(true);
        this.clearMessage();

        try {
            const result = await this.exportImportService.exportWorkouts();

            switch (result.status) {
                case 'success':
                    this.showMessage('settings.exportSuccess', 'success');
                    break;
                case 'empty':
                    this.showMessage('settings.exportEmpty', 'error');
                    break;
                case 'error':
                    this.showMessage('settings.exportError', 'error');
                    break;
            }
        } catch {
            this.showMessage('settings.exportError', 'error');
        } finally {
            this.exporting.set(false);
        }
    }

    protected triggerImport(): void {
        this.fileInput()?.nativeElement.click();
    }

    protected async onFileSelected(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];

        if (!file) return;

        // Reset input so the same file can be selected again
        input.value = '';

        if (this.importing()) return;

        this.importing.set(true);
        this.clearMessage();

        try {
            const result = await this.exportImportService.importWorkouts(file);

            switch (result.status) {
                case 'success':
                    this.showMessage('settings.importSuccess', 'success', { count: result.count });
                    break;
                case 'all_duplicates':
                    this.showMessage('settings.importAllDuplicates', 'error');
                    break;
                case 'invalid_file':
                    this.showMessage('settings.importInvalidFile', 'error');
                    break;
                case 'error':
                    this.showMessage('settings.importError', 'error');
                    break;
            }
        } catch {
            this.showMessage('settings.importError', 'error');
        } finally {
            this.importing.set(false);
        }
    }

    private showMessage(key: string, type: 'success' | 'error', params: Record<string, unknown> = {}): void {
        this.dataMessage.set(key);
        this.dataMessageType.set(type);
        this.dataMessageParams.set(params);
    }

    private clearMessage(): void {
        this.dataMessage.set(null);
        this.dataMessageType.set(null);
        this.dataMessageParams.set({});
    }
}
