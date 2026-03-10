export type AuthUser = {
    id: string;
    name: string;
    email: string;
    picture: string;
};

export type AuthCredentials = {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
};

export type LoginRequest = { googleIdToken: string };
export type LoginResponse = AuthCredentials;
export type RefreshRequest = { accessToken: string; refreshToken: string };
export type RefreshResponse = AuthCredentials;
