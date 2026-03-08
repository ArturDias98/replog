import { Component, inject, signal, ChangeDetectionStrategy, viewChild, ElementRef, OnInit } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';
import { ExportImportPort, BackupPort, SyncUseCase } from '@replog/application';
import { I18nUseCase } from '../../i18n';
import { Language } from '@replog/shared';

@Component({
    selector: 'app-settings',
    imports: [TranslocoPipe, RouterLink],
    templateUrl: './settings.html',
    styleUrl: './settings.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent implements OnInit {
    protected readonly i18n = inject(I18nUseCase);
    private readonly exportImportPort = inject(ExportImportPort);
    private readonly backupPort = inject(BackupPort);
    private readonly syncUseCase = inject(SyncUseCase);

    protected readonly languages: { value: Language; labelKey: string }[] = [
        { value: 'en', labelKey: 'settings.languageEn' },
        { value: 'pt-BR', labelKey: 'settings.languagePtBR' },
    ];

    protected readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

    protected readonly syncing = signal(false);
    protected readonly exporting = signal(false);
    protected readonly importing = signal(false);
    protected readonly backupUri = signal<string | null>(null);
    protected readonly dataMessage = signal<string | null>(null);
    protected readonly dataMessageParams = signal<Record<string, unknown>>({});
    protected readonly dataMessageType = signal<'success' | 'error' | null>(null);

    async ngOnInit(): Promise<void> {
        const uri = await this.backupPort.checkBackupExists();
        this.backupUri.set(uri);
    }

    protected selectLanguage(lang: Language): void {
        this.i18n.setLanguage(lang);
    }

    protected async syncNow(): Promise<void> {
        if (this.syncing()) return;

        this.syncing.set(true);
        this.clearMessage();

        try {
            const status = await this.syncUseCase.sync();
            if (status === 'success') {
                this.showMessage('settings.syncSuccess', 'success');
            } else {
                this.showMessage('settings.syncError', 'error');
            }
        } catch {
            this.showMessage('settings.syncError', 'error');
        } finally {
            this.syncing.set(false);
        }
    }

    protected async exportData(): Promise<void> {
        if (this.exporting()) return;

        this.exporting.set(true);
        this.clearMessage();

        try {
            const result = await this.exportImportPort.exportWorkouts();

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
            const result = await this.exportImportPort.importWorkouts(file);

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
