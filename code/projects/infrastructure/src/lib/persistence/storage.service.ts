import { Injectable, inject } from '@angular/core';
import { WorkOutGroup } from '@replog/shared';
import { StoragePort, BackupPort } from '@replog/application';
import { getDb, DATA_RECORD_KEY } from './db';

const LEGACY_STORAGE_KEY = 'replog_workouts';

@Injectable()
export class StorageServiceImpl extends StoragePort {
    private readonly backupService = inject(BackupPort);
    private migrated = false;
    private dataChangedCallbacks: (() => void)[] = [];

    onDataChanged(callback: () => void): () => void {
        this.dataChangedCallbacks.push(callback);
        return () => {
            this.dataChangedCallbacks = this.dataChangedCallbacks.filter(cb => cb !== callback);
        };
    }

    async loadAll(): Promise<WorkOutGroup[]> {
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

    async saveAll(workouts: WorkOutGroup[]): Promise<void> {
        try {
            const db = await getDb();
            await db.put('data', { id: DATA_RECORD_KEY, workouts });
            await this.backupService.backup(workouts);
            this.dataChangedCallbacks.forEach(cb => cb());
        } catch (error) {
            console.error('Error saving to IndexedDB:', error);
        }
    }

    restoreFromBackup(workouts: WorkOutGroup[]): void {
        try {
            localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(workouts));
        } catch (error) {
            console.error('Error restoring to local storage:', error);
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
}
