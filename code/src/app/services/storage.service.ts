import { Injectable } from '@angular/core';
import { WorkOutGroup } from '../models/workout-group';

@Injectable({
    providedIn: 'root'
})
export class StorageService {
    private readonly STORAGE_KEY = 'replog_workouts';

    loadFromStorage(): WorkOutGroup[] {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading from local storage:', error);
            return [];
        }
    }

    saveToStorage(workouts: WorkOutGroup[]): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workouts));
        } catch (error) {
            console.error('Error saving to local storage:', error);
        }
    }
}
