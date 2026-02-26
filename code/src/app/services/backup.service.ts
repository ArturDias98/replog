import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { WorkOutGroup } from '../models/workout-group';

@Injectable({ providedIn: 'root' })
export class BackupService {
    private readonly BACKUP_PATH = 'replog-backup.json';
    private readonly BACKUP_DIRECTORY = Directory.Data;

    private writeQueue: Promise<void> = Promise.resolve();

    async backup(workouts: WorkOutGroup[]): Promise<void> {
        if (!Capacitor.isNativePlatform()) return;

        this.writeQueue = this.writeQueue
            .then(() => this.performWrite(workouts))
            .catch((err) => console.warn('Backup write failed:', err));
    }

    async restore(): Promise<WorkOutGroup[] | null> {
        if (!Capacitor.isNativePlatform()) return null;

        try {
            const result = await Filesystem.readFile({
                path: this.BACKUP_PATH,
                directory: this.BACKUP_DIRECTORY,
                encoding: Encoding.UTF8,
            });

            const data = typeof result.data === 'string' ? result.data : await result.data.text();
            const parsed: unknown = JSON.parse(data);

            if (!Array.isArray(parsed)) return null;
            if (!parsed.every((item) => this.isValidWorkoutGroup(item))) return null;

            return parsed as WorkOutGroup[];
        } catch {
            return null;
        }
    }

    private async performWrite(workouts: WorkOutGroup[]): Promise<void> {
        await Filesystem.writeFile({
            path: this.BACKUP_PATH,
            data: JSON.stringify(workouts),
            directory: this.BACKUP_DIRECTORY,
            encoding: Encoding.UTF8,
        });
    }

    private isValidWorkoutGroup(item: unknown): item is WorkOutGroup {
        if (typeof item !== 'object' || item === null) return false;
        const obj = item as Record<string, unknown>;
        return (
            typeof obj['id'] === 'string' &&
            typeof obj['title'] === 'string' &&
            typeof obj['date'] === 'string' &&
            Array.isArray(obj['muscleGroup'])
        );
    }
}
