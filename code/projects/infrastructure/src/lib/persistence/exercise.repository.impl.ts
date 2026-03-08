import { Injectable, inject } from '@angular/core';
import { Exercise } from '@replog/shared';
import { ExerciseRepository, StoragePort } from '@replog/application';

@Injectable()
export class ExerciseRepositoryImpl extends ExerciseRepository {
    private readonly storage = inject(StoragePort);

    async getByMuscleGroupId(muscleGroupId: string): Promise<Exercise[]> {
        try {
            const workouts = await this.storage.loadAll();
            for (const workout of workouts) {
                const mg = workout.muscleGroup.find(mg => mg.id === muscleGroupId);
                if (mg) return mg.exercises;
            }
            return [];
        } catch (error) {
            console.error('Error loading exercises:', error);
            return [];
        }
    }

    async getById(exerciseId: string): Promise<Exercise | undefined> {
        try {
            const workouts = await this.storage.loadAll();
            for (const workout of workouts) {
                for (const muscleGroup of workout.muscleGroup) {
                    const exercise = muscleGroup.exercises.find(ex => ex.id === exerciseId);
                    if (exercise) {
                        let needsSave = false;
                        exercise.log = exercise.log.map(log => {
                            if (!log.date) {
                                needsSave = true;
                                return { ...log, date: new Date() };
                            }
                            return log;
                        });
                        if (needsSave) {
                            await this.storage.saveAll(workouts);
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

    async add(muscleGroupId: string, title: string): Promise<Exercise> {
        const workouts = await this.storage.loadAll();
        const workout = workouts.find(w => w.muscleGroup.some(mg => mg.id === muscleGroupId));
        if (!workout) throw new Error('Muscle group not found');

        const muscleGroupIndex = workout.muscleGroup.findIndex(mg => mg.id === muscleGroupId);
        const newExercise: Exercise = {
            id: crypto.randomUUID(),
            muscleGroupId,
            title: title.trim(),
            log: []
        };

        workout.muscleGroup[muscleGroupIndex].exercises.push(newExercise);
        await this.storage.saveAll(workouts);
        return newExercise;
    }

    async addMany(muscleGroupId: string, titles: string[]): Promise<Exercise[]> {
        if (titles.length === 0) return [];

        const workouts = await this.storage.loadAll();
        const workout = workouts.find(w => w.muscleGroup.some(mg => mg.id === muscleGroupId));
        if (!workout) throw new Error('Muscle group not found');

        const muscleGroupIndex = workout.muscleGroup.findIndex(mg => mg.id === muscleGroupId);
        const newExercises: Exercise[] = titles.map(title => ({
            id: crypto.randomUUID(),
            muscleGroupId,
            title: title.trim(),
            log: []
        }));

        workout.muscleGroup[muscleGroupIndex].exercises.push(...newExercises);
        await this.storage.saveAll(workouts);
        return newExercises;
    }

    async update(exerciseId: string, title: string): Promise<Exercise> {
        const workouts = await this.storage.loadAll();
        for (const workout of workouts) {
            const muscleGroup = workout.muscleGroup.find(mg => mg.exercises.some(ex => ex.id === exerciseId));
            if (muscleGroup) {
                const exerciseIndex = muscleGroup.exercises.findIndex(ex => ex.id === exerciseId);
                muscleGroup.exercises[exerciseIndex] = {
                    ...muscleGroup.exercises[exerciseIndex],
                    title: title.trim()
                };
                await this.storage.saveAll(workouts);
                return muscleGroup.exercises[exerciseIndex];
            }
        }
        throw new Error('Exercise not found');
    }

    async delete(exerciseId: string): Promise<void> {
        const workouts = await this.storage.loadAll();
        for (const workout of workouts) {
            const muscleGroup = workout.muscleGroup.find(mg => mg.exercises.some(ex => ex.id === exerciseId));
            if (muscleGroup) {
                muscleGroup.exercises = muscleGroup.exercises.filter(ex => ex.id !== exerciseId);
                await this.storage.saveAll(workouts);
                return;
            }
        }
        throw new Error('Exercise not found');
    }

    async clearAll(muscleGroupId: string): Promise<void> {
        const workouts = await this.storage.loadAll();
        for (const workout of workouts) {
            const muscleGroup = workout.muscleGroup.find(mg => mg.id === muscleGroupId);
            if (muscleGroup) {
                muscleGroup.exercises = [];
                await this.storage.saveAll(workouts);
                return;
            }
        }
        throw new Error('Muscle group not found');
    }

    async reorder(muscleGroupId: string, previousIndex: number, currentIndex: number): Promise<void> {
        const workouts = await this.storage.loadAll();
        for (const workout of workouts) {
            const mg = workout.muscleGroup.find(mg => mg.id === muscleGroupId);
            if (mg) {
                const [moved] = mg.exercises.splice(previousIndex, 1);
                mg.exercises.splice(currentIndex, 0, moved);
                await this.storage.saveAll(workouts);
                return;
            }
        }
        throw new Error('Muscle group not found');
    }
}
