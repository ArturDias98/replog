# RepLog Offline-First Sync Strategy

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Data Model Changes](#3-data-model-changes)
4. [Change Log (Sync Queue)](#4-change-log-sync-queue)
5. [Sync Service (Frontend)](#5-sync-service-frontend)
6. [Backend API Contract](#6-backend-api-contract)
7. [Conflict Resolution](#7-conflict-resolution)
8. [Sync Flows](#8-sync-flows)
9. [Edge Cases](#9-edge-cases)
10. [Migration Plan](#10-migration-plan)
11. [Security Considerations](#11-security-considerations)

---

## 1. Overview

RepLog is an offline-first workout tracking app. Users can create, edit, and delete workouts entirely offline. When a backend and authentication are added, users will be able to sync their local data with a remote database so they can access it from multiple devices.

### Strategy: Change Log with Last-Write-Wins

Instead of syncing the full current state, the app records **every mutation** (create, update, delete) as a change event in a local queue. When the app goes online and the user is authenticated, it pushes those changes to the backend, which applies them and returns the merged state.

### Design Principles

- **Offline is the default.** The app must work fully without a network connection. Sync is additive — it never degrades the offline experience.
- **Local storage remains the source of truth for the UI.** The UI always reads from localStorage. The backend is the source of truth for cross-device consistency.
- **Unauthenticated users are unaffected.** If a user never logs in, the app behaves exactly as it does today.
- **Sync is eventual.** There is no requirement for real-time sync. Changes are pushed when the app comes online.

---

## 2. Architecture

### High-Level Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENT (Angular App)                                           │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────────┐  │
│  │  UI / Comps  │───>│  Data        │───>│  localStorage     │  │
│  │              │    │  Services    │    │  (replog_workouts) │  │
│  └──────────────┘    └──────┬───────┘    └───────────────────┘  │
│                             │                                   │
│                             │ records mutation                  │
│                             ▼                                   │
│                      ┌──────────────┐                           │
│                      │  Sync Queue  │                           │
│                      │  (localStorage│                          │
│                      │  replog_sync_ │                          │
│                      │  queue)       │                          │
│                      └──────┬───────┘                           │
│                             │                                   │
│                             │ when online + authenticated       │
│                             ▼                                   │
│                      ┌──────────────┐                           │
│                      │  SyncService │                           │
│                      └──────┬───────┘                           │
└─────────────────────────────┼───────────────────────────────────┘
                              │ HTTPS
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND                                                        │
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────────┐  │
│  │  POST /sync  │───>│  Sync Engine │───>│  Database         │  │
│  │  GET  /sync  │    │  (conflict   │    │  (source of truth │  │
│  │              │    │   resolution)│    │   for cross-device)│  │
│  └──────────────┘    └──────────────┘    └───────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|---|---|
| **Data Services** (existing) | Apply mutations to localStorage immediately. Record each mutation in the sync queue. |
| **Sync Queue** (new) | Stores pending change events in `localStorage['replog_sync_queue']`. |
| **SyncService** (new) | Manages online/offline detection, pushes queued changes, pulls server state, triggers merges. |
| **Backend Sync Engine** (new) | Receives change events, applies them to the DB, resolves conflicts, returns merged state. |

---

## 3. Data Model Changes

### 3.1 New Sync Metadata

Every syncable entity gains these fields:

```typescript
type SyncMetadata = {
  createdAt: string;       // ISO 8601 timestamp — set once on creation
  updatedAt: string;       // ISO 8601 timestamp — updated on every mutation
  deletedAt: string | null; // ISO 8601 timestamp — set on soft-delete, null if alive
};
```

### 3.2 Updated Entity Types

#### WorkOutGroup

```typescript
// BEFORE
type WorkOutGroup = {
  id: string;
  title: string;
  date: string;
  userId: string;
  muscleGroup: MuscleGroup[];
};

// AFTER
type WorkOutGroup = {
  id: string;           // crypto.randomUUID() — already in place
  title: string;
  date: string;
  userId: string;
  muscleGroup: MuscleGroup[];
  createdAt: string;    // NEW
  updatedAt: string;    // NEW
  deletedAt: string | null; // NEW
};
```

#### MuscleGroup

```typescript
// BEFORE
type MuscleGroup = {
  id: string;
  workoutId: string;
  title: string;
  date: string;
  exercises: Exercise[];
};

// AFTER
type MuscleGroup = {
  id: string;
  workoutId: string;
  title: string;
  date: string;
  exercises: Exercise[];
  createdAt: string;    // NEW
  updatedAt: string;    // NEW
  deletedAt: string | null; // NEW
};
```

#### Exercise

```typescript
// BEFORE
type Exercise = {
  id: string;
  muscleGroupId: string;
  title: string;
  log: Log[];
};

// AFTER
type Exercise = {
  id: string;
  muscleGroupId: string;
  title: string;
  log: Log[];
  createdAt: string;    // NEW
  updatedAt: string;    // NEW
  deletedAt: string | null; // NEW
};
```

#### Log

```typescript
// BEFORE
type Log = {
  id: string;
  numberReps: number;
  maxWeight: number;
  date: Date;
};

// AFTER
type Log = {
  id: string;
  numberReps: number;
  maxWeight: number;
  date: Date;
  createdAt: string;    // NEW
  updatedAt: string;    // NEW
  deletedAt: string | null; // NEW
};
```

### 3.3 Soft Deletes

Currently, delete operations remove records from arrays (e.g., `filter(w => w.id !== id)`). With sync, **deletions must be recorded**, not erased, so other devices know to delete the record too.

**Change:** Instead of removing from the array, set `deletedAt` to the current ISO timestamp.

**UI impact:** All queries that read data must filter out records where `deletedAt !== null`. This ensures deleted records are invisible to the user but remain in storage for sync.

**Cleanup:** After a successful sync, the backend confirms which deletions have been applied. The client can then physically remove soft-deleted records that have been acknowledged by the server.

---

## 4. Change Log (Sync Queue)

### 4.1 SyncChange Type

```typescript
type SyncChangeAction = 'CREATE' | 'UPDATE' | 'DELETE';

type SyncEntityType = 'workout' | 'muscleGroup' | 'exercise' | 'log';

type SyncChange = {
  id: string;                // unique ID for this change event (crypto.randomUUID())
  entityType: SyncEntityType;
  entityId: string;          // ID of the affected record
  action: SyncChangeAction;
  timestamp: string;         // ISO 8601 — when the change was made on the client
  data: Record<string, unknown> | null; // full entity for CREATE, changed fields for UPDATE, null for DELETE
  parentId: string | null;   // parent entity ID for context (e.g., workoutId for a muscleGroup change)
};
```

### 4.2 Storage Key

```
localStorage['replog_sync_queue']  →  JSON string of SyncChange[]
```

### 4.3 Queue Operations

```typescript
// SyncQueueService (new)

class SyncQueueService {
  private readonly QUEUE_KEY = 'replog_sync_queue';

  /** Append a change to the queue */
  enqueue(change: SyncChange): void;

  /** Get all pending changes (ordered by timestamp) */
  getAll(): SyncChange[];

  /** Remove changes that have been acknowledged by the server */
  dequeue(changeIds: string[]): void;

  /** Clear the entire queue (used after full sync) */
  clear(): void;
}
```

### 4.4 What Each Service Records

#### WorkoutDataService

| Method | Action | data payload |
|---|---|---|
| `addWorkout()` | `CREATE` | Full `WorkOutGroup` (without nested muscleGroups) |
| `updateWorkout()` | `UPDATE` | `{ title, date, updatedAt }` |
| `deleteWorkout()` | `DELETE` | `null` |
| `reorderWorkouts()` | `UPDATE` | `{ orderIndex, updatedAt }` for each affected workout |

#### MuscleGroupService

| Method | Action | data payload | parentId |
|---|---|---|---|
| `addMuscleGroup()` | `CREATE` | Full `MuscleGroup` (without nested exercises) | `workoutId` |
| `addMuscleGroups()` | `CREATE` (one per group) | Full `MuscleGroup` each | `workoutId` |
| `updateMuscleGroup()` | `UPDATE` | `{ title, date, updatedAt }` | `workoutId` |
| `deleteMuscleGroup()` | `DELETE` | `null` | `workoutId` |
| `reorderMuscleGroups()` | `UPDATE` | `{ orderIndex, updatedAt }` for each affected group | `workoutId` |

#### ExerciseService

| Method | Action | data payload | parentId |
|---|---|---|---|
| `addExercise()` | `CREATE` | Full `Exercise` (without logs) | `muscleGroupId` |
| `addExercises()` | `CREATE` (one per exercise) | Full `Exercise` each | `muscleGroupId` |
| `updateExercise()` | `UPDATE` | `{ title, updatedAt }` | `muscleGroupId` |
| `deleteExercise()` | `DELETE` | `null` | `muscleGroupId` |
| `reorderExercises()` | `UPDATE` | `{ orderIndex, updatedAt }` for each affected exercise | `muscleGroupId` |

#### LogService

| Method | Action | data payload | parentId |
|---|---|---|---|
| `addLog()` | `CREATE` | Full `Log` | `exerciseId` |
| `updateLog()` | `UPDATE` | `{ numberReps, maxWeight, updatedAt }` | `exerciseId` |
| `deleteLog()` | `DELETE` | `null` | `exerciseId` |

### 4.5 Example Queue

After a user creates a workout, adds a muscle group, and deletes an exercise while offline:

```json
[
  {
    "id": "c1a2b3c4-...",
    "entityType": "workout",
    "entityId": "w-uuid-1",
    "action": "CREATE",
    "timestamp": "2026-02-25T10:00:00.000Z",
    "data": {
      "id": "w-uuid-1",
      "title": "Push Day",
      "date": "2026-02-25",
      "userId": "user-123",
      "createdAt": "2026-02-25T10:00:00.000Z",
      "updatedAt": "2026-02-25T10:00:00.000Z",
      "deletedAt": null
    },
    "parentId": null
  },
  {
    "id": "d4e5f6a7-...",
    "entityType": "muscleGroup",
    "entityId": "mg-uuid-1",
    "action": "CREATE",
    "timestamp": "2026-02-25T10:01:00.000Z",
    "data": {
      "id": "mg-uuid-1",
      "workoutId": "w-uuid-1",
      "title": "Chest",
      "date": "2026-02-25",
      "createdAt": "2026-02-25T10:01:00.000Z",
      "updatedAt": "2026-02-25T10:01:00.000Z",
      "deletedAt": null
    },
    "parentId": "w-uuid-1"
  },
  {
    "id": "e8f9a0b1-...",
    "entityType": "exercise",
    "entityId": "ex-uuid-old",
    "action": "DELETE",
    "timestamp": "2026-02-25T10:02:00.000Z",
    "data": null,
    "parentId": "mg-uuid-2"
  }
]
```

---

## 5. Sync Service (Frontend)

### 5.1 SyncService Responsibilities

```typescript
class SyncService {
  // --- State ---
  readonly syncStatus: Signal<'idle' | 'syncing' | 'error' | 'offline'>;
  readonly lastSyncedAt: Signal<string | null>;

  // --- Core Methods ---

  /** Called on app init + when online status changes */
  initialize(): void;

  /** Push local changes to server, then pull server state */
  sync(): Promise<SyncResult>;

  /** Full sync — pull all server data (used on first login on a new device) */
  fullSync(): Promise<SyncResult>;

  /** Check if there are pending changes */
  hasPendingChanges(): boolean;
}
```

### 5.2 Online/Offline Detection

```typescript
// In SyncService.initialize()
window.addEventListener('online', () => this.onOnline());
window.addEventListener('offline', () => this.onOffline());

// Also check on app startup
if (navigator.onLine && this.authService.isAuthenticated()) {
  this.sync();
}
```

### 5.3 Sync Trigger Points

| Trigger | Action |
|---|---|
| App starts + user is authenticated + online | `sync()` |
| Browser fires `online` event + user is authenticated | `sync()` |
| User logs in for the first time on this device | `fullSync()` |
| User manually triggers sync (pull-to-refresh, sync button) | `sync()` |
| Periodic interval (optional, e.g., every 5 minutes while online) | `sync()` |

### 5.4 Sync Lock

Only one sync operation can run at a time. Use a simple boolean flag:

```typescript
private syncing = false;

async sync(): Promise<SyncResult> {
  if (this.syncing) return { status: 'already_syncing' };
  this.syncing = true;
  try {
    // ... sync logic
  } finally {
    this.syncing = false;
  }
}
```

---

## 6. Backend API Contract

### 6.1 Authentication

All sync endpoints require a valid auth token (JWT or session). The `userId` comes from the authenticated session, never from the client payload.

### 6.2 Endpoints

#### `POST /api/sync/push`

Pushes local changes to the server.

**Request:**

```json
{
  "changes": [
    {
      "id": "change-uuid",
      "entityType": "workout",
      "entityId": "entity-uuid",
      "action": "CREATE",
      "timestamp": "2026-02-25T10:00:00.000Z",
      "data": { "...entity fields..." },
      "parentId": null
    }
  ],
  "lastSyncedAt": "2026-02-24T20:00:00.000Z"
}
```

**Response (200 OK):**

```json
{
  "acknowledgedChangeIds": ["change-uuid-1", "change-uuid-2"],
  "conflicts": [
    {
      "changeId": "change-uuid-3",
      "resolution": "server_wins",
      "serverVersion": { "...entity fields..." }
    }
  ],
  "serverTimestamp": "2026-02-25T10:05:00.000Z"
}
```

**Response (409 Conflict — full re-sync needed):**

```json
{
  "error": "full_sync_required",
  "message": "Server state has diverged too much. Perform a full sync."
}
```

#### `GET /api/sync/pull?since={ISO_TIMESTAMP}`

Pulls all changes from the server since the given timestamp.

**Response (200 OK):**

```json
{
  "workouts": [
    {
      "id": "w-uuid",
      "title": "Push Day",
      "date": "2026-02-25",
      "userId": "user-123",
      "createdAt": "2026-02-25T10:00:00.000Z",
      "updatedAt": "2026-02-25T10:00:00.000Z",
      "deletedAt": null,
      "muscleGroups": [
        {
          "id": "mg-uuid",
          "workoutId": "w-uuid",
          "title": "Chest",
          "date": "2026-02-25",
          "createdAt": "...",
          "updatedAt": "...",
          "deletedAt": null,
          "exercises": [
            {
              "id": "ex-uuid",
              "muscleGroupId": "mg-uuid",
              "title": "Bench Press",
              "createdAt": "...",
              "updatedAt": "...",
              "deletedAt": null,
              "logs": [
                {
                  "id": "log-uuid",
                  "numberReps": 10,
                  "maxWeight": 80,
                  "date": "2026-02-25T10:00:00.000Z",
                  "createdAt": "...",
                  "updatedAt": "...",
                  "deletedAt": null
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "serverTimestamp": "2026-02-25T12:00:00.000Z"
}
```

#### `GET /api/sync/full`

Returns the complete user dataset. Used for first-time sync on a new device.

**Response:** Same structure as `GET /api/sync/pull` but includes all data, not just changes since a timestamp.

---

## 7. Conflict Resolution

### 7.1 Strategy: Last-Write-Wins (per entity)

When the same entity has been modified on both the client and the server since the last sync, the version with the **later `updatedAt` timestamp** wins.

### 7.2 Conflict Scenarios

| Scenario | Resolution |
|---|---|
| Client creates, server has no record | Server accepts the CREATE |
| Client updates, server has no changes | Server accepts the UPDATE |
| Client updates, server also updated (different fields) | Merge: apply non-overlapping field changes from both |
| Client updates, server also updated (same fields) | Last-write-wins: compare `updatedAt`, later timestamp wins |
| Client deletes, server has no changes | Server accepts the DELETE (sets `deletedAt`) |
| Client deletes, server also updated | **Delete wins** — the record is marked deleted |
| Client updates, server has deleted | **Delete wins** — the client removes the record locally |
| Client creates, server already has same ID | Should not happen (UUIDs), but if it does: treat as conflict, server version wins |

### 7.3 Conflict Resolution on the Backend

```
For each incoming change:
  1. Find the entity in the database by entityId
  2. If action is CREATE:
     - If entity doesn't exist → INSERT
     - If entity exists → skip (duplicate create, already applied)
  3. If action is UPDATE:
     - If entity doesn't exist → skip (orphaned update)
     - If entity.deletedAt is set → skip (entity was deleted)
     - If entity.updatedAt > change.timestamp → server wins (skip change, return conflict)
     - Else → apply update, set updatedAt = change.timestamp
  4. If action is DELETE:
     - If entity doesn't exist → skip
     - If entity.deletedAt is already set → skip
     - Else → set deletedAt = change.timestamp
```

### 7.4 Client Handling of Conflict Responses

When the server returns conflicts:

```typescript
for (const conflict of response.conflicts) {
  if (conflict.resolution === 'server_wins') {
    // Replace local entity with server version
    this.applyServerVersion(conflict.serverVersion);
  }
}
```

No user-facing conflict resolution UI is needed. Since this is a single-user app, conflicts are rare and last-write-wins is sufficient.

---

## 8. Sync Flows

### 8.1 Normal Sync (push + pull)

```
Client                                    Server
  │                                         │
  │  1. Collect queued changes              │
  │  2. POST /api/sync/push                 │
  │  ─────────────────────────────────────> │
  │                                         │  3. Validate auth
  │                                         │  4. Process each change
  │                                         │  5. Resolve conflicts
  │  <───────────────────────────────────── │
  │  6. Receive acknowledged IDs +          │
  │     conflicts                           │
  │  7. Remove acknowledged changes         │
  │     from queue                          │
  │  8. Apply conflict resolutions          │
  │     locally                             │
  │                                         │
  │  9. GET /api/sync/pull?since=           │
  │     {lastSyncedAt}                      │
  │  ─────────────────────────────────────> │
  │                                         │  10. Query changes since
  │                                         │      timestamp
  │  <───────────────────────────────────── │
  │  11. Merge server data into local       │
  │      storage                            │
  │  12. Update lastSyncedAt                │
  │                                         │
```

### 8.2 First Login on a New Device

```
Client                                    Server
  │                                         │
  │  1. User authenticates                  │
  │  2. Check: is this the first sync?      │
  │     (lastSyncedAt === null)             │
  │                                         │
  │  3. Has local data?                     │
  │  ┌─ YES: Push local data first ──────> │
  │  │  POST /api/sync/push                 │  4. Apply to DB
  │  │  <────────────────────────────────── │
  │  │                                      │
  │  └─ Then pull everything:               │
  │     GET /api/sync/full                  │
  │  ─────────────────────────────────────> │
  │                                         │  5. Return all user data
  │  <───────────────────────────────────── │
  │  6. Merge: for each server entity,      │
  │     if local doesn't have it → add      │
  │     if local has it → keep newer        │
  │     (by updatedAt)                      │
  │  7. Set lastSyncedAt = serverTimestamp  │
  │                                         │
```

### 8.3 User Signs Up (new account, has local data)

```
1. User creates account and authenticates.
2. The app detects lastSyncedAt === null (first sync).
3. All existing local workouts are assigned the authenticated userId.
4. The app pushes all local data as CREATE changes.
5. Server stores everything.
6. lastSyncedAt is set.
7. From now on, normal sync flow applies.
```

### 8.4 User Logs In (existing account, device has no data)

```
1. User logs in on a new/empty device.
2. The app detects lastSyncedAt === null and no local data.
3. GET /api/sync/full pulls everything.
4. Local storage is populated with server data.
5. lastSyncedAt is set.
```

### 8.5 User Logs In (existing account, device has anonymous local data)

```
1. User logs in. The device has local workouts with no matching userId.
2. Ask the user: "You have local data. Do you want to merge it
   with your account or discard it?"
   - MERGE: assign userId to local data, then push + full pull.
   - DISCARD: clear local data, then full pull.
3. Normal sync resumes.
```

---

## 9. Edge Cases

### 9.1 Ordering (Reorder Operations)

Currently, ordering is implicit (array index position). For sync to work with reordering:

**Option A: Add an `orderIndex` field to each entity.**

```typescript
type WorkOutGroup = {
  // ...existing fields
  orderIndex: number; // NEW — position in the list
};
```

When a reorder happens, update `orderIndex` on all affected entities and record each as an `UPDATE` change.

**Option B: Use a linked-list approach with `previousId`.**

Not recommended for this app — adds too much complexity.

**Recommendation:** Use Option A. It's simple and works well with last-write-wins.

### 9.2 Cascading Deletes

When a workout is deleted, all its muscle groups, exercises, and logs must also be soft-deleted.

**Frontend behavior:**
- When `deleteWorkout()` is called, set `deletedAt` on the workout AND on all nested muscle groups, exercises, and logs.
- Enqueue a single `DELETE` change for the workout. The backend is responsible for cascading.

**Backend behavior:**
- When a workout `DELETE` is received, the backend sets `deletedAt` on all child entities in the database.

### 9.3 Orphaned Children

If the client sends a `CREATE` for a muscle group whose parent workout doesn't exist on the server:

- The backend rejects the change and returns it as a conflict.
- The client should ensure parent entities are pushed before children (changes are ordered by timestamp, which naturally handles this since parents are created before children).

### 9.4 Clock Skew

Client clocks may not be perfectly synchronized. Mitigation:

- The backend records its own `receivedAt` timestamp for each change.
- For conflict resolution, the backend uses client `timestamp` as a tiebreaker but trusts its own ordering for the sequence of operations.
- Keep conflict resolution simple (last-write-wins) so minor clock differences don't cause issues.

### 9.5 Large Payloads

If a user has hundreds of workouts, the full sync payload could be large.

- Paginate `GET /api/sync/full` if needed (e.g., 50 workouts per page).
- For `POST /api/sync/push`, batch changes (e.g., max 100 changes per request).

### 9.6 Failed Sync (Network Error Mid-Sync)

- The push endpoint should be **idempotent**. Each change has a unique `id`. If the same change is pushed twice, the server ignores the duplicate.
- If the push succeeds but the pull fails, `lastSyncedAt` is NOT updated. The next sync will re-pull.
- The queue is only cleared after the server acknowledges the changes.

### 9.7 localStorage Quota

localStorage has a ~5-10 MB limit. The sync queue adds to this.

- After a successful sync, physically remove soft-deleted records from localStorage.
- Keep the sync queue lean — remove acknowledged changes immediately.
- If quota is exceeded, notify the user and suggest syncing.
- **Future improvement:** Migrate to IndexedDB for larger storage capacity.

---

## 10. Migration Plan

### 10.1 Phase 1 — Prepare Data Models (no backend needed)

1. Add `createdAt`, `updatedAt`, `deletedAt` to all entity types.
2. Write a migration function that runs on app startup:
   - For existing records without these fields, set:
     - `createdAt` = record's `date` field (or current timestamp if no date).
     - `updatedAt` = same as `createdAt`.
     - `deletedAt` = `null`.
3. Add `orderIndex` to entities that support reordering (WorkOutGroup, MuscleGroup, Exercise).
4. Update all data services to set `updatedAt` on every mutation.
5. Change delete operations to soft-deletes.
6. Update all read operations to filter out soft-deleted records.

### 10.2 Phase 2 — Sync Queue (no backend needed)

1. Create `SyncQueueService`.
2. Integrate it into all data services — every mutation enqueues a change.
3. The queue simply accumulates. Nothing consumes it yet.
4. Add sync metadata storage:
   - `localStorage['replog_sync_meta']` → `{ lastSyncedAt: string | null }`

### 10.3 Phase 3 — Authentication

1. Add authentication (login/signup).
2. Store the auth token.
3. Ensure `userId` is set on workouts from the authenticated user.

### 10.4 Phase 4 — SyncService + Backend

1. Build the backend sync endpoints (`POST /api/sync/push`, `GET /api/sync/pull`, `GET /api/sync/full`).
2. Implement `SyncService` on the frontend.
3. Wire up online/offline detection and sync triggers.
4. Implement the merge logic for `pull` responses.
5. Add UI indicators for sync status (syncing, last synced, pending changes, error).

### 10.5 Phase 5 — Polish

1. Add a manual "Sync Now" button.
2. Handle the "local data + new login" merge prompt.
3. Add periodic background sync.
4. Implement sync error recovery and retry with exponential backoff.
5. Add cleanup of acknowledged soft-deleted records.

---

## 11. Security Considerations

### 11.1 Authentication

- All sync endpoints require a valid auth token.
- The backend extracts `userId` from the token — the client never controls which user's data is accessed.

### 11.2 Authorization

- The backend must verify that every entity in a push request belongs to the authenticated user.
- A user can only pull their own data.

### 11.3 Data Validation

- The backend must validate all incoming data (types, required fields, string lengths).
- Reject changes with entity types or fields that don't match the schema.
- Sanitize text fields (titles) to prevent XSS if the data is ever rendered elsewhere.

### 11.4 Transport Security

- All sync communication must use HTTPS.
- Auth tokens should be stored securely (HttpOnly cookies or secure storage on native, in-memory on web).

### 11.5 Rate Limiting

- Rate-limit the sync endpoints to prevent abuse.
- Suggested: max 10 sync requests per minute per user.

---

## Appendix A: New localStorage Keys

| Key | Content | Description |
|---|---|---|
| `replog_workouts` | `WorkOutGroup[]` (JSON) | Existing — workout data with new sync metadata fields |
| `replog_user_preferences` | `UserPreferences` (JSON) | Existing — not synced (device-specific) |
| `replog_sync_queue` | `SyncChange[]` (JSON) | New — pending changes to push |
| `replog_sync_meta` | `{ lastSyncedAt: string \| null }` (JSON) | New — sync state metadata |

## Appendix B: New TypeScript Types (Summary)

```typescript
// --- Sync Metadata (added to all entities) ---

type SyncMetadata = {
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

// --- Sync Queue ---

type SyncChangeAction = 'CREATE' | 'UPDATE' | 'DELETE';

type SyncEntityType = 'workout' | 'muscleGroup' | 'exercise' | 'log';

type SyncChange = {
  id: string;
  entityType: SyncEntityType;
  entityId: string;
  action: SyncChangeAction;
  timestamp: string;
  data: Record<string, unknown> | null;
  parentId: string | null;
};

// --- Sync Meta ---

type SyncMeta = {
  lastSyncedAt: string | null;
};

// --- Sync API ---

type PushRequest = {
  changes: SyncChange[];
  lastSyncedAt: string | null;
};

type PushResponse = {
  acknowledgedChangeIds: string[];
  conflicts: SyncConflict[];
  serverTimestamp: string;
};

type SyncConflict = {
  changeId: string;
  resolution: 'server_wins';
  serverVersion: Record<string, unknown>;
};

type PullResponse = {
  workouts: WorkOutGroup[];
  serverTimestamp: string;
};

// --- Sync Service ---

type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

type SyncResult =
  | { status: 'success'; pushed: number; pulled: number }
  | { status: 'already_syncing' }
  | { status: 'not_authenticated' }
  | { status: 'offline' }
  | { status: 'error'; message: string };
```

## Appendix C: Sync Status UI Indicators

| State | Icon / Text | Description |
|---|---|---|
| `idle` (no pending) | Checkmark / "Synced" | All changes are synced |
| `idle` (has pending) | Cloud-off / "Pending changes" | Changes waiting to be synced |
| `syncing` | Spinner / "Syncing..." | Sync in progress |
| `error` | Warning / "Sync failed" | Last sync attempt failed |
| `offline` | Cloud-off / "Offline" | Device is offline |
| Not authenticated | Hidden | No sync UI shown for anonymous users |
