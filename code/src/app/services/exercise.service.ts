import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { Exercise } from '../models/exercise';

@Injectable({
    providedIn: 'root'
})
export class ExerciseService {
    private storage = inject(StorageService);

    async getExercisesByMuscleGroupId(muscleGroupId: string): Promise<Exercise[]> {
        try {
            const muscleGroup = await this.getExerciseById(muscleGroupId);
            const workouts = this.storage.loadFromStorage();

            for (const workout of workouts) {
                const mg = workout.muscleGroup.find(mg => mg.id === muscleGroupId);
                if (mg) {
                    return mg.exercises;
                }
            }
            return [];
        } catch (error) {
            console.error('Error loading exercises:', error);
            return [];
        }
    }

    async addExercise(muscleGroupId: string, title: string): Promise<Exercise> {
        try {
            const workouts = this.storage.loadFromStorage();

            const workout = workouts.find(w =>
                w.muscleGroup.some(mg => mg.id === muscleGroupId)
            );

            if (!workout) {
                throw new Error('Muscle group not found');
            }

            const muscleGroupIndex = workout.muscleGroup.findIndex(
                mg => mg.id === muscleGroupId
            );

            const newExercise: Exercise = {
                id: crypto.randomUUID(),
                muscleGroupId: muscleGroupId,
                title: title,
                log: []
            };

            workout.muscleGroup[muscleGroupIndex].exercises.push(newExercise);

            this.storage.saveToStorage(workouts);

            return newExercise;
        } catch (error) {
            console.error('Error adding exercise:', error);
            throw error;
        }
    }

    async deleteExercise(exerciseId: string): Promise<void> {
        try {
            const workouts = this.storage.loadFromStorage();

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

            muscleGroup.exercises = muscleGroup.exercises.filter(ex => ex.id !== exerciseId);

            this.storage.saveToStorage(workouts);
        } catch (error) {
            console.error('Error deleting exercise:', error);
            throw error;
        }
    }

    async updateExercise(exerciseId: string, title: string): Promise<Exercise> {
        try {
            const workouts = this.storage.loadFromStorage();

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

            const exerciseIndex = muscleGroup.exercises.findIndex(ex => ex.id === exerciseId);

            if (exerciseIndex === -1) {
                throw new Error('Exercise not found');
            }

            muscleGroup.exercises[exerciseIndex] = {
                ...muscleGroup.exercises[exerciseIndex],
                title: title
            };

            this.storage.saveToStorage(workouts);

            return muscleGroup.exercises[exerciseIndex];
        } catch (error) {
            console.error('Error updating exercise:', error);
            throw error;
        }
    }

    async clearAllExercises(muscleGroupId: string): Promise<void> {
        try {
            const workouts = this.storage.loadFromStorage();

            const workout = workouts.find(w =>
                w.muscleGroup.some(mg => mg.id === muscleGroupId)
            );

            if (!workout) {
                throw new Error('Muscle group not found');
            }

            const muscleGroup = workout.muscleGroup.find(mg => mg.id === muscleGroupId);

            if (!muscleGroup) {
                throw new Error('Muscle group not found');
            }

            muscleGroup.exercises = [];

            this.storage.saveToStorage(workouts);
        } catch (error) {
            console.error('Error clearing exercises:', error);
            throw error;
        }
    }

    async getExerciseById(exerciseId: string): Promise<Exercise | undefined> {
        try {
            const workouts = this.storage.loadFromStorage();

            for (const workout of workouts) {
                for (const muscleGroup of workout.muscleGroup) {
                    const exercise = muscleGroup.exercises.find(ex => ex.id === exerciseId);
                    if (exercise) {
                        let needsSave = false;
                        exercise.log = exercise.log.map(log => {
                            if (!log.date) {
                                needsSave = true;
                                return {
                                    ...log,
                                    date: new Date()
                                };
                            }
                            return log;
                        });

                        if (needsSave) {
                            this.storage.saveToStorage(workouts);
                        }

                        return exercise;
                    }
                }
            }

            return undefined;
        } catch (error) {
            console.error('Error loading exercise:', error);
            return undefined;
        }
    }
}
