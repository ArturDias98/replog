import { Injectable, inject } from '@angular/core';
import { AuthUser } from '../models/auth';
import { StorageService } from './storage.service';
import { environment } from '../../environments/environment';

declare const google: {
    accounts: {
        id: {
            initialize(config: {
                client_id: string;
                callback: (response: { credential: string }) => void;
                auto_select?: boolean;
            }): void;
            renderButton(
                parent: HTMLElement,
                options: {
                    type?: 'standard' | 'icon';
                    theme?: 'outline' | 'filled_blue' | 'filled_black';
                    size?: 'large' | 'medium' | 'small';
                    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
                    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
                    width?: number;
                }
            ): void;
            prompt(callback?: (notification: {
                isNotDisplayed(): boolean;
                isSkippedMoment(): boolean;
                isDismissedMoment(): boolean;
            }) => void): void;
            revoke(hint: string, callback?: () => void): void;
            disableAutoSelect(): void;
        };
    };
};

const STORAGE_KEY = 'replog_auth_user';
const TOKEN_STORAGE_KEY = 'replog_auth_token';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private static readonly TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;
    private static readonly REFRESH_TIMEOUT_MS = 10_000;

    private readonly storage = inject(StorageService);
    private initialized = false;
    private onAuthChangeCallback: ((user: AuthUser | null) => void) | null = null;
    private refreshPromise: Promise<string | null> | null = null;
    private onCredentialRefreshResolve: ((credential: string | null) => void) | null = null;

    private readonly gisReady = new Promise<void>((resolve) => {
        if (typeof google !== 'undefined' && google.accounts) {
            resolve();
            return;
        }
        const interval = setInterval(() => {
            if (typeof google !== 'undefined' && google.accounts) {
                clearInterval(interval);
                resolve();
            }
        }, 50);
    });

    async initialize(): Promise<void> {
        if (this.initialized) return;
        this.initialized = true;

        await this.gisReady;

        google.accounts.id.initialize({
            client_id: environment.googleClientId,
            callback: (response) => this.handleCredentialResponse(response),
            auto_select: true,
        });
    }

    async renderButton(container: HTMLElement): Promise<void> {
        await this.gisReady;

        google.accounts.id.renderButton(container, {
            type: 'standard',
            theme: 'outline',
            size: 'medium',
            text: 'signin',
            shape: 'pill',
        });
    }

    onUserChange(callback: (user: AuthUser | null) => void): void {
        this.onAuthChangeCallback = callback;
    }

    getUser(): AuthUser | null {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return null;
            return JSON.parse(raw) as AuthUser;
        } catch {
            return null;
        }
    }

    getIdToken(): string | null {
        return localStorage.getItem(TOKEN_STORAGE_KEY);
    }

    isAuthenticated(): boolean {
        return this.getUser() !== null && this.getIdToken() !== null && !this.isTokenExpired();
    }

    isTokenExpired(): boolean {
        const token = this.getIdToken();
        if (!token) return true;

        const expMs = this.getTokenExpiration(token);
        if (expMs === null) return true;

        return Date.now() >= expMs - AuthService.TOKEN_EXPIRY_BUFFER_MS;
    }

    async refreshToken(): Promise<string | null> {
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = this.attemptSilentRefresh().finally(() => {
            this.refreshPromise = null;
        });

        return this.refreshPromise;
    }

    signOut(): void {
        const user = this.getUser();
        if (user) {
            try {
                google.accounts.id.disableAutoSelect();
                google.accounts.id.revoke(user.email);
            } catch {
                // GIS may not be loaded (offline)
            }
        }
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        this.onAuthChangeCallback?.(null);
    }

    async migrateTemporaryUserIds(googleUserId: string): Promise<void> {
        const workouts = await this.storage.loadFromStorage();
        let changed = false;

        for (const workout of workouts) {
            if (workout.userId.startsWith('temp-user-')) {
                workout.userId = googleUserId;
                changed = true;
            }
        }

        if (changed) {
            await this.storage.saveToStorage(workouts);
        }
    }

    private getTokenExpiration(token: string): number | null {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
        } catch {
            return null;
        }
    }

    private attemptSilentRefresh(): Promise<string | null> {
        return new Promise<string | null>((resolve) => {
            const timeout = setTimeout(() => {
                this.onCredentialRefreshResolve = null;
                resolve(null);
            }, AuthService.REFRESH_TIMEOUT_MS);

            this.onCredentialRefreshResolve = (credential: string | null) => {
                clearTimeout(timeout);
                this.onCredentialRefreshResolve = null;
                resolve(credential);
            };

            try {
                google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment() || notification.isDismissedMoment()) {
                        clearTimeout(timeout);
                        this.onCredentialRefreshResolve = null;
                        resolve(null);
                    }
                });
            } catch {
                clearTimeout(timeout);
                this.onCredentialRefreshResolve = null;
                resolve(null);
            }
        });
    }

    private async handleCredentialResponse(response: { credential: string }): Promise<void> {
        try {
            const payload = JSON.parse(atob(response.credential.split('.')[1]));

            const user: AuthUser = {
                id: payload.sub,
                name: payload.name,
                email: payload.email,
                picture: payload.picture,
            };

            localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
            localStorage.setItem(TOKEN_STORAGE_KEY, response.credential);
            await this.migrateTemporaryUserIds(user.id);

            this.onAuthChangeCallback?.(user);
            this.onCredentialRefreshResolve?.(response.credential);
        } catch (error) {
            console.error('Google sign-in failed:', error);
            this.onCredentialRefreshResolve?.(null);
        }
    }
}
