import { TestBed } from '@angular/core/testing';
import { StoragePort } from '@replog/application';
import { WorkoutRepositoryImpl } from '@replog/infrastructure';
import { WorkOutGroup } from '@replog/shared';
import { resetIndexedDB, configureTestBed } from './setup';

describe('WorkoutRepositoryImpl', () => {
    let repository: WorkoutRepositoryImpl;
    let storage: StoragePort;

    beforeEach(() => {
        resetIndexedDB();
        configureTestBed(WorkoutRepositoryImpl);
        repository = TestBed.inject(WorkoutRepositoryImpl);
        storage = TestBed.inject(StoragePort);
    });

    describe('getAll', () => {
        it('should return empty array when no data exists', async () => {
            const result = await repository.getAll();
            expect(result).toEqual([]);
        });

        it('should return all workouts with empty muscle groups', async () => {
            const workouts: WorkOutGroup[] = [
                { id: 'w1', title: 'Push', date: '2026-01-01', userId: 'u1', muscleGroup: [] },
                { id: 'w2', title: 'Pull', date: '2026-01-02', userId: 'u1', muscleGroup: [] }
            ];
            await storage.saveAll(workouts);

            const result = await repository.getAll();

            expect(result).toHaveLength(2);
            expect(result[0].id).toBe('w1');
            expect(result[0].title).toBe('Push');
            expect(result[0].date).toBe('2026-01-01');
            expect(result[0].userId).toBe('u1');
            expect(result[0].muscleGroup).toEqual([]);
            expect(result[1].id).toBe('w2');
            expect(result[1].title).toBe('Pull');
            expect(result[1].date).toBe('2026-01-02');
            expect(result[1].userId).toBe('u1');
            expect(result[1].muscleGroup).toEqual([]);
        });

        it('should return workouts with fully populated nested data', async () => {
            const workouts: WorkOutGroup[] = [{
                id: 'w1', title: 'Push', date: '2026-01-01', userId: 'u1',
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
            }];
            await storage.saveAll(workouts);

            const result = await repository.getAll();

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('w1');
            expect(result[0].muscleGroup).toHaveLength(1);

            const mg = result[0].muscleGroup[0];
            expect(mg.id).toBe('mg1');
            expect(mg.workoutId).toBe('w1');
            expect(mg.title).toBe('Chest');
            expect(mg.date).toBe('2026-01-01');
            expect(mg.exercises).toHaveLength(1);

            const ex = mg.exercises[0];
            expect(ex.id).toBe('ex1');
            expect(ex.muscleGroupId).toBe('mg1');
            expect(ex.title).toBe('Bench Press');
            expect(ex.log).toHaveLength(2);

            expect(ex.log[0].id).toBe('l1');
            expect(ex.log[0].numberReps).toBe(10);
            expect(ex.log[0].maxWeight).toBe(80);
            expect(ex.log[1].id).toBe('l2');
            expect(ex.log[1].numberReps).toBe(8);
            expect(ex.log[1].maxWeight).toBe(85);
        });
    });

    describe('getById', () => {
        it('should return undefined for unknown id', async () => {
            const result = await repository.getById('unknown');
            expect(result).toBeUndefined();
        });

        it('should find workout by id with empty nested data', async () => {
            await storage.saveAll([
                { id: 'w1', title: 'Push', date: '2026-01-01', userId: 'u1', muscleGroup: [] },
                { id: 'w2', title: 'Pull', date: '2026-01-02', userId: 'u1', muscleGroup: [] }
            ]);

            const result = await repository.getById('w2');

            expect(result).toBeDefined();
            expect(result!.id).toBe('w2');
            expect(result!.title).toBe('Pull');
            expect(result!.date).toBe('2026-01-02');
            expect(result!.userId).toBe('u1');
            expect(result!.muscleGroup).toEqual([]);
        });

        it('should find workout by id with full nested tree', async () => {
            await storage.saveAll([{
                id: 'w1', title: 'Push', date: '2026-01-01', userId: 'u1',
                muscleGroup: [{
                    id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01',
                    exercises: [{
                        id: 'ex1', muscleGroupId: 'mg1', title: 'Bench Press',
                        log: [{ id: 'l1', numberReps: 10, maxWeight: 80, date: new Date('2026-01-01') }]
                    }]
                }]
            }]);

            const result = await repository.getById('w1');

            expect(result).toBeDefined();
            expect(result!.id).toBe('w1');
            expect(result!.muscleGroup).toHaveLength(1);
            expect(result!.muscleGroup[0].id).toBe('mg1');
            expect(result!.muscleGroup[0].exercises).toHaveLength(1);
            expect(result!.muscleGroup[0].exercises[0].id).toBe('ex1');
            expect(result!.muscleGroup[0].exercises[0].log).toHaveLength(1);
            expect(result!.muscleGroup[0].exercises[0].log[0].id).toBe('l1');
            expect(result!.muscleGroup[0].exercises[0].log[0].numberReps).toBe(10);
            expect(result!.muscleGroup[0].exercises[0].log[0].maxWeight).toBe(80);
        });
    });

    describe('add', () => {
        it('should create a workout with correct properties', async () => {
            const result = await repository.add({ title: '  Push  ', date: '2026-01-01', userId: 'u1' });

            expect(result.id).toBeDefined();
            expect(result.title).toBe('Push');
            expect(result.date).toBe('2026-01-01');
            expect(result.userId).toBe('u1');
            expect(result.muscleGroup).toEqual([]);

            const all = await repository.getAll();
            expect(all).toHaveLength(1);
            expect(all[0].id).toBe(result.id);
            expect(all[0].title).toBe('Push');
            expect(all[0].date).toBe('2026-01-01');
            expect(all[0].userId).toBe('u1');
            expect(all[0].muscleGroup).toEqual([]);
        });

        it('should append to existing workouts', async () => {
            await storage.saveAll([
                { id: 'w1', title: 'Push', date: '2026-01-01', userId: 'u1', muscleGroup: [] }
            ]);

            const result = await repository.add({ title: 'Pull', date: '2026-01-02', userId: 'u1' });

            const all = await repository.getAll();
            expect(all).toHaveLength(2);
            expect(all[0].id).toBe('w1');
            expect(all[1].id).toBe(result.id);
            expect(all[1].title).toBe('Pull');
        });
    });

    describe('update', () => {
        it('should update title and date of existing workout', async () => {
            await storage.saveAll([
                { id: 'w1', title: 'Push', date: '2026-01-01', userId: 'u1', muscleGroup: [] }
            ]);

            await repository.update({ id: 'w1', title: '  Legs  ', date: '2026-02-01' });

            const result = await repository.getById('w1');
            expect(result).toBeDefined();
            expect(result!.id).toBe('w1');
            expect(result!.title).toBe('Legs');
            expect(result!.date).toBe('2026-02-01');
            expect(result!.userId).toBe('u1');
            expect(result!.muscleGroup).toEqual([]);
        });

        it('should not modify anything for unknown id', async () => {
            await storage.saveAll([
                { id: 'w1', title: 'Push', date: '2026-01-01', userId: 'u1', muscleGroup: [] }
            ]);

            await repository.update({ id: 'unknown', title: 'Changed', date: '2026-02-01' });

            const all = await repository.getAll();
            expect(all).toHaveLength(1);
            expect(all[0].title).toBe('Push');
            expect(all[0].date).toBe('2026-01-01');
        });

        it('should preserve nested data when updating', async () => {
            await storage.saveAll([{
                id: 'w1', title: 'Push', date: '2026-01-01', userId: 'u1',
                muscleGroup: [{
                    id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01',
                    exercises: [{ id: 'ex1', muscleGroupId: 'mg1', title: 'Bench Press', log: [] }]
                }]
            }]);

            await repository.update({ id: 'w1', title: 'Updated Push', date: '2026-03-01' });

            const result = await repository.getById('w1');
            expect(result!.title).toBe('Updated Push');
            expect(result!.date).toBe('2026-03-01');
            expect(result!.muscleGroup).toHaveLength(1);
            expect(result!.muscleGroup[0].id).toBe('mg1');
            expect(result!.muscleGroup[0].title).toBe('Chest');
            expect(result!.muscleGroup[0].exercises).toHaveLength(1);
            expect(result!.muscleGroup[0].exercises[0].id).toBe('ex1');
        });
    });

    describe('delete', () => {
        it('should remove workout by id', async () => {
            await storage.saveAll([
                { id: 'w1', title: 'Push', date: '2026-01-01', userId: 'u1', muscleGroup: [] },
                { id: 'w2', title: 'Pull', date: '2026-01-02', userId: 'u1', muscleGroup: [] }
            ]);

            await repository.delete('w1');

            const all = await repository.getAll();
            expect(all).toHaveLength(1);
            expect(all[0].id).toBe('w2');
            expect(all[0].title).toBe('Pull');
        });

        it('should leave other workouts untouched', async () => {
            await storage.saveAll([
                { id: 'w1', title: 'Push', date: '2026-01-01', userId: 'u1', muscleGroup: [] },
                { id: 'w2', title: 'Pull', date: '2026-01-02', userId: 'u2', muscleGroup: [] }
            ]);

            await repository.delete('w1');

            const remaining = await repository.getById('w2');
            expect(remaining).toBeDefined();
            expect(remaining!.id).toBe('w2');
            expect(remaining!.title).toBe('Pull');
            expect(remaining!.date).toBe('2026-01-02');
            expect(remaining!.userId).toBe('u2');
        });
    });

    describe('clearAll', () => {
        it('should remove all workouts', async () => {
            await storage.saveAll([
                { id: 'w1', title: 'Push', date: '2026-01-01', userId: 'u1', muscleGroup: [] },
                { id: 'w2', title: 'Pull', date: '2026-01-02', userId: 'u1', muscleGroup: [] }
            ]);

            await repository.clearAll();

            const all = await repository.getAll();
            expect(all).toEqual([]);
        });
    });

    describe('reorder', () => {
        it('should move workout from one index to another', async () => {
            await storage.saveAll([
                { id: 'w1', title: 'Push', date: '2026-01-01', userId: 'u1', muscleGroup: [] },
                { id: 'w2', title: 'Pull', date: '2026-01-02', userId: 'u1', muscleGroup: [] },
                { id: 'w3', title: 'Legs', date: '2026-01-03', userId: 'u1', muscleGroup: [] }
            ]);

            await repository.reorder(0, 2);

            const all = await repository.getAll();
            expect(all).toHaveLength(3);
            expect(all[0].id).toBe('w2');
            expect(all[0].title).toBe('Pull');
            expect(all[1].id).toBe('w3');
            expect(all[1].title).toBe('Legs');
            expect(all[2].id).toBe('w1');
            expect(all[2].title).toBe('Push');
        });

        it('should handle moving to the beginning', async () => {
            await storage.saveAll([
                { id: 'w1', title: 'Push', date: '2026-01-01', userId: 'u1', muscleGroup: [] },
                { id: 'w2', title: 'Pull', date: '2026-01-02', userId: 'u1', muscleGroup: [] },
                { id: 'w3', title: 'Legs', date: '2026-01-03', userId: 'u1', muscleGroup: [] }
            ]);

            await repository.reorder(2, 0);

            const all = await repository.getAll();
            expect(all).toHaveLength(3);
            expect(all[0].id).toBe('w3');
            expect(all[1].id).toBe('w1');
            expect(all[2].id).toBe('w2');
        });
    });
});
