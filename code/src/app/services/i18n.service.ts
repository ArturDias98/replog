import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { UserPreferencesService } from './user-preferences.service';
import { Language } from '../models/user-preferences';

@Injectable({ providedIn: 'root' })
export class I18nService {
    private readonly translocoService = inject(TranslocoService);
    private readonly userPreferencesService = inject(UserPreferencesService);

    readonly language = signal<Language>(this.userPreferencesService.getLanguage());

    /** IETF locale tag used as 4th argument to DatePipe and DecimalPipe */
    readonly locale = computed<string>(() => this.language() === 'pt-BR' ? 'pt-BR' : 'en-US');

    constructor() {
        this.translocoService.setActiveLang(this.language());

        effect(() => {
            const lang = this.language();
            this.translocoService.setActiveLang(lang);
            this.userPreferencesService.setLanguage(lang);
        });
    }

    setLanguage(lang: Language): void {
        this.language.set(lang);
    }
}
