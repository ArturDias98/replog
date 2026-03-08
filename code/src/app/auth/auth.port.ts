import { AuthUser } from '@replog/shared';

export abstract class AuthPort {
    abstract initialize(): Promise<void>;
    abstract renderButton(container: HTMLElement): Promise<void>;
    abstract onUserChange(callback: (user: AuthUser | null) => void): void;
    abstract getUser(): AuthUser | null;
    abstract getIdToken(): string | null;
    abstract isAuthenticated(): boolean;
    abstract isTokenExpired(): boolean;
    abstract refreshToken(): Promise<string | null>;
    abstract signOut(): void;
    abstract migrateTemporaryUserIds(googleUserId: string): Promise<void>;
}
