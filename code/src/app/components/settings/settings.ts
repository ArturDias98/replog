import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { RouterLink } from '@angular/router';
import { I18nService } from '../../services/i18n.service';
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

    protected readonly languages: { value: Language; labelKey: string }[] = [
        { value: 'en', labelKey: 'settings.languageEn' },
        { value: 'pt-BR', labelKey: 'settings.languagePtBR' },
    ];

    protected selectLanguage(lang: Language): void {
        this.i18n.setLanguage(lang);
    }
}
