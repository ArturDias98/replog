import { Injectable, inject } from '@angular/core';
import { WorkOutGroup } from '../models/workout-group';
import { CreateWorkoutModel, UpdateWorkoutModel } from '../models/workout';
import { StorageService } from './storage.service';

@Injectable({
    providedIn: 'root'
})
export class WorkoutDataService {
    private storage = inject(StorageService);

    async getWorkouts(): Promise<WorkOutGroup[]> {
        try {
            const storedData = await this.storage.loadFromStorage();

            if (storedData && storedData.length > 0) {
                return [...storedData];
            }

            return [];
        } catch (error) {
            console.error('Error loading workouts:', error);
            return [];
        }
    }

    async addWorkout(model: CreateWorkoutModel): Promise<WorkOutGroup> {
        try {
            const workouts = await this.storage.loadFromStorage();

            const newWorkout: WorkOutGroup = {
                id: crypto.randomUUID(),
                title: model.title.trim(),
                date: model.date,
                userId: model.userId,
                muscleGroup: []
            };

            workouts.push(newWorkout);
            await this.storage.saveToStorage(workouts);

            return newWorkout;
        } catch (error) {
            console.error('Error adding workout:', error);
            throw error;
        }
    }

    async updateWorkout(model: UpdateWorkoutModel): Promise<void> {
        try {
            const workouts = await this.storage.loadFromStorage();

            const index = workouts.findIndex(w => w.id === model.id);
            if (index !== -1) {
                workouts[index] = {
                    ...workouts[index],
                    title: model.title.trim(),
                    date: model.date
                };
                await this.storage.saveToStorage(workouts);
            }
        } catch (error) {
            console.error('Error updating workout:', error);
            throw error;
        }
    }

    async deleteWorkout(id: string): Promise<void> {
        try {
            const workouts = await this.storage.loadFromStorage();
            const filteredWorkouts = workouts.filter(w => w.id !== id);
            await this.storage.saveToStorage(filteredWorkouts);
        } catch (error) {
            console.error('Error deleting workout:', error);
            throw error;
        }
    }

    async clearAllWorkouts(userId?: string): Promise<void> {
        try {
            // Note: userId parameter is kept for API consistency but not used in local storage implementation
            await this.storage.saveToStorage([]);
        } catch (error) {
            console.error('Error clearing workouts:', error);
            throw error;
        }
    }

    async reorderWorkouts(previousIndex: number, currentIndex: number): Promise<void> {
        const workouts = await this.storage.loadFromStorage();
        const [moved] = workouts.splice(previousIndex, 1);
        workouts.splice(currentIndex, 0, moved);
        await this.storage.saveToStorage(workouts);
    }

    async getWorkoutById(id: string): Promise<WorkOutGroup | undefined> {
        try {
            const workouts = await this.storage.loadFromStorage();
            return workouts.find(w => w.id === id);
        } catch (error) {
            console.error('Error loading workout:', error);
            return undefined;
        }
    }
}
