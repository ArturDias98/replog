import { Injectable, inject } from '@angular/core';
import { AddLogModel, UpdateLogModel } from '@replog/shared';
import { LogRepository, StoragePort } from '@replog/application';

@Injectable()
export class LogRepositoryImpl extends LogRepository {
    private readonly storage = inject(StoragePort);

    async add(model: AddLogModel): Promise<string> {
        const workouts = await this.storage.loadAll();
        for (const workout of workouts) {
            const muscleGroup = workout.muscleGroup.find(mg => mg.exercises.some(ex => ex.id === model.exerciseId));
            if (muscleGroup) {
                const exercise = muscleGroup.exercises.find(ex => ex.id === model.exerciseId);
                if (exercise) {
                    const id = crypto.randomUUID();
                    exercise.log.push({
                        id,
                        numberReps: model.numberReps,
                        maxWeight: model.maxWeight,
                        date: model.date
                    });
                    await this.storage.saveAll(workouts);
                    return id;
                }
            }
        }
        throw new Error('Exercise not found');
    }

    async update(model: UpdateLogModel): Promise<void> {
        const workouts = await this.storage.loadAll();
        for (const workout of workouts) {
            const muscleGroup = workout.muscleGroup.find(mg => mg.exercises.some(ex => ex.id === model.exerciseId));
            if (muscleGroup) {
                const exercise = muscleGroup.exercises.find(ex => ex.id === model.exerciseId);
                if (exercise) {
                    const logIndex = exercise.log.findIndex(log => log.id === model.logId);
                    if (logIndex === -1) throw new Error('Log not found');

                    exercise.log[logIndex] = {
                        ...exercise.log[logIndex],
                        numberReps: model.numberReps,
                        maxWeight: model.maxWeight
                    };
                    await this.storage.saveAll(workouts);
                    return;
                }
            }
        }
        throw new Error('Exercise not found');
    }

    async delete(exerciseId: string, logId: string): Promise<void> {
        const workouts = await this.storage.loadAll();
        for (const workout of workouts) {
            const muscleGroup = workout.muscleGroup.find(mg => mg.exercises.some(ex => ex.id === exerciseId));
            if (muscleGroup) {
                const exercise = muscleGroup.exercises.find(ex => ex.id === exerciseId);
                if (exercise) {
                    exercise.log = exercise.log.filter(log => log.id !== logId);
                    await this.storage.saveAll(workouts);
                    return;
                }
            }
        }
        throw new Error('Exercise not found');
    }

    async clearAll(exerciseId: string): Promise<void> {
        const workouts = await this.storage.loadAll();
        for (const workout of workouts) {
            const muscleGroup = workout.muscleGroup.find(mg => mg.exercises.some(ex => ex.id === exerciseId));
            if (muscleGroup) {
                const exercise = muscleGroup.exercises.find(ex => ex.id === exerciseId);
                if (exercise) {
                    exercise.log = [];
                    await this.storage.saveAll(workouts);
                    return;
                }
            }
        }
        throw new Error('Exercise not found');
    }
}
