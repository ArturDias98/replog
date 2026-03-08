import { Injectable, inject } from '@angular/core';
import { MuscleGroup, Exercise, CreateMuscleGroupModel, UpdateMuscleGroupModel, CreateExerciseModel } from '@replog/shared';
import { MuscleGroupRepository, StoragePort } from '@replog/application';

@Injectable()
export class MuscleGroupRepositoryImpl extends MuscleGroupRepository {
    private readonly storage = inject(StoragePort);

    async getByWorkoutId(workoutId: string): Promise<MuscleGroup[]> {
        try {
            const workouts = await this.storage.loadAll();
            const workout = workouts.find(w => w.id === workoutId);
            return workout?.muscleGroup ?? [];
        } catch (error) {
            console.error('Error loading muscle groups:', error);
            return [];
        }
    }

    async getById(id: string): Promise<MuscleGroup | undefined> {
        try {
            const workouts = await this.storage.loadAll();
            for (const workout of workouts) {
                const muscleGroup = workout.muscleGroup.find(mg => mg.id === id);
                if (muscleGroup) return muscleGroup;
            }
            return undefined;
        } catch (error) {
            console.error('Error loading muscle group:', error);
            return undefined;
        }
    }

    async add(model: CreateMuscleGroupModel): Promise<MuscleGroup> {
        const workouts = await this.storage.loadAll();
        const workoutIndex = workouts.findIndex(w => w.id === model.workoutId);
        if (workoutIndex === -1) throw new Error('Workout not found');

        const muscleGroupId = crypto.randomUUID();
        const newMuscleGroup: MuscleGroup = {
            id: muscleGroupId,
            workoutId: model.workoutId,
            title: model.title.trim(),
            date: model.date,
            exercises: model.exercises.map((item: CreateExerciseModel) => ({
                id: crypto.randomUUID(),
                muscleGroupId: muscleGroupId,
                title: item.title.trim(),
                log: []
            }))
        };

        workouts[workoutIndex].muscleGroup.push(newMuscleGroup);
        await this.storage.saveAll(workouts);
        return newMuscleGroup;
    }

    async addMany(models: CreateMuscleGroupModel[]): Promise<MuscleGroup[]> {
        if (models.length === 0) return [];

        const workouts = await this.storage.loadAll();
        const workoutId = models[0].workoutId;
        const workoutIndex = workouts.findIndex(w => w.id === workoutId);
        if (workoutIndex === -1) throw new Error('Workout not found');

        const newMuscleGroups: MuscleGroup[] = models.map(model => {
            const muscleGroupId = crypto.randomUUID();
            return {
                id: muscleGroupId,
                workoutId: model.workoutId,
                title: model.title.trim(),
                date: model.date,
                exercises: model.exercises.map((item: CreateExerciseModel) => ({
                    id: crypto.randomUUID(),
                    muscleGroupId: muscleGroupId,
                    title: item.title.trim(),
                    log: []
                }))
            };
        });

        workouts[workoutIndex].muscleGroup.push(...newMuscleGroups);
        await this.storage.saveAll(workouts);
        return newMuscleGroups;
    }

    async update(model: UpdateMuscleGroupModel): Promise<MuscleGroup> {
        const workouts = await this.storage.loadAll();
        const workout = workouts.find(w => w.muscleGroup.some(mg => mg.id === model.muscleGroupId));
        if (!workout) throw new Error('Muscle group not found');

        const muscleGroupIndex = workout.muscleGroup.findIndex(mg => mg.id === model.muscleGroupId);
        workout.muscleGroup[muscleGroupIndex] = {
            ...workout.muscleGroup[muscleGroupIndex],
            title: model.title.trim(),
            date: model.date
        };

        await this.storage.saveAll(workouts);
        return workout.muscleGroup[muscleGroupIndex];
    }

    async delete(id: string): Promise<void> {
        const workouts = await this.storage.loadAll();
        const workout = workouts.find(w => w.muscleGroup.some(mg => mg.id === id));
        if (!workout) throw new Error('Muscle group not found');

        workout.muscleGroup = workout.muscleGroup.filter(mg => mg.id !== id);
        await this.storage.saveAll(workouts);
    }

    async clearAll(workoutId: string): Promise<void> {
        const workouts = await this.storage.loadAll();
        const workout = workouts.find(w => w.id === workoutId);
        if (!workout) throw new Error('Workout not found');

        workout.muscleGroup = [];
        await this.storage.saveAll(workouts);
    }

    async reorder(workoutId: string, previousIndex: number, currentIndex: number): Promise<void> {
        const workouts = await this.storage.loadAll();
        const workout = workouts.find(w => w.id === workoutId);
        if (!workout) throw new Error('Workout not found');

        const [moved] = workout.muscleGroup.splice(previousIndex, 1);
        workout.muscleGroup.splice(currentIndex, 0, moved);
        await this.storage.saveAll(workouts);
    }
}
