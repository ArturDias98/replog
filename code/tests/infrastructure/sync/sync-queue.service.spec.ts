import { TestBed } from '@angular/core/testing';
import { SyncQueueServiceImpl } from '@replog/infrastructure';
import { WorkOutGroup } from '@replog/shared';
import { resetIndexedDB } from '../persistence/setup';

describe('SyncQueueServiceImpl', () => {
    let service: SyncQueueServiceImpl;

    beforeEach(() => {
        resetIndexedDB();
        TestBed.configureTestingModule({
            providers: [SyncQueueServiceImpl]
        });
        service = TestBed.inject(SyncQueueServiceImpl);
    });

    describe('recordChange', () => {
        it('should create a change with correct properties', async () => {
            const data = { id: 'w1', title: 'Push' };

            await service.recordChange('workout', 'CREATE', data);

            const changes = await service.getPendingChanges();
            expect(changes).toHaveLength(1);
            expect(changes[0].id).toBeDefined();
            expect(typeof changes[0].id).toBe('string');
            expect(changes[0].entityType).toBe('workout');
            expect(changes[0].action).toBe('CREATE');
            expect(changes[0].data).toEqual({ id: 'w1', title: 'Push' });
            expect(changes[0].timestamp).toBeDefined();
            expect(new Date(changes[0].timestamp).toISOString()).toBe(changes[0].timestamp);
        });

        it('should append multiple changes in FIFO order', async () => {
            await service.recordChange('workout', 'CREATE', { id: 'w1' });
            await service.recordChange('muscleGroup', 'UPDATE', { id: 'mg1' });
            await service.recordChange('exercise', 'DELETE', { id: 'ex1' });

            const changes = await service.getPendingChanges();
            expect(changes).toHaveLength(3);

            expect(changes[0].entityType).toBe('workout');
            expect(changes[0].action).toBe('CREATE');
            expect(changes[0].data).toEqual({ id: 'w1' });

            expect(changes[1].entityType).toBe('muscleGroup');
            expect(changes[1].action).toBe('UPDATE');
            expect(changes[1].data).toEqual({ id: 'mg1' });

            expect(changes[2].entityType).toBe('exercise');
            expect(changes[2].action).toBe('DELETE');
            expect(changes[2].data).toEqual({ id: 'ex1' });
        });

        it('should generate unique ids for each change', async () => {
            await service.recordChange('workout', 'CREATE', { id: 'w1' });
            await service.recordChange('workout', 'CREATE', { id: 'w2' });

            const changes = await service.getPendingChanges();
            expect(changes[0].id).not.toBe(changes[1].id);
        });
    });

    describe('getPendingChanges', () => {
        it('should return empty array when no changes exist', async () => {
            const changes = await service.getPendingChanges();
            expect(changes).toEqual([]);
        });

        it('should return changes in FIFO order', async () => {
            await service.recordChange('workout', 'CREATE', { step: 1 });
            await service.recordChange('muscleGroup', 'UPDATE', { step: 2 });
            await service.recordChange('exercise', 'DELETE', { step: 3 });
            await service.recordChange('log', 'CREATE', { step: 4 });
            await service.recordChange('workout', 'UPDATE', { step: 5 });

            const changes = await service.getPendingChanges();
            expect(changes).toHaveLength(5);

            expect(changes[0].entityType).toBe('workout');
            expect(changes[0].action).toBe('CREATE');
            expect(changes[0].data).toEqual({ step: 1 });

            expect(changes[1].entityType).toBe('muscleGroup');
            expect(changes[1].action).toBe('UPDATE');
            expect(changes[1].data).toEqual({ step: 2 });

            expect(changes[2].entityType).toBe('exercise');
            expect(changes[2].action).toBe('DELETE');
            expect(changes[2].data).toEqual({ step: 3 });

            expect(changes[3].entityType).toBe('log');
            expect(changes[3].action).toBe('CREATE');
            expect(changes[3].data).toEqual({ step: 4 });

            expect(changes[4].entityType).toBe('workout');
            expect(changes[4].action).toBe('UPDATE');
            expect(changes[4].data).toEqual({ step: 5 });
        });

        it('should return all recorded changes with correct properties', async () => {
            await service.recordChange('log', 'CREATE', { exerciseId: 'ex1', numberReps: 10, maxWeight: 80 });

            const changes = await service.getPendingChanges();
            expect(changes).toHaveLength(1);
            expect(changes[0].entityType).toBe('log');
            expect(changes[0].action).toBe('CREATE');
            expect(changes[0].data).toEqual({ exerciseId: 'ex1', numberReps: 10, maxWeight: 80 });
        });
    });

    describe('getPendingChangeCount', () => {
        it('should return 0 when empty', async () => {
            const count = await service.getPendingChangeCount();
            expect(count).toBe(0);
        });

        it('should return correct count after recording changes', async () => {
            await service.recordChange('workout', 'CREATE', { id: 'w1' });
            await service.recordChange('muscleGroup', 'CREATE', { id: 'mg1' });
            await service.recordChange('exercise', 'CREATE', { id: 'ex1' });

            const count = await service.getPendingChangeCount();
            expect(count).toBe(3);
        });
    });

    describe('removePendingChanges', () => {
        it('should remove specified changes and leave others in FIFO order', async () => {
            await service.recordChange('workout', 'CREATE', { id: 'w1' });
            await service.recordChange('muscleGroup', 'CREATE', { id: 'mg1' });
            await service.recordChange('exercise', 'CREATE', { id: 'ex1' });

            const allChanges = await service.getPendingChanges();
            expect(allChanges[0].entityType).toBe('workout');
            expect(allChanges[1].entityType).toBe('muscleGroup');
            expect(allChanges[2].entityType).toBe('exercise');

            await service.removePendingChanges([allChanges[0].id, allChanges[2].id]);

            const remaining = await service.getPendingChanges();
            expect(remaining).toHaveLength(1);
            expect(remaining[0].id).toBe(allChanges[1].id);
            expect(remaining[0].entityType).toBe('muscleGroup');
            expect(remaining[0].action).toBe('CREATE');
            expect(remaining[0].data).toEqual({ id: 'mg1' });
        });

        it('should handle empty array as no-op', async () => {
            await service.recordChange('workout', 'CREATE', { id: 'w1' });

            await service.removePendingChanges([]);

            const count = await service.getPendingChangeCount();
            expect(count).toBe(1);
        });
    });

    describe('getLastSyncedAt', () => {
        it('should return null when never set', async () => {
            const result = await service.getLastSyncedAt();
            expect(result).toBeNull();
        });

        it('should return the stored timestamp string', async () => {
            const timestamp = '2026-01-15T10:30:00.000Z';
            await service.setLastSyncedAt(timestamp);

            const result = await service.getLastSyncedAt();
            expect(result).toBe(timestamp);
        });
    });

    describe('setLastSyncedAt', () => {
        it('should store timestamp retrievable via getLastSyncedAt', async () => {
            const timestamp = '2026-03-08T12:00:00.000Z';

            await service.setLastSyncedAt(timestamp);

            const result = await service.getLastSyncedAt();
            expect(result).toBe(timestamp);
        });

        it('should overwrite previous value', async () => {
            await service.setLastSyncedAt('2026-01-01T00:00:00.000Z');
            await service.setLastSyncedAt('2026-06-15T18:30:00.000Z');

            const result = await service.getLastSyncedAt();
            expect(result).toBe('2026-06-15T18:30:00.000Z');
        });
    });

    describe('ensureInitialQueue', () => {
        const makeWorkouts = (): WorkOutGroup[] => [
            {
                id: 'w1',
                userId: 'u1',
                title: 'Push',
                date: '2026-03-01',
                muscleGroup: [
                    {
                        id: 'mg1',
                        workoutId: 'w1',
                        title: 'Chest',
                        date: '2026-03-01',
                        exercises: [
                            {
                                id: 'ex1',
                                muscleGroupId: 'mg1',
                                title: 'Bench Press',
                                log: [
                                    { id: 'l1', numberReps: 10, maxWeight: 80, date: new Date('2026-03-01') },
                                ],
                            },
                        ],
                    },
                ],
            },
        ];

        it('should not enqueue when lastSyncedAt is set', async () => {
            await service.setLastSyncedAt('2026-01-01T00:00:00.000Z');

            await service.ensureInitialQueue(makeWorkouts());

            const changes = await service.getPendingChanges();
            expect(changes).toEqual([]);
        });

        it('should not enqueue when pending changes exist', async () => {
            await service.recordChange('workout', 'CREATE', { id: 'existing' });

            await service.ensureInitialQueue(makeWorkouts());

            const changes = await service.getPendingChanges();
            expect(changes).toHaveLength(1);
            expect(changes[0].data).toEqual({ id: 'existing' });
        });

        it('should not enqueue when workouts array is empty', async () => {
            await service.ensureInitialQueue([]);

            const changes = await service.getPendingChanges();
            expect(changes).toEqual([]);
        });

        it('should enqueue all entities in FIFO order', async () => {
            await service.ensureInitialQueue(makeWorkouts());

            const changes = await service.getPendingChanges();
            expect(changes).toHaveLength(4);

            expect(changes[0].entityType).toBe('workout');
            expect(changes[0].action).toBe('CREATE');
            expect(changes[0].data).toEqual({
                id: 'w1', userId: 'u1', title: 'Push', date: '2026-03-01', orderIndex: 0,
            });

            expect(changes[1].entityType).toBe('muscleGroup');
            expect(changes[1].action).toBe('CREATE');
            expect(changes[1].data).toEqual({
                id: 'mg1', workoutId: 'w1', title: 'Chest', date: '2026-03-01', orderIndex: 0,
            });

            expect(changes[2].entityType).toBe('exercise');
            expect(changes[2].action).toBe('CREATE');
            expect(changes[2].data).toEqual({
                id: 'ex1', workoutId: 'w1', muscleGroupId: 'mg1', title: 'Bench Press', orderIndex: 0,
            });

            expect(changes[3].entityType).toBe('log');
            expect(changes[3].action).toBe('CREATE');
            expect(changes[3].data).toEqual({
                id: 'l1', workoutId: 'w1', muscleGroupId: 'mg1', exerciseId: 'ex1',
                numberReps: 10, maxWeight: 80, date: '2026-03-01',
            });
        });

        it('should handle workouts with empty nested arrays', async () => {
            const workouts: WorkOutGroup[] = [
                { id: 'w1', userId: 'u1', title: 'Rest Day', date: '2026-03-02', muscleGroup: [] },
            ];

            await service.ensureInitialQueue(workouts);

            const changes = await service.getPendingChanges();
            expect(changes).toHaveLength(1);
            expect(changes[0].entityType).toBe('workout');
            expect(changes[0].data).toEqual({
                id: 'w1', userId: 'u1', title: 'Rest Day', date: '2026-03-02', orderIndex: 0,
            });
        });

        it('should enqueue multiple workouts with correct orderIndex', async () => {
            const workouts: WorkOutGroup[] = [
                {
                    id: 'w1', userId: 'u1', title: 'Push', date: '2026-03-01',
                    muscleGroup: [],
                },
                {
                    id: 'w2', userId: 'u1', title: 'Pull', date: '2026-03-02',
                    muscleGroup: [
                        {
                            id: 'mg1', workoutId: 'w2', title: 'Back', date: '2026-03-02',
                            exercises: [],
                        },
                    ],
                },
            ];

            await service.ensureInitialQueue(workouts);

            const changes = await service.getPendingChanges();
            expect(changes).toHaveLength(3);

            expect(changes[0].entityType).toBe('workout');
            expect(changes[0].data).toEqual({
                id: 'w1', userId: 'u1', title: 'Push', date: '2026-03-01', orderIndex: 0,
            });

            expect(changes[1].entityType).toBe('workout');
            expect(changes[1].data).toEqual({
                id: 'w2', userId: 'u1', title: 'Pull', date: '2026-03-02', orderIndex: 1,
            });

            expect(changes[2].entityType).toBe('muscleGroup');
            expect(changes[2].data).toEqual({
                id: 'mg1', workoutId: 'w2', title: 'Back', date: '2026-03-02', orderIndex: 0,
            });
        });
    });

    describe('clearAll', () => {
        it('should clear both sync_queue and sync_meta stores', async () => {
            await service.recordChange('workout', 'CREATE', { id: 'w1' });
            await service.recordChange('muscleGroup', 'UPDATE', { id: 'mg1' });
            await service.setLastSyncedAt('2026-01-01T00:00:00.000Z');

            await service.clearAll();

            const changes = await service.getPendingChanges();
            expect(changes).toEqual([]);

            const count = await service.getPendingChangeCount();
            expect(count).toBe(0);

            const lastSyncedAt = await service.getLastSyncedAt();
            expect(lastSyncedAt).toBeNull();
        });
    });
});
