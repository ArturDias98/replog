import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SyncPushRequest, SyncPushResponse, SyncPullResponse } from '../models/sync';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root',
})
export class SyncApiService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = environment.apiBaseUrl;

    push(request: SyncPushRequest): Observable<SyncPushResponse> {
        return this.http.post<SyncPushResponse>(`${this.baseUrl}/api/sync/push`, request);
    }

    pull(): Observable<SyncPullResponse> {
        return this.http.get<SyncPullResponse>(`${this.baseUrl}/api/sync/pull`);
    }
}
