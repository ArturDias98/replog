import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { AddLogModel, UpdateLogModel } from '../models/log';

@Injectable({
    providedIn: 'root'
})
export class LogService {
    private storage = inject(StorageService);

    async addLog(model: AddLogModel): Promise<string> {
        try {
            const workouts = await this.storage.loadFromStorage();

            const workout = workouts.find(w =>
                w.muscleGroup.some(mg => mg.exercises.some(ex => ex.id === model.exerciseId))
            );

            if (!workout) {
                throw new Error('Exercise not found');
            }

            const muscleGroup = workout.muscleGroup.find(mg =>
                mg.exercises.some(ex => ex.id === model.exerciseId)
            );

            if (!muscleGroup) {
                throw new Error('Exercise not found');
            }

            const exercise = muscleGroup.exercises.find(ex => ex.id === model.exerciseId);

            if (!exercise) {
                throw new Error('Exercise not found');
            }

            const id = crypto.randomUUID();
            exercise.log.push({
                id,
                numberReps: model.numberReps,
                maxWeight: model.maxWeight,
                date: model.date
            });

            await this.storage.saveToStorage(workouts);
            return id;
        } catch (error) {
            console.error('Error adding log:', error);
            throw error;
        }
    }

    async updateLog(model: UpdateLogModel): Promise<void> {
        try {
            const workouts = await this.storage.loadFromStorage();

            const workout = workouts.find(w =>
                w.muscleGroup.some(mg => mg.exercises.some(ex => ex.id === model.exerciseId))
            );

            if (!workout) {
                throw new Error('Exercise not found');
            }

            const muscleGroup = workout.muscleGroup.find(mg =>
                mg.exercises.some(ex => ex.id === model.exerciseId)
            );

            if (!muscleGroup) {
                throw new Error('Exercise not found');
            }

            const exercise = muscleGroup.exercises.find(ex => ex.id === model.exerciseId);

            if (!exercise) {
                throw new Error('Exercise not found');
            }

            const logIndex = exercise.log.findIndex(log => log.id === model.logId);

            if (logIndex === -1) {
                throw new Error('Log not found');
            }

            exercise.log[logIndex] = {
                ...exercise.log[logIndex],
                numberReps: model.numberReps,
                maxWeight: model.maxWeight
            };

            await this.storage.saveToStorage(workouts);
        } catch (error) {
            console.error('Error updating log:', error);
            throw error;
        }
    }

    async deleteLog(exerciseId: string, logId: string): Promise<void> {
        try {
            const workouts = await this.storage.loadFromStorage();

            const workout = workouts.find(w =>
                w.muscleGroup.some(mg => mg.exercises.some(ex => ex.id === exerciseId))
            );

            if (!workout) {
                throw new Error('Exercise not found');
            }

            const muscleGroup = workout.muscleGroup.find(mg =>
                mg.exercises.some(ex => ex.id === exerciseId)
            );

            if (!muscleGroup) {
                throw new Error('Exercise not found');
            }

            const exercise = muscleGroup.exercises.find(ex => ex.id === exerciseId);

            if (!exercise) {
                throw new Error('Exercise not found');
            }

            exercise.log = exercise.log.filter(log => log.id !== logId);

            await this.storage.saveToStorage(workouts);
        } catch (error) {
            console.error('Error deleting log:', error);
            throw error;
        }
    }

    async clearAllLogs(exerciseId: string): Promise<void> {
        try {
            const workouts = await this.storage.loadFromStorage();

            const workout = workouts.find(w =>
                w.muscleGroup.some(mg => mg.exercises.some(ex => ex.id === exerciseId))
            );

            if (!workout) {
                throw new Error('Exercise not found');
            }

            const muscleGroup = workout.muscleGroup.find(mg =>
                mg.exercises.some(ex => ex.id === exerciseId)
            );

            if (!muscleGroup) {
                throw new Error('Exercise not found');
            }

            const exercise = muscleGroup.exercises.find(ex => ex.id === exerciseId);

            if (!exercise) {
                throw new Error('Exercise not found');
            }

            exercise.log = [];

            await this.storage.saveToStorage(workouts);
        } catch (error) {
            console.error('Error clearing logs:', error);
            throw error;
        }
    }
}
