import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SyncPushRequest, SyncPushResponse, SyncPullResponse } from '@replog/shared';
import { SyncApiPort } from '@replog/application';
import { environment } from '../../../../../src/environments/environment';

@Injectable()
export class SyncApiServiceImpl extends SyncApiPort {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiBaseUrl;

    push(request: SyncPushRequest): Observable<SyncPushResponse> {
        return this.http.post<SyncPushResponse>(`${this.baseUrl}/api/sync/push`, request);
    }

    pull(): Observable<SyncPullResponse> {
        return this.http.get<SyncPullResponse>(`${this.baseUrl}/api/sync/pull`);
    }
}
