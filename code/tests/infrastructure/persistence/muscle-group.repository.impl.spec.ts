import { TestBed } from '@angular/core/testing';
import { StoragePort } from '@replog/application';
import { MuscleGroupRepositoryImpl } from '@replog/infrastructure';
import { WorkOutGroup } from '@replog/shared';
import { resetIndexedDB, configureTestBed } from './setup';

describe('MuscleGroupRepositoryImpl', () => {
    let repository: MuscleGroupRepositoryImpl;
    let storage: StoragePort;

    beforeEach(() => {
        resetIndexedDB();
        configureTestBed(MuscleGroupRepositoryImpl);
        repository = TestBed.inject(MuscleGroupRepositoryImpl);
        storage = TestBed.inject(StoragePort);
    });

    function seedWorkout(overrides?: Partial<WorkOutGroup>): WorkOutGroup {
        return {
            id: 'w1', title: 'Push', date: '2026-01-01', userId: 'u1', muscleGroup: [],
            ...overrides
        };
    }

    describe('getByWorkoutId', () => {
        it('should return empty array for unknown workout', async () => {
            const result = await repository.getByWorkoutId('unknown');
            expect(result).toEqual([]);
        });

        it('should return muscle groups with empty exercises', async () => {
            await storage.saveAll([seedWorkout({
                muscleGroup: [
                    { id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01', exercises: [] },
                    { id: 'mg2', workoutId: 'w1', title: 'Triceps', date: '2026-01-02', exercises: [] }
                ]
            })]);

            const result = await repository.getByWorkoutId('w1');

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('mg1');
            expect(result[0].workoutId).toBe('w1');
            expect(result[0].title).toBe('Chest');
            expect(result[0].date).toBe('2026-01-01');
            expect(result[0].exercises).toEqual([]);
            expect(result[1].id).toBe('mg2');
            expect(result[1].workoutId).toBe('w1');
            expect(result[1].title).toBe('Triceps');
            expect(result[1].date).toBe('2026-01-02');
            expect(result[1].exercises).toEqual([]);
        });

        it('should return muscle groups with populated exercises and logs', async () => {
            await storage.saveAll([seedWorkout({
                muscleGroup: [{
                    id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01',
                    exercises: [{
                        id: 'ex1', muscleGroupId: 'mg1', title: 'Bench Press',
                        log: [{ id: 'l1', numberReps: 10, maxWeight: 80, date: new Date('2026-01-01') }]
                    }]
                }]
            })]);

            const result = await repository.getByWorkoutId('w1');

            expect(result).toHaveLength(1);
            expect(result[0].exercises).toHaveLength(1);

            const ex = result[0].exercises[0];
            expect(ex.id).toBe('ex1');
            expect(ex.muscleGroupId).toBe('mg1');
            expect(ex.title).toBe('Bench Press');
            expect(ex.log).toHaveLength(1);
            expect(ex.log[0].id).toBe('l1');
            expect(ex.log[0].numberReps).toBe(10);
            expect(ex.log[0].maxWeight).toBe(80);
        });
    });

    describe('getById', () => {
        it('should return undefined for unknown id', async () => {
            await storage.saveAll([seedWorkout()]);
            const result = await repository.getById('unknown');
            expect(result).toBeUndefined();
        });

        it('should find muscle group with empty exercises', async () => {
            await storage.saveAll([seedWorkout({
                muscleGroup: [
                    { id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01', exercises: [] }
                ]
            })]);

            const result = await repository.getById('mg1');

            expect(result).toBeDefined();
            expect(result!.id).toBe('mg1');
            expect(result!.workoutId).toBe('w1');
            expect(result!.title).toBe('Chest');
            expect(result!.date).toBe('2026-01-01');
            expect(result!.exercises).toEqual([]);
        });

        it('should find muscle group with populated nested data', async () => {
            await storage.saveAll([seedWorkout({
                muscleGroup: [{
                    id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01',
                    exercises: [{
                        id: 'ex1', muscleGroupId: 'mg1', title: 'Bench Press',
                        log: [{ id: 'l1', numberReps: 12, maxWeight: 60, date: new Date('2026-01-01') }]
                    }]
                }]
            })]);

            const result = await repository.getById('mg1');

            expect(result).toBeDefined();
            expect(result!.exercises).toHaveLength(1);
            expect(result!.exercises[0].id).toBe('ex1');
            expect(result!.exercises[0].title).toBe('Bench Press');
            expect(result!.exercises[0].log).toHaveLength(1);
            expect(result!.exercises[0].log[0].id).toBe('l1');
            expect(result!.exercises[0].log[0].numberReps).toBe(12);
            expect(result!.exercises[0].log[0].maxWeight).toBe(60);
        });
    });

    describe('add', () => {
        it('should throw for unknown workout', async () => {
            await storage.saveAll([]);
            await expect(repository.add({
                workoutId: 'unknown', title: 'Chest', date: '2026-01-01', exercises: []
            })).rejects.toThrow('Workout not found');
        });

        it('should create muscle group with empty exercises', async () => {
            await storage.saveAll([seedWorkout()]);

            const result = await repository.add({
                workoutId: 'w1', title: '  Chest  ', date: '2026-01-01', exercises: []
            });

            expect(result.id).toBeDefined();
            expect(result.workoutId).toBe('w1');
            expect(result.title).toBe('Chest');
            expect(result.date).toBe('2026-01-01');
            expect(result.exercises).toEqual([]);

            const persisted = await repository.getById(result.id);
            expect(persisted).toBeDefined();
            expect(persisted!.id).toBe(result.id);
            expect(persisted!.title).toBe('Chest');
        });

        it('should create muscle group with nested exercises', async () => {
            await storage.saveAll([seedWorkout()]);

            const result = await repository.add({
                workoutId: 'w1', title: 'Chest', date: '2026-01-01',
                exercises: [{ title: '  Bench Press  ' }, { title: '  Fly  ' }]
            });

            expect(result.id).toBeDefined();
            expect(result.title).toBe('Chest');
            expect(result.exercises).toHaveLength(2);

            expect(result.exercises[0].id).toBeDefined();
            expect(result.exercises[0].muscleGroupId).toBe(result.id);
            expect(result.exercises[0].title).toBe('Bench Press');
            expect(result.exercises[0].log).toEqual([]);

            expect(result.exercises[1].id).toBeDefined();
            expect(result.exercises[1].muscleGroupId).toBe(result.id);
            expect(result.exercises[1].title).toBe('Fly');
            expect(result.exercises[1].log).toEqual([]);
        });
    });

    describe('addMany', () => {
        it('should return empty array for empty input', async () => {
            const result = await repository.addMany([]);
            expect(result).toEqual([]);
        });

        it('should throw for unknown workout', async () => {
            await storage.saveAll([]);
            await expect(repository.addMany([
                { workoutId: 'unknown', title: 'Chest', date: '2026-01-01', exercises: [] }
            ])).rejects.toThrow('Workout not found');
        });

        it('should batch create with correct properties', async () => {
            await storage.saveAll([seedWorkout()]);

            const result = await repository.addMany([
                { workoutId: 'w1', title: '  Chest  ', date: '2026-01-01', exercises: [{ title: '  Bench  ' }] },
                { workoutId: 'w1', title: '  Back  ', date: '2026-01-02', exercises: [] }
            ]);

            expect(result).toHaveLength(2);

            expect(result[0].id).toBeDefined();
            expect(result[0].workoutId).toBe('w1');
            expect(result[0].title).toBe('Chest');
            expect(result[0].date).toBe('2026-01-01');
            expect(result[0].exercises).toHaveLength(1);
            expect(result[0].exercises[0].id).toBeDefined();
            expect(result[0].exercises[0].muscleGroupId).toBe(result[0].id);
            expect(result[0].exercises[0].title).toBe('Bench');

            expect(result[1].id).toBeDefined();
            expect(result[1].workoutId).toBe('w1');
            expect(result[1].title).toBe('Back');
            expect(result[1].date).toBe('2026-01-02');
            expect(result[1].exercises).toEqual([]);

            const all = await repository.getByWorkoutId('w1');
            expect(all).toHaveLength(2);
        });
    });

    describe('update', () => {
        it('should throw for unknown muscle group', async () => {
            await storage.saveAll([seedWorkout()]);
            await expect(repository.update({
                muscleGroupId: 'unknown', title: 'Updated', date: '2026-02-01'
            })).rejects.toThrow('Muscle group not found');
        });

        it('should update title and date', async () => {
            await storage.saveAll([seedWorkout({
                muscleGroup: [
                    { id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01', exercises: [] }
                ]
            })]);

            const result = await repository.update({
                muscleGroupId: 'mg1', title: '  Shoulders  ', date: '2026-02-01'
            });

            expect(result.id).toBe('mg1');
            expect(result.workoutId).toBe('w1');
            expect(result.title).toBe('Shoulders');
            expect(result.date).toBe('2026-02-01');
            expect(result.exercises).toEqual([]);
        });

        it('should preserve exercises when updating', async () => {
            await storage.saveAll([seedWorkout({
                muscleGroup: [{
                    id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01',
                    exercises: [{ id: 'ex1', muscleGroupId: 'mg1', title: 'Bench Press', log: [] }]
                }]
            })]);

            const result = await repository.update({
                muscleGroupId: 'mg1', title: 'Updated Chest', date: '2026-02-01'
            });

            expect(result.title).toBe('Updated Chest');
            expect(result.exercises).toHaveLength(1);
            expect(result.exercises[0].id).toBe('ex1');
            expect(result.exercises[0].title).toBe('Bench Press');
        });
    });

    describe('delete', () => {
        it('should throw for unknown muscle group', async () => {
            await storage.saveAll([seedWorkout()]);
            await expect(repository.delete('unknown')).rejects.toThrow('Muscle group not found');
        });

        it('should remove muscle group and leave siblings untouched', async () => {
            await storage.saveAll([seedWorkout({
                muscleGroup: [
                    { id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01', exercises: [] },
                    { id: 'mg2', workoutId: 'w1', title: 'Triceps', date: '2026-01-02', exercises: [] }
                ]
            })]);

            await repository.delete('mg1');

            const all = await repository.getByWorkoutId('w1');
            expect(all).toHaveLength(1);
            expect(all[0].id).toBe('mg2');
            expect(all[0].title).toBe('Triceps');
        });
    });

    describe('clearAll', () => {
        it('should throw for unknown workout', async () => {
            await storage.saveAll([]);
            await expect(repository.clearAll('unknown')).rejects.toThrow('Workout not found');
        });

        it('should empty all muscle groups for workout', async () => {
            await storage.saveAll([seedWorkout({
                muscleGroup: [
                    { id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01', exercises: [] },
                    { id: 'mg2', workoutId: 'w1', title: 'Triceps', date: '2026-01-02', exercises: [] }
                ]
            })]);

            await repository.clearAll('w1');

            const all = await repository.getByWorkoutId('w1');
            expect(all).toEqual([]);
        });
    });

    describe('reorder', () => {
        it('should throw for unknown workout', async () => {
            await storage.saveAll([]);
            await expect(repository.reorder('unknown', 0, 1)).rejects.toThrow('Workout not found');
        });

        it('should reorder muscle groups within workout', async () => {
            await storage.saveAll([seedWorkout({
                muscleGroup: [
                    { id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01', exercises: [] },
                    { id: 'mg2', workoutId: 'w1', title: 'Triceps', date: '2026-01-02', exercises: [] },
                    { id: 'mg3', workoutId: 'w1', title: 'Shoulders', date: '2026-01-03', exercises: [] }
                ]
            })]);

            await repository.reorder('w1', 0, 2);

            const all = await repository.getByWorkoutId('w1');
            expect(all).toHaveLength(3);
            expect(all[0].id).toBe('mg2');
            expect(all[0].title).toBe('Triceps');
            expect(all[1].id).toBe('mg3');
            expect(all[1].title).toBe('Shoulders');
            expect(all[2].id).toBe('mg1');
            expect(all[2].title).toBe('Chest');
        });
    });
});
