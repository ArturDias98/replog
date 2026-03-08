import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Language } from '@replog/shared';
import { UserPreferencesPort } from '../preferences';

@Injectable({ providedIn: 'root' })
export class I18nUseCase {
    private readonly translocoService = inject(TranslocoService);
    private readonly userPreferences = inject(UserPreferencesPort);

    readonly language = signal<Language>(this.userPreferences.getLanguage());
    readonly locale = computed<string>(() => this.language() === 'pt-BR' ? 'pt-BR' : 'en-US');

    constructor() {
        this.translocoService.setActiveLang(this.language());

        effect(() => {
            const lang = this.language();
            this.translocoService.setActiveLang(lang);
            this.userPreferences.setLanguage(lang);
        });
    }

    setLanguage(lang: Language): void {
        this.language.set(lang);
    }
}
