import { AuthUser, AuthCredentials } from '@replog/shared';

export abstract class AuthPort {
    abstract initialize(): Promise<void>;
    abstract renderButton(container: HTMLElement): Promise<void>;
    abstract onUserChange(callback: (user: AuthUser | null) => void): void;
    abstract getUser(): AuthUser | null;
    abstract getCredentials(): AuthCredentials | null;
    abstract isAuthenticated(): boolean;
    abstract isTokenExpired(): boolean;
    abstract ensureValidToken(): Promise<boolean>;
    abstract signOut(): void;
    abstract migrateTemporaryUserIds(googleUserId: string): Promise<void>;
}
