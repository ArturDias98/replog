export type Language = 'en' | 'pt-BR';

export type UserPreferences = {
    lastVisitedWorkoutId: string | null;
    language: Language;
};
