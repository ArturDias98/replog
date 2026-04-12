import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthUser, AuthCredentials, LoginResponse, RefreshResponse } from '@replog/shared';
import { StoragePort } from '@replog/application';
import { AuthPort } from './auth.port';
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
            revoke(hint: string, callback?: () => void): void;
            disableAutoSelect(): void;
        };
    };
};

const STORAGE_KEY = 'replog_auth_user';
const TOKEN_EXPIRY_BUFFER_MS = 60 * 1000;

@Injectable()
export class AuthServiceImpl extends AuthPort {
    private readonly http = inject(HttpClient);
    private readonly storage = inject(StoragePort);
    private initialized = false;
    private onAuthChangeCallback: ((user: AuthUser | null) => void) | null = null;
    private refreshPromise: Promise<boolean> | null = null;
    private credentials: AuthCredentials | null = null;

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

    getCredentials(): AuthCredentials | null {
        return this.credentials;
    }

    isAuthenticated(): boolean {
        return this.getUser() !== null && this.getCredentials() !== null && !this.isTokenExpired();
    }

    isTokenExpired(): boolean {
        const credentials = this.getCredentials();
        if (!credentials) return true;

        const expiresAtMs = new Date(credentials.expiresAt).getTime();
        return Date.now() >= expiresAtMs - TOKEN_EXPIRY_BUFFER_MS;
    }

    async ensureValidToken(): Promise<boolean> {
        const credentials = this.getCredentials();

        if (credentials) {
            const expiresAtMs = new Date(credentials.expiresAt).getTime();
            if (Date.now() < expiresAtMs - TOKEN_EXPIRY_BUFFER_MS) {
                return true;
            }
        } else if (!this.getUser()) {
            return false;
        }

        if (this.refreshPromise) return this.refreshPromise;

        this.refreshPromise = this.performRefresh();
        try {
            return await this.refreshPromise;
        } finally {
            this.refreshPromise = null;
        }
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
        this.http.post(`${environment.apiBaseUrl}/api/auth/logout`, {}).subscribe({ error: () => {} });
        this.credentials = null;
        localStorage.removeItem(STORAGE_KEY);
        this.onAuthChangeCallback?.(null);
    }

    async migrateTemporaryUserIds(googleUserId: string): Promise<void> {
        const workouts = await this.storage.loadAll();
        let changed = false;

        for (const workout of workouts) {
            if (workout.userId.startsWith('temp-user-')) {
                workout.userId = googleUserId;
                changed = true;
            }
        }

        if (changed) {
            await this.storage.saveAll(workouts);
        }
    }

    private async performRefresh(): Promise<boolean> {
        try {
            const response = await firstValueFrom(
                this.http.post<RefreshResponse>(`${environment.apiBaseUrl}/api/auth/refresh`, {}),
            );

            this.storeCredentials({ expiresAt: response.expiresAt });
            this.storeUser(response);
            return true;
        } catch {
            this.credentials = null;
            localStorage.removeItem(STORAGE_KEY);
            this.onAuthChangeCallback?.(null);
            return false;
        }
    }

    private async handleCredentialResponse(response: { credential: string }): Promise<void> {
        try {
            const loginResponse = await firstValueFrom(
                this.http.post<LoginResponse>(`${environment.apiBaseUrl}/api/auth/login`, {
                    googleIdToken: response.credential,
                }),
            );

            this.storeCredentials({ expiresAt: loginResponse.expiresAt });
            const user = this.storeUser(loginResponse);

            await this.migrateTemporaryUserIds(user.id);
            this.onAuthChangeCallback?.(user);
        } catch (error) {
            console.error('Login failed:', error);
        }
    }

    private storeUser(response: LoginResponse | RefreshResponse): AuthUser {
        const user: AuthUser = {
            id: response.userId,
            name: response.displayName,
            email: response.email,
            picture: response.avatarUrl,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
        return user;
    }

    private storeCredentials(credentials: AuthCredentials): void {
        this.credentials = credentials;
    }
}
