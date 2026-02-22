import { Injectable } from '@angular/core';
import { UserPreferences, Language } from '../models/user-preferences';

@Injectable({
    providedIn: 'root'
})
export class UserPreferencesService {
    private readonly STORAGE_KEY = 'replog_user_preferences';

    /**
     * Set the last visited workout ID
     * @param workoutId The ID of the workout to save as last visited
     */
    setLastVisitedWorkout(workoutId: string): void {
        const preferences = this.loadFromStorage();
        preferences.lastVisitedWorkoutId = workoutId;
        this.saveToStorage(preferences);
    }

    /**
     * Get the last visited workout ID
     * @returns The last visited workout ID or null if not set
     */
    getLastVisitedWorkout(): string | null {
        return this.loadFromStorage().lastVisitedWorkoutId;
    }

    /**
     * Clear the last visited workout
     */
    clearLastVisitedWorkout(): void {
        const preferences = this.loadFromStorage();
        preferences.lastVisitedWorkoutId = null;
        this.saveToStorage(preferences);
    }

    /**
     * Get the saved language preference
     */
    getLanguage(): Language {
        return this.loadFromStorage().language ?? 'en';
    }

    /**
     * Set the language preference
     */
    setLanguage(language: Language): void {
        const preferences = this.loadFromStorage();
        preferences.language = language;
        this.saveToStorage(preferences);
    }

    /**
     * Clear all preferences
     */
    clearAllPreferences(): void {
        const defaultPreferences: UserPreferences = {
            lastVisitedWorkoutId: null,
            language: 'en'
        };
        this.saveToStorage(defaultPreferences);
    }

    /**
     * Load preferences from localStorage
     * @returns User preferences or default values if not found
     */
    private loadFromStorage(): UserPreferences {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            if (data) {
                return JSON.parse(data);
            }
        } catch (error) {
            console.error('Error loading user preferences from local storage:', error);
        }

        // Return default preferences
        return {
            lastVisitedWorkoutId: null,
            language: 'en'
        };
    }

    /**
     * Save preferences to localStorage
     * @param preferences The preferences to save
     */
    private saveToStorage(preferences: UserPreferences): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences));
        } catch (error) {
            console.error('Error saving user preferences to local storage:', error);
        }
    }
}
