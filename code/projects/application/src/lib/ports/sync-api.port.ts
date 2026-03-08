import { Observable } from 'rxjs';
import { SyncPushRequest, SyncPushResponse, SyncPullResponse } from '@replog/shared';

export abstract class SyncApiPort {
    abstract push(request: SyncPushRequest): Observable<SyncPushResponse>;
    abstract pull(): Observable<SyncPullResponse>;
}
