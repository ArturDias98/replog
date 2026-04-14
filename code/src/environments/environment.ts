const w = typeof window !== "undefined" ? (window as any) : {};
export const environment =
{
    get googleClientId(): string { return w.__env?.googleClientId ?? ""; },
    get apiBaseUrl(): string { return w.__env?.apiBaseUrl ?? ""; },
};