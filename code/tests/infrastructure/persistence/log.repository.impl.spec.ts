import { TestBed } from '@angular/core/testing';
import { StoragePort } from '@replog/application';
import { LogRepositoryImpl } from '@replog/infrastructure';
import { WorkOutGroup } from '@replog/shared';
import { resetIndexedDB, configureTestBed } from './setup';

describe('LogRepositoryImpl', () => {
    let repository: LogRepositoryImpl;
    let storage: StoragePort;

    beforeEach(() => {
        resetIndexedDB();
        configureTestBed(LogRepositoryImpl);
        repository = TestBed.inject(LogRepositoryImpl);
        storage = TestBed.inject(StoragePort);
    });

    function seedData(): WorkOutGroup {
        return {
            id: 'w1', title: 'Push', date: '2026-01-01', userId: 'u1',
            muscleGroup: [{
                id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-01-01',
                exercises: [
                    {
                        id: 'ex1', muscleGroupId: 'mg1', title: 'Bench Press',
                        log: [
                            { id: 'l1', numberReps: 10, maxWeight: 80, date: new Date('2026-01-01') },
                            { id: 'l2', numberReps: 8, maxWeight: 85, date: new Date('2026-01-02') }
                        ]
                    },
                    {
                        id: 'ex2', muscleGroupId: 'mg1', title: 'Fly',
                        log: [
                            { id: 'l3', numberReps: 12, maxWeight: 20, date: new Date('2026-01-01') }
                        ]
                    }
                ]
            }]
        };
    }

    describe('add', () => {
        it('should throw for unknown exercise', async () => {
            await storage.saveAll([seedData()]);
            await expect(repository.add({
                exerciseId: 'unknown', numberReps: 10, maxWeight: 80, date: new Date('2026-01-01')
            })).rejects.toThrow('Exercise not found');
        });

        it('should create log and return its id', async () => {
            await storage.saveAll([seedData()]);

            const logDate = new Date('2026-02-01');
            const logId = await repository.add({
                exerciseId: 'ex1', numberReps: 12, maxWeight: 90, date: logDate
            });

            expect(logId).toBeDefined();
            expect(typeof logId).toBe('string');

            // Verify persisted log
            const workouts = await storage.loadAll();
            const exercise = workouts[0].muscleGroup[0].exercises[0];
            const newLog = exercise.log.find(l => l.id === logId);

            expect(newLog).toBeDefined();
            expect(newLog!.id).toBe(logId);
            expect(newLog!.numberReps).toBe(12);
            expect(newLog!.maxWeight).toBe(90);
            expect(new Date(newLog!.date).toISOString()).toBe(logDate.toISOString());
        });

        it('should append to existing logs', async () => {
            await storage.saveAll([seedData()]);

            await repository.add({
                exerciseId: 'ex1', numberReps: 6, maxWeight: 100, date: new Date('2026-03-01')
            });

            const workouts = await storage.loadAll();
            const exercise = workouts[0].muscleGroup[0].exercises[0];
            expect(exercise.log).toHaveLength(3);
            expect(exercise.log[0].id).toBe('l1');
            expect(exercise.log[1].id).toBe('l2');
            expect(exercise.log[2].numberReps).toBe(6);
            expect(exercise.log[2].maxWeight).toBe(100);
        });
    });

    describe('update', () => {
        it('should throw for unknown exercise', async () => {
            await storage.saveAll([seedData()]);
            await expect(repository.update({
                exerciseId: 'unknown', logId: 'l1', numberReps: 12, maxWeight: 90
            })).rejects.toThrow('Exercise not found');
        });

        it('should throw for unknown log', async () => {
            await storage.saveAll([seedData()]);
            await expect(repository.update({
                exerciseId: 'ex1', logId: 'unknown', numberReps: 12, maxWeight: 90
            })).rejects.toThrow('Log not found');
        });

        it('should update numberReps and maxWeight while preserving id and date', async () => {
            await storage.saveAll([seedData()]);

            await repository.update({
                exerciseId: 'ex1', logId: 'l1', numberReps: 15, maxWeight: 95
            });

            const workouts = await storage.loadAll();
            const log = workouts[0].muscleGroup[0].exercises[0].log[0];

            expect(log.id).toBe('l1');
            expect(log.numberReps).toBe(15);
            expect(log.maxWeight).toBe(95);
            expect(new Date(log.date).toISOString()).toBe(new Date('2026-01-01').toISOString());
        });

        it('should not affect other logs', async () => {
            await storage.saveAll([seedData()]);

            await repository.update({
                exerciseId: 'ex1', logId: 'l1', numberReps: 15, maxWeight: 95
            });

            const workouts = await storage.loadAll();
            const logs = workouts[0].muscleGroup[0].exercises[0].log;

            expect(logs[1].id).toBe('l2');
            expect(logs[1].numberReps).toBe(8);
            expect(logs[1].maxWeight).toBe(85);
        });
    });

    describe('delete', () => {
        it('should throw for unknown exercise', async () => {
            await storage.saveAll([seedData()]);
            await expect(repository.delete('unknown', 'l1')).rejects.toThrow('Exercise not found');
        });

        it('should remove log and leave sibling logs untouched', async () => {
            await storage.saveAll([seedData()]);

            await repository.delete('ex1', 'l1');

            const workouts = await storage.loadAll();
            const logs = workouts[0].muscleGroup[0].exercises[0].log;

            expect(logs).toHaveLength(1);
            expect(logs[0].id).toBe('l2');
            expect(logs[0].numberReps).toBe(8);
            expect(logs[0].maxWeight).toBe(85);
        });

        it('should not affect logs of other exercises', async () => {
            await storage.saveAll([seedData()]);

            await repository.delete('ex1', 'l1');

            const workouts = await storage.loadAll();
            const otherExerciseLogs = workouts[0].muscleGroup[0].exercises[1].log;

            expect(otherExerciseLogs).toHaveLength(1);
            expect(otherExerciseLogs[0].id).toBe('l3');
            expect(otherExerciseLogs[0].numberReps).toBe(12);
            expect(otherExerciseLogs[0].maxWeight).toBe(20);
        });
    });

    describe('clearAll', () => {
        it('should throw for unknown exercise', async () => {
            await storage.saveAll([seedData()]);
            await expect(repository.clearAll('unknown')).rejects.toThrow('Exercise not found');
        });

        it('should empty all logs for exercise', async () => {
            await storage.saveAll([seedData()]);

            await repository.clearAll('ex1');

            const workouts = await storage.loadAll();
            const exercise = workouts[0].muscleGroup[0].exercises[0];

            expect(exercise.log).toEqual([]);
        });

        it('should not affect logs of other exercises', async () => {
            await storage.saveAll([seedData()]);

            await repository.clearAll('ex1');

            const workouts = await storage.loadAll();
            const otherExercise = workouts[0].muscleGroup[0].exercises[1];

            expect(otherExercise.log).toHaveLength(1);
            expect(otherExercise.log[0].id).toBe('l3');
            expect(otherExercise.log[0].numberReps).toBe(12);
            expect(otherExercise.log[0].maxWeight).toBe(20);
        });
    });
});
