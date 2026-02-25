import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { StorageService } from './storage.service';
import { WorkOutGroup } from '../models/workout-group';

export type ExportResult =
    | { status: 'success' }
    | { status: 'empty' }
    | { status: 'error'; message: string };

export type ImportResult =
    | { status: 'success'; count: number }
    | { status: 'all_duplicates' }
    | { status: 'invalid_file' }
    | { status: 'error'; message: string };

@Injectable({ providedIn: 'root' })
export class ExportImportService {
    private readonly storage = inject(StorageService);

    async exportWorkouts(): Promise<ExportResult> {
        const workouts = await this.storage.loadFromStorage();

        if (workouts.length === 0) {
            return { status: 'empty' };
        }

        try {
            const jsonString = JSON.stringify(workouts, null, 2);
            const fileName = this.generateFileName();

            if (Capacitor.isNativePlatform()) {
                await this.shareViaNative(jsonString, fileName);
            } else {
                this.downloadViaAnchor(jsonString, fileName);
            }

            return { status: 'success' };
        } catch (error) {
            return {
                status: 'error',
                message: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }

    async importWorkouts(file: File): Promise<ImportResult> {
        try {
            const text = await file.text();
            const parsed: unknown = JSON.parse(text);

            if (!Array.isArray(parsed)) {
                return { status: 'invalid_file' };
            }

            if (!parsed.every((item) => this.isValidWorkoutGroup(item))) {
                return { status: 'invalid_file' };
            }

            const importedWorkouts = parsed as WorkOutGroup[];
            const currentWorkouts = await this.storage.loadFromStorage();
            const existingIds = new Set(currentWorkouts.map((w) => w.id));

            const newWorkouts = importedWorkouts.filter((w) => !existingIds.has(w.id));

            if (newWorkouts.length === 0) {
                return { status: 'all_duplicates' };
            }

            await this.storage.saveToStorage([...currentWorkouts, ...newWorkouts]);

            return { status: 'success', count: newWorkouts.length };
        } catch {
            return { status: 'invalid_file' };
        }
    }

    private async shareViaNative(jsonString: string, fileName: string): Promise<void> {
        const writeResult = await Filesystem.writeFile({
            path: fileName,
            data: jsonString,
            directory: Directory.Cache,
            encoding: Encoding.UTF8,
        });

        await Share.share({
            files: [writeResult.uri],
            dialogTitle: 'RepLog Backup',
        });
    }

    private downloadViaAnchor(jsonString: string, fileName: string): void {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        setTimeout(() => {
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
        }, 100);
    }

    private generateFileName(): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `replog-backup-${year}-${month}-${day}.json`;
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
