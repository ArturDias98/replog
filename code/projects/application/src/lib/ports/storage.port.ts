import { WorkOutGroup } from '@replog/shared';

export abstract class StoragePort {
    abstract loadAll(): Promise<WorkOutGroup[]>;
    abstract saveAll(workouts: WorkOutGroup[]): Promise<void>;
    abstract restoreFromBackup(workouts: WorkOutGroup[]): void;
    abstract onDataChanged(callback: () => void): () => void;
}
