import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SyncPushRequest, SyncPushResponse, SyncPullResponse } from '@replog/shared';
import { SyncApiPort, API_BASE_URL } from '@replog/application';

@Injectable()
export class SyncApiServiceImpl extends SyncApiPort {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = inject(API_BASE_URL);

    push(request: SyncPushRequest): Observable<SyncPushResponse> {
        return this.http.post<SyncPushResponse>(`${this.baseUrl}/api/sync/push`, request);
    }

    pull(): Observable<SyncPullResponse> {
        return this.http.get<SyncPullResponse>(`${this.baseUrl}/api/sync/pull`);
    }
}
