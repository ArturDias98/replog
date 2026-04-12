export type AuthUser = {
    id: string;
    name: string;
    email: string;
    picture: string;
};

export type AuthCredentials = {
    expiresAt: string;
};

export type LoginRequest = { googleIdToken: string };

export type LoginResponse = {
    expiresAt: string;
    userId: string;
    email: string;
    displayName: string;
    avatarUrl: string;
};

export type RefreshResponse = LoginResponse;
