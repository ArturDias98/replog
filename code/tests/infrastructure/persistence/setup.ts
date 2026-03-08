import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { TestBed } from '@angular/core/testing';
import { StoragePort, BackupPort } from '@replog/application';
import { StorageServiceImpl, resetDb } from '@replog/infrastructure';
import { Type } from '@angular/core';

export function resetIndexedDB(): void {
    globalThis.indexedDB = new IDBFactory();
    resetDb();
}

export function configureTestBed(...repositories: Type<unknown>[]): void {
    TestBed.configureTestingModule({
        providers: [
            { provide: StoragePort, useClass: StorageServiceImpl },
            { provide: BackupPort, useValue: { backup: () => Promise.resolve() } },
            ...repositories
        ]
    });
}
