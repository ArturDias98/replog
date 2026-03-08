import { Language } from '@replog/shared';

export abstract class UserPreferencesPort {
    abstract getLanguage(): Language;
    abstract setLanguage(language: Language): void;
    abstract clearAllPreferences(): void;
}
