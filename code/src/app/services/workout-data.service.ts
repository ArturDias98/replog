import { Injectable, inject } from '@angular/core';
import { WorkOutGroup } from '../models/workout-group';
import { CreateWorkoutModel, UpdateWorkoutModel } from '../models/workout';
import { StorageService } from './storage.service';
import { SyncQueueService } from './sync-queue.service';

@Injectable({
    providedIn: 'root'
})
export class WorkoutDataService {
    private storage = inject(StorageService);
    private syncQueue = inject(SyncQueueService);

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

            await this.syncQueue.recordChange('workout', 'CREATE', {
                id: newWorkout.id,
                userId: newWorkout.userId,
                title: newWorkout.title,
                date: newWorkout.date,
                orderIndex: workouts.length - 1,
            });

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

                await this.syncQueue.recordChange('workout', 'UPDATE', {
                    id: model.id,
                    title: model.title.trim(),
                    date: model.date,
                    orderIndex: index,
                });
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

            await this.syncQueue.recordChange('workout', 'DELETE', { id });
        } catch (error) {
            console.error('Error deleting workout:', error);
            throw error;
        }
    }

    async clearAllWorkouts(userId?: string): Promise<void> {
        try {
            const workouts = await this.storage.loadFromStorage();

            for (const workout of workouts) {
                await this.syncQueue.recordChange('workout', 'DELETE', { id: workout.id });
            }

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

        const start = Math.min(previousIndex, currentIndex);
        const end = Math.max(previousIndex, currentIndex);
        for (let i = start; i <= end; i++) {
            await this.syncQueue.recordChange('workout', 'UPDATE', {
                id: workouts[i].id,
                title: workouts[i].title,
                date: workouts[i].date,
                orderIndex: i,
            });
        }
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
