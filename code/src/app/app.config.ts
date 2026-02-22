import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideTransloco } from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import { registerLocaleData } from '@angular/common';
import localePtBr from '@angular/common/locales/pt';

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
        provideTranslocoMessageformat(),
    ]
};
