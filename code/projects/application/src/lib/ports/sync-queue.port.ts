import { SyncChange, SyncEntityType, SyncAction, WorkOutGroup } from '@replog/shared';

export abstract class SyncQueuePort {
    abstract recordChange(entityType: SyncEntityType, action: SyncAction, data: Record<string, unknown>): Promise<void>;
    abstract getPendingChanges(): Promise<SyncChange[]>;
    abstract getPendingChangeCount(): Promise<number>;
    abstract removePendingChanges(changeIds: string[]): Promise<void>;
    abstract getLastSyncedAt(): Promise<string | null>;
    abstract setLastSyncedAt(timestamp: string): Promise<void>;
    abstract ensureInitialQueue(workouts: WorkOutGroup[]): Promise<void>;
    abstract clearAll(): Promise<void>;
}
