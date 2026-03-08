import { Injectable } from '@angular/core';
import { UserPreferences, Language } from '@replog/shared';
import { UserPreferencesPort } from './user-preferences.port';

@Injectable()
export class UserPreferencesServiceImpl extends UserPreferencesPort {
    private readonly STORAGE_KEY = 'replog_user_preferences';

    getLanguage(): Language {
        return this.loadFromStorage().language ?? 'en';
    }

    setLanguage(language: Language): void {
        const preferences = this.loadFromStorage();
        preferences.language = language;
        this.saveToStorage(preferences);
    }

    clearAllPreferences(): void {
        const defaultPreferences: UserPreferences = {
            language: 'en'
        };
        this.saveToStorage(defaultPreferences);
    }

    private loadFromStorage(): UserPreferences {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading user preferences from local storage:', error);
        }

        return {
            language: 'en'
        };
    }

    private saveToStorage(preferences: UserPreferences): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences));
        } catch (error) {
            console.error('Error saving user preferences to local storage:', error);
        }
    }
}
