import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { SyncQueueService } from './sync-queue.service';
import { Exercise } from '../models/exercise';

@Injectable({
    providedIn: 'root'
})
export class ExerciseService {
    private storage = inject(StorageService);
    private syncQueue = inject(SyncQueueService);

    async getExercisesByMuscleGroupId(muscleGroupId: string): Promise<Exercise[]> {
        try {
            const muscleGroup = await this.getExerciseById(muscleGroupId);
            const workouts = await this.storage.loadFromStorage();

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
            const workouts = await this.storage.loadFromStorage();

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
                title: title.trim(),
                log: []
            };

            workout.muscleGroup[muscleGroupIndex].exercises.push(newExercise);

            await this.storage.saveToStorage(workouts);

            await this.syncQueue.recordChange('exercise', 'CREATE', {
                id: newExercise.id,
                workoutId: workout.id,
                muscleGroupId: muscleGroupId,
                title: newExercise.title,
                orderIndex: workout.muscleGroup[muscleGroupIndex].exercises.length - 1,
            });

            return newExercise;
        } catch (error) {
            console.error('Error adding exercise:', error);
            throw error;
        }
    }

    async addExercises(muscleGroupId: string, titles: string[]): Promise<Exercise[]> {
        try {
            if (titles.length === 0) {
                return [];
            }

            const workouts = await this.storage.loadFromStorage();

            const workout = workouts.find(w =>
                w.muscleGroup.some(mg => mg.id === muscleGroupId)
            );

            if (!workout) {
                throw new Error('Muscle group not found');
            }

            const muscleGroupIndex = workout.muscleGroup.findIndex(
                mg => mg.id === muscleGroupId
            );

            const existingCount = workout.muscleGroup[muscleGroupIndex].exercises.length;

            const newExercises: Exercise[] = titles.map(title => ({
                id: crypto.randomUUID(),
                muscleGroupId: muscleGroupId,
                title: title.trim(),
                log: []
            }));

            workout.muscleGroup[muscleGroupIndex].exercises.push(...newExercises);

            await this.storage.saveToStorage(workouts);

            for (let i = 0; i < newExercises.length; i++) {
                await this.syncQueue.recordChange('exercise', 'CREATE', {
                    id: newExercises[i].id,
                    workoutId: workout.id,
                    muscleGroupId: muscleGroupId,
                    title: newExercises[i].title,
                    orderIndex: existingCount + i,
                });
            }

            return newExercises;
        } catch (error) {
            console.error('Error adding exercises:', error);
            throw error;
        }
    }

    async reorderExercises(muscleGroupId: string, previousIndex: number, currentIndex: number): Promise<void> {
        const workouts = await this.storage.loadFromStorage();
        for (const workout of workouts) {
            const mg = workout.muscleGroup.find(mg => mg.id === muscleGroupId);
            if (mg) {
                const [moved] = mg.exercises.splice(previousIndex, 1);
                mg.exercises.splice(currentIndex, 0, moved);
                await this.storage.saveToStorage(workouts);

                const start = Math.min(previousIndex, currentIndex);
                const end = Math.max(previousIndex, currentIndex);
                for (let i = start; i <= end; i++) {
                    await this.syncQueue.recordChange('exercise', 'UPDATE', {
                        id: mg.exercises[i].id,
                        workoutId: workout.id,
                        muscleGroupId: muscleGroupId,
                        title: mg.exercises[i].title,
                        orderIndex: i,
                    });
                }

                return;
            }
        }
        throw new Error('Muscle group not found');
    }

    async deleteExercise(exerciseId: string): Promise<void> {
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

            muscleGroup.exercises = muscleGroup.exercises.filter(ex => ex.id !== exerciseId);

            await this.storage.saveToStorage(workouts);

            await this.syncQueue.recordChange('exercise', 'DELETE', {
                id: exerciseId,
                workoutId: workout.id,
                muscleGroupId: muscleGroup.id,
            });
        } catch (error) {
            console.error('Error deleting exercise:', error);
            throw error;
        }
    }

    async updateExercise(exerciseId: string, title: string): Promise<Exercise> {
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

            const exerciseIndex = muscleGroup.exercises.findIndex(ex => ex.id === exerciseId);

            if (exerciseIndex === -1) {
                throw new Error('Exercise not found');
            }

            muscleGroup.exercises[exerciseIndex] = {
                ...muscleGroup.exercises[exerciseIndex],
                title: title.trim()
            };

            await this.storage.saveToStorage(workouts);

            await this.syncQueue.recordChange('exercise', 'UPDATE', {
                id: exerciseId,
                workoutId: workout.id,
                muscleGroupId: muscleGroup.id,
                title: title.trim(),
                orderIndex: exerciseIndex,
            });

            return muscleGroup.exercises[exerciseIndex];
        } catch (error) {
            console.error('Error updating exercise:', error);
            throw error;
        }
    }

    async clearAllExercises(muscleGroupId: string): Promise<void> {
        try {
            const workouts = await this.storage.loadFromStorage();

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

            for (const ex of muscleGroup.exercises) {
                await this.syncQueue.recordChange('exercise', 'DELETE', {
                    id: ex.id,
                    workoutId: workout.id,
                    muscleGroupId: muscleGroupId,
                });
            }

            muscleGroup.exercises = [];

            await this.storage.saveToStorage(workouts);
        } catch (error) {
            console.error('Error clearing exercises:', error);
            throw error;
        }
    }

    async getExerciseById(exerciseId: string): Promise<Exercise | undefined> {
        try {
            const workouts = await this.storage.loadFromStorage();

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
                            await this.storage.saveToStorage(workouts);
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
