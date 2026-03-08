import { Language } from '@replog/shared';

export abstract class UserPreferencesPort {
    abstract setLastVisitedWorkout(workoutId: string): void;
    abstract getLastVisitedWorkout(): string | null;
    abstract clearLastVisitedWorkout(): void;
    abstract getLanguage(): Language;
    abstract setLanguage(language: Language): void;
    abstract clearAllPreferences(): void;
}
