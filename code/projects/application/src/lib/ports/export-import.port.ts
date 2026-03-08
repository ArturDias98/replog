export type ExportResult =
    | { status: 'success' }
    | { status: 'empty' }
    | { status: 'error'; message: string };

export type ImportResult =
    | { status: 'success'; count: number }
    | { status: 'all_duplicates' }
    | { status: 'invalid_file' }
    | { status: 'error'; message: string };

export abstract class ExportImportPort {
    abstract exportWorkouts(): Promise<ExportResult>;
    abstract importWorkouts(file: File): Promise<ImportResult>;
}
