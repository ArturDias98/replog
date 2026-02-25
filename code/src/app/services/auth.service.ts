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
            revoke(hint: string, callback?: () => void): void;
            disableAutoSelect(): void;
        };
    };
};

const STORAGE_KEY = 'replog_auth_user';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly storage = inject(StorageService);
    private initialized = false;
    private onAuthChangeCallback: ((user: AuthUser | null) => void) | null = null;

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
            await this.migrateTemporaryUserIds(user.id);

            this.onAuthChangeCallback?.(user);
        } catch (error) {
            console.error('Google sign-in failed:', error);
        }
    }
}
