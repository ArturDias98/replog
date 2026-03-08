import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode, APP_INITIALIZER, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTransloco } from '@jsverse/transloco';
import { registerLocaleData } from '@angular/common';
import localePtBr from '@angular/common/locales/pt';
import { Capacitor } from '@capacitor/core';

import { routes } from './app.routes';
import { TranslocoHttpLoader } from './transloco-loader';

import {
    StoragePort,
    WorkoutRepository,
    MuscleGroupRepository,
    ExerciseRepository,
    LogRepository,
    SyncQueuePort,
    SyncApiPort,
    BackupPort,
    ExportImportPort,
} from '@replog/application';

import {
    StorageServiceImpl,
    WorkoutRepositoryImpl,
    MuscleGroupRepositoryImpl,
    ExerciseRepositoryImpl,
    LogRepositoryImpl,
    SyncQueueServiceImpl,
    SyncApiServiceImpl,
    BackupServiceImpl,
    ExportImportServiceImpl,
} from '@replog/infrastructure';

import { AuthPort, AuthServiceImpl, authInterceptor } from './auth';
import { UserPreferencesPort, UserPreferencesServiceImpl } from './preferences';

registerLocaleData(localePtBr, 'pt-BR');

function restoreBackupInitializer(): () => Promise<void> {
    const storagePort = inject(StoragePort);
    const backupPort = inject(BackupPort);

    return async () => {
        try {
            const existingData = await storagePort.loadAll();
            if (existingData.length > 0) return;

            const backupData = await backupPort.restore();
            if (backupData && backupData.length > 0) {
                storagePort.restoreFromBackup(backupData);
            }
        } catch {
            console.warn('Backup restore during init failed');
        }
    };
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideTransloco({
            config: {
                availableLangs: ['en', 'pt-BR'],
                defaultLang: 'en',
                reRenderOnLangChange: true,
                prodMode: !isDevMode(),
            },
            loader: TranslocoHttpLoader,
        }),
        provideServiceWorker('ngsw-worker.js', {
            enabled: !isDevMode() && !Capacitor.isNativePlatform(),
            registrationStrategy: 'registerWhenStable:30000',
        }),
        { provide: StoragePort, useClass: StorageServiceImpl },
        { provide: WorkoutRepository, useClass: WorkoutRepositoryImpl },
        { provide: MuscleGroupRepository, useClass: MuscleGroupRepositoryImpl },
        { provide: ExerciseRepository, useClass: ExerciseRepositoryImpl },
        { provide: LogRepository, useClass: LogRepositoryImpl },
        { provide: SyncQueuePort, useClass: SyncQueueServiceImpl },
        { provide: SyncApiPort, useClass: SyncApiServiceImpl },
        { provide: AuthPort, useClass: AuthServiceImpl },
        { provide: BackupPort, useClass: BackupServiceImpl },
        { provide: UserPreferencesPort, useClass: UserPreferencesServiceImpl },
        { provide: ExportImportPort, useClass: ExportImportServiceImpl },
        {
            provide: APP_INITIALIZER,
            useFactory: restoreBackupInitializer,
            multi: true,
        },
    ],
};
