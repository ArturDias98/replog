import { WorkOutGroup } from '@replog/shared';

export abstract class BackupPort {
    abstract backup(workouts: WorkOutGroup[]): Promise<void>;
    abstract restore(): Promise<WorkOutGroup[] | null>;
    abstract checkBackupExists(): Promise<string | null>;
}
