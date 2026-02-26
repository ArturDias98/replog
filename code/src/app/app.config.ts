import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode, APP_INITIALIZER, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTransloco } from '@jsverse/transloco';
import { registerLocaleData } from '@angular/common';
import localePtBr from '@angular/common/locales/pt';
import { Capacitor } from '@capacitor/core';

import { routes } from './app.routes';
import { TranslocoHttpLoader } from './transloco-loader';
import { StorageService } from './services/storage.service';
import { BackupService } from './services/backup.service';

registerLocaleData(localePtBr, 'pt-BR');

function restoreBackupInitializer(): () => Promise<void> {
    const storageService = inject(StorageService);
    const backupService = inject(BackupService);

    return async () => {
        try {
            const existingData = storageService.loadFromStorage();
            if (existingData.length > 0) return;

            const backupData = await backupService.restore();
            if (backupData && backupData.length > 0) {
                storageService.restoreToStorage(backupData);
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
        provideHttpClient(),
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
        {
            provide: APP_INITIALIZER,
            useFactory: restoreBackupInitializer,
            multi: true,
        },
    ],
};
