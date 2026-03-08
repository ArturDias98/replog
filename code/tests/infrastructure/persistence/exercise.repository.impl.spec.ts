import { TestBed } from '@angular/core/testing';
import { StoragePort } from '@replog/application';
import { ExerciseRepositoryImpl } from '@replog/infrastructure';
import { WorkOutGroup } from '@replog/shared';
import { resetIndexedDB, configureTestBed } from './setup';

describe('ExerciseRepositoryImpl', () => {
    let repository: ExerciseRepositoryImpl;
    let storage: StoragePort;

    beforeEach(() => {
        resetIndexedDB();
        configureTestBed(ExerciseRepositoryImpl);
        repository = TestBed.inject(ExerciseRepositoryImpl);
        storage = TestBed.inject(StoragePort);
    });

    function seedData(overrides?: Partial<WorkOutGroup>): WorkOutGroup {
        return {
            id: 'w1', title: 'Push', date: '2026-01-01', userId: 'u1',
            muscleGroup: [{
                id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01',
                exercises: []
            }],
            ...overrides
        };
    }

    describe('getByMuscleGroupId', () => {
        it('should return empty array for unknown muscle group', async () => {
            await storage.saveAll([seedData()]);
            const result = await repository.getByMuscleGroupId('unknown');
            expect(result).toEqual([]);
        });

        it('should return exercises with empty logs', async () => {
            await storage.saveAll([seedData({
                muscleGroup: [{
                    id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01',
                    exercises: [
                        { id: 'ex1', muscleGroupId: 'mg1', title: 'Bench Press', log: [] },
                        { id: 'ex2', muscleGroupId: 'mg1', title: 'Fly', log: [] }
                    ]
                }]
            })]);

            const result = await repository.getByMuscleGroupId('mg1');

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('ex1');
            expect(result[0].muscleGroupId).toBe('mg1');
            expect(result[0].title).toBe('Bench Press');
            expect(result[0].log).toEqual([]);
            expect(result[1].id).toBe('ex2');
            expect(result[1].muscleGroupId).toBe('mg1');
            expect(result[1].title).toBe('Fly');
            expect(result[1].log).toEqual([]);
        });

        it('should return exercises with populated logs', async () => {
            await storage.saveAll([seedData({
                muscleGroup: [{
                    id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01',
                    exercises: [{
                        id: 'ex1', muscleGroupId: 'mg1', title: 'Bench Press',
                        log: [
                            { id: 'l1', numberReps: 10, maxWeight: 80, date: new Date('2026-01-01') },
                            { id: 'l2', numberReps: 8, maxWeight: 85, date: new Date('2026-01-02') }
                        ]
                    }]
                }]
            })]);

            const result = await repository.getByMuscleGroupId('mg1');

            expect(result).toHaveLength(1);
            expect(result[0].log).toHaveLength(2);
            expect(result[0].log[0].id).toBe('l1');
            expect(result[0].log[0].numberReps).toBe(10);
            expect(result[0].log[0].maxWeight).toBe(80);
            expect(result[0].log[1].id).toBe('l2');
            expect(result[0].log[1].numberReps).toBe(8);
            expect(result[0].log[1].maxWeight).toBe(85);
        });
    });

    describe('getById', () => {
        it('should return undefined for unknown exercise', async () => {
            await storage.saveAll([seedData()]);
            const result = await repository.getById('unknown');
            expect(result).toBeUndefined();
        });

        it('should find exercise with empty logs', async () => {
            await storage.saveAll([seedData({
                muscleGroup: [{
                    id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01',
                    exercises: [{ id: 'ex1', muscleGroupId: 'mg1', title: 'Bench Press', log: [] }]
                }]
            })]);

            const result = await repository.getById('ex1');

            expect(result).toBeDefined();
            expect(result!.id).toBe('ex1');
            expect(result!.muscleGroupId).toBe('mg1');
            expect(result!.title).toBe('Bench Press');
            expect(result!.log).toEqual([]);
        });

        it('should find exercise with populated logs', async () => {
            await storage.saveAll([seedData({
                muscleGroup: [{
                    id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01',
                    exercises: [{
                        id: 'ex1', muscleGroupId: 'mg1', title: 'Bench Press',
                        log: [{ id: 'l1', numberReps: 10, maxWeight: 80, date: new Date('2026-01-01') }]
                    }]
                }]
            })]);

            const result = await repository.getById('ex1');

            expect(result).toBeDefined();
            expect(result!.log).toHaveLength(1);
            expect(result!.log[0].id).toBe('l1');
            expect(result!.log[0].numberReps).toBe(10);
            expect(result!.log[0].maxWeight).toBe(80);
        });

        it('should auto-fix logs with missing dates', async () => {
            await storage.saveAll([seedData({
                muscleGroup: [{
                    id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01',
                    exercises: [{
                        id: 'ex1', muscleGroupId: 'mg1', title: 'Bench Press',
                        log: [{ id: 'l1', numberReps: 10, maxWeight: 80, date: undefined as unknown as Date }]
                    }]
                }]
            })]);

            const result = await repository.getById('ex1');

            expect(result).toBeDefined();
            expect(result!.log).toHaveLength(1);
            expect(result!.log[0].date).toBeDefined();
            expect(result!.log[0].date).toBeInstanceOf(Date);
        });
    });

    describe('add', () => {
        it('should throw for unknown muscle group', async () => {
            await storage.saveAll([seedData()]);
            await expect(repository.add('unknown', 'Bench Press')).rejects.toThrow('Muscle group not found');
        });

        it('should create exercise with correct properties', async () => {
            await storage.saveAll([seedData()]);

            const result = await repository.add('mg1', '  Bench Press  ');

            expect(result.id).toBeDefined();
            expect(result.muscleGroupId).toBe('mg1');
            expect(result.title).toBe('Bench Press');
            expect(result.log).toEqual([]);

            const persisted = await repository.getById(result.id);
            expect(persisted).toBeDefined();
            expect(persisted!.id).toBe(result.id);
            expect(persisted!.muscleGroupId).toBe('mg1');
            expect(persisted!.title).toBe('Bench Press');
            expect(persisted!.log).toEqual([]);
        });
    });

    describe('addMany', () => {
        it('should return empty array for empty titles', async () => {
            const result = await repository.addMany('mg1', []);
            expect(result).toEqual([]);
        });

        it('should throw for unknown muscle group', async () => {
            await storage.saveAll([seedData()]);
            await expect(repository.addMany('unknown', ['Bench'])).rejects.toThrow('Muscle group not found');
        });

        it('should batch create exercises with correct properties', async () => {
            await storage.saveAll([seedData()]);

            const result = await repository.addMany('mg1', ['  Bench Press  ', '  Fly  ']);

            expect(result).toHaveLength(2);

            expect(result[0].id).toBeDefined();
            expect(result[0].muscleGroupId).toBe('mg1');
            expect(result[0].title).toBe('Bench Press');
            expect(result[0].log).toEqual([]);

            expect(result[1].id).toBeDefined();
            expect(result[1].muscleGroupId).toBe('mg1');
            expect(result[1].title).toBe('Fly');
            expect(result[1].log).toEqual([]);

            const all = await repository.getByMuscleGroupId('mg1');
            expect(all).toHaveLength(2);
            expect(all[0].id).toBe(result[0].id);
            expect(all[1].id).toBe(result[1].id);
        });
    });

    describe('update', () => {
        it('should throw for unknown exercise', async () => {
            await storage.saveAll([seedData()]);
            await expect(repository.update('unknown', 'Updated')).rejects.toThrow('Exercise not found');
        });

        it('should update title and preserve log array', async () => {
            await storage.saveAll([seedData({
                muscleGroup: [{
                    id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01',
                    exercises: [{
                        id: 'ex1', muscleGroupId: 'mg1', title: 'Bench Press',
                        log: [{ id: 'l1', numberReps: 10, maxWeight: 80, date: new Date('2026-01-01') }]
                    }]
                }]
            })]);

            const result = await repository.update('ex1', '  Incline Bench  ');

            expect(result.id).toBe('ex1');
            expect(result.muscleGroupId).toBe('mg1');
            expect(result.title).toBe('Incline Bench');
            expect(result.log).toHaveLength(1);
            expect(result.log[0].id).toBe('l1');
            expect(result.log[0].numberReps).toBe(10);
            expect(result.log[0].maxWeight).toBe(80);
        });
    });

    describe('delete', () => {
        it('should throw for unknown exercise', async () => {
            await storage.saveAll([seedData()]);
            await expect(repository.delete('unknown')).rejects.toThrow('Exercise not found');
        });

        it('should remove exercise and leave siblings untouched', async () => {
            await storage.saveAll([seedData({
                muscleGroup: [{
                    id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01',
                    exercises: [
                        { id: 'ex1', muscleGroupId: 'mg1', title: 'Bench Press', log: [] },
                        { id: 'ex2', muscleGroupId: 'mg1', title: 'Fly', log: [] }
                    ]
                }]
            })]);

            await repository.delete('ex1');

            const all = await repository.getByMuscleGroupId('mg1');
            expect(all).toHaveLength(1);
            expect(all[0].id).toBe('ex2');
            expect(all[0].title).toBe('Fly');
        });
    });

    describe('clearAll', () => {
        it('should throw for unknown muscle group', async () => {
            await storage.saveAll([seedData()]);
            await expect(repository.clearAll('unknown')).rejects.toThrow('Muscle group not found');
        });

        it('should empty all exercises for muscle group', async () => {
            await storage.saveAll([seedData({
                muscleGroup: [{
                    id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01',
                    exercises: [
                        { id: 'ex1', muscleGroupId: 'mg1', title: 'Bench Press', log: [] },
                        { id: 'ex2', muscleGroupId: 'mg1', title: 'Fly', log: [] }
                    ]
                }]
            })]);

            await repository.clearAll('mg1');

            const all = await repository.getByMuscleGroupId('mg1');
            expect(all).toEqual([]);
        });
    });

    describe('reorder', () => {
        it('should throw for unknown muscle group', async () => {
            await storage.saveAll([seedData()]);
            await expect(repository.reorder('unknown', 0, 1)).rejects.toThrow('Muscle group not found');
        });

        it('should reorder exercises within muscle group', async () => {
            await storage.saveAll([seedData({
                muscleGroup: [{
                    id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01',
                    exercises: [
                        { id: 'ex1', muscleGroupId: 'mg1', title: 'Bench Press', log: [] },
                        { id: 'ex2', muscleGroupId: 'mg1', title: 'Fly', log: [] },
                        { id: 'ex3', muscleGroupId: 'mg1', title: 'Cable Cross', log: [] }
                    ]
                }]
            })]);

            await repository.reorder('mg1', 0, 2);

            const all = await repository.getByMuscleGroupId('mg1');
            expect(all).toHaveLength(3);
            expect(all[0].id).toBe('ex2');
            expect(all[0].title).toBe('Fly');
            expect(all[1].id).toBe('ex3');
            expect(all[1].title).toBe('Cable Cross');
            expect(all[2].id).toBe('ex1');
            expect(all[2].title).toBe('Bench Press');
        });
    });
});
