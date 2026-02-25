import { Injectable, inject } from '@angular/core';
import { WorkOutGroup } from '../models/workout-group';
import { BackupService } from './backup.service';
import { getDb, DATA_RECORD_KEY } from './db';

const LEGACY_STORAGE_KEY = 'replog_workouts';

@Injectable({
    providedIn: 'root',
})
export class StorageService {
    private readonly STORAGE_KEY = 'replog_workouts';
    private readonly backupService = inject(BackupService);
    private migrated = false;

    async loadFromStorage(): Promise<WorkOutGroup[]> {
        await this.ensureMigrated();
        try {
            const db = await getDb();
            const record = await db.get('data', DATA_RECORD_KEY);
            return record?.workouts ?? [];
        } catch (error) {
            console.error('Error loading from IndexedDB:', error);
            return [];
        }
    }

    async saveToStorage(workouts: WorkOutGroup[]): Promise<void> {
        try {
            const db = await getDb();
            await db.put('data', { id: DATA_RECORD_KEY, workouts });
            await this.backupService.backup(workouts);
        } catch (error) {
            console.error('Error saving to IndexedDB:', error);
        }
    }

    private async ensureMigrated(): Promise<void> {
        if (this.migrated) return;
        this.migrated = true;

        try {
            const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
            if (!raw) return;

            const workouts: WorkOutGroup[] = JSON.parse(raw);
            if (!Array.isArray(workouts) || workouts.length === 0) return;

            const db = await getDb();
            const existing = await db.get('data', DATA_RECORD_KEY);
            if (existing && existing.workouts.length > 0) {
                localStorage.removeItem(LEGACY_STORAGE_KEY);
                return;
            }

            await db.put('data', { id: DATA_RECORD_KEY, workouts });
            localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch (error) {
            console.error('Error during localStorage to IndexedDB migration:', error);
            this.migrated = false;
        }
    }

    restoreToStorage(workouts: WorkOutGroup[]): void {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(workouts));
        } catch (error) {
            console.error('Error restoring to local storage:', error);
        }
    }
}
