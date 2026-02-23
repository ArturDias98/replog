import { Injectable, inject } from '@angular/core';
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

    prepareExportFile(): File | null {
        const workouts = this.storage.loadFromStorage();

        if (workouts.length === 0) {
            return null;
        }

        const jsonString = JSON.stringify(workouts, null, 2);
        const fileName = this.generateFileName();
        return new File([jsonString], fileName, { type: 'application/json' });
    }

    canUseWebShare(file: File): boolean {
        return (
            typeof navigator.share === 'function' &&
            typeof navigator.canShare === 'function' &&
            navigator.canShare({ files: [file] })
        );
    }

    downloadFile(file: File): void {
        const url = URL.createObjectURL(file);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = file.name;
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        setTimeout(() => {
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
        }, 100);
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
            const currentWorkouts = this.storage.loadFromStorage();
            const existingIds = new Set(currentWorkouts.map((w) => w.id));

            const newWorkouts = importedWorkouts.filter((w) => !existingIds.has(w.id));

            if (newWorkouts.length === 0) {
                return { status: 'all_duplicates' };
            }

            this.storage.saveToStorage([...currentWorkouts, ...newWorkouts]);

            return { status: 'success', count: newWorkouts.length };
        } catch {
            return { status: 'invalid_file' };
        }
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
