import { AddLogModel, UpdateLogModel } from '@replog/shared';

export abstract class LogRepository {
    abstract add(model: AddLogModel): Promise<string>;
    abstract update(model: UpdateLogModel): Promise<void>;
    abstract delete(exerciseId: string, logId: string): Promise<void>;
    abstract clearAll(exerciseId: string): Promise<void>;
}
