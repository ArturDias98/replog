import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { provideTransloco } from '@jsverse/transloco';
import { registerLocaleData } from '@angular/common';
import localePtBr from '@angular/common/locales/pt';
import { Capacitor } from '@capacitor/core';

import { routes } from './app.routes';
import { TranslocoHttpLoader } from './transloco-loader';

registerLocaleData(localePtBr, 'pt-BR');

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
    ]
};
