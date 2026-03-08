import { Injectable, inject } from '@angular/core';
import { MuscleGroup, CreateMuscleGroupModel, UpdateMuscleGroupModel } from '@replog/shared';
import { MuscleGroupRepository } from '../../ports/muscle-group.repository';
import { SyncQueuePort } from '../../ports/sync-queue.port';

@Injectable({ providedIn: 'root' })
export class MuscleGroupUseCase {
    private readonly repository = inject(MuscleGroupRepository);
    private readonly syncQueue = inject(SyncQueuePort);

    async addMuscleGroup(model: CreateMuscleGroupModel): Promise<MuscleGroup> {
        const muscleGroup = await this.repository.add(model);
        const all = await this.repository.getByWorkoutId(model.workoutId);
        const mgOrderIndex = all.length - 1;
        await this.syncQueue.recordChange('muscleGroup', 'CREATE', {
            id: muscleGroup.id,
            workoutId: model.workoutId,
            title: muscleGroup.title,
            date: muscleGroup.date,
            orderIndex: mgOrderIndex,
        });
        for (let i = 0; i < muscleGroup.exercises.length; i++) {
            const ex = muscleGroup.exercises[i];
            await this.syncQueue.recordChange('exercise', 'CREATE', {
                id: ex.id,
                workoutId: model.workoutId,
                muscleGroupId: muscleGroup.id,
                title: ex.title,
                orderIndex: i,
            });
        }
        return muscleGroup;
    }

    async addMuscleGroups(models: CreateMuscleGroupModel[]): Promise<MuscleGroup[]> {
        if (models.length === 0) return [];
        const workoutId = models[0].workoutId;
        const existingCount = (await this.repository.getByWorkoutId(workoutId)).length;
        const newMuscleGroups = await this.repository.addMany(models);
        for (let mgIdx = 0; mgIdx < newMuscleGroups.length; mgIdx++) {
            const mg = newMuscleGroups[mgIdx];
            await this.syncQueue.recordChange('muscleGroup', 'CREATE', {
                id: mg.id,
                workoutId,
                title: mg.title,
                date: mg.date,
                orderIndex: existingCount + mgIdx,
            });
            for (let exIdx = 0; exIdx < mg.exercises.length; exIdx++) {
                const ex = mg.exercises[exIdx];
                await this.syncQueue.recordChange('exercise', 'CREATE', {
                    id: ex.id,
                    workoutId,
                    muscleGroupId: mg.id,
                    title: ex.title,
                    orderIndex: exIdx,
                });
            }
        }
        return newMuscleGroups;
    }

    async updateMuscleGroup(model: UpdateMuscleGroupModel): Promise<MuscleGroup> {
        const muscleGroup = await this.repository.update(model);
        const all = await this.repository.getByWorkoutId(muscleGroup.workoutId);
        const idx = all.findIndex(mg => mg.id === model.muscleGroupId);
        await this.syncQueue.recordChange('muscleGroup', 'UPDATE', {
            id: model.muscleGroupId,
            workoutId: muscleGroup.workoutId,
            title: model.title.trim(),
            date: model.date,
            orderIndex: idx,
        });
        return muscleGroup;
    }

    async deleteMuscleGroup(muscleGroupId: string): Promise<void> {
        const mg = await this.repository.getById(muscleGroupId);
        if (!mg) throw new Error('Muscle group not found');
        const workoutId = mg.workoutId;
        await this.repository.delete(muscleGroupId);
        await this.syncQueue.recordChange('muscleGroup', 'DELETE', {
            id: muscleGroupId,
            workoutId,
        });
    }

    async reorderMuscleGroups(workoutId: string, previousIndex: number, currentIndex: number): Promise<void> {
        await this.repository.reorder(workoutId, previousIndex, currentIndex);
        const muscleGroups = await this.repository.getByWorkoutId(workoutId);
        const start = Math.min(previousIndex, currentIndex);
        const end = Math.max(previousIndex, currentIndex);
        for (let i = start; i <= end; i++) {
            const mg = muscleGroups[i];
            await this.syncQueue.recordChange('muscleGroup', 'UPDATE', {
                id: mg.id,
                workoutId,
                title: mg.title,
                date: mg.date,
                orderIndex: i,
            });
        }
    }

    async getMuscleGroupsByWorkoutId(workoutId: string): Promise<MuscleGroup[]> {
        return this.repository.getByWorkoutId(workoutId);
    }

    async clearAllMuscleGroups(workoutId: string): Promise<void> {
        const muscleGroups = await this.repository.getByWorkoutId(workoutId);
        for (const mg of muscleGroups) {
            await this.syncQueue.recordChange('muscleGroup', 'DELETE', {
                id: mg.id,
                workoutId,
            });
        }
        await this.repository.clearAll(workoutId);
    }

    async getMuscleGroupById(muscleGroupId: string): Promise<MuscleGroup | undefined> {
        return this.repository.getById(muscleGroupId);
    }
}
