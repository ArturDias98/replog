# Sync Flow

## Architecture

The sync system follows the project's clean architecture:

| Layer | Component | Responsibility |
| ----- | --------- | -------------- |
| `@replog/application` | `SyncUseCase` | Orchestrates push/pull cycle |
| `@replog/application` | `SyncQueuePort` | Abstract queue interface |
| `@replog/application` | `SyncApiPort` | Abstract API interface |
| `@replog/infrastructure` | `SyncQueueServiceImpl` | IndexedDB-backed queue (sync_queue + sync_meta stores) |
| `@replog/infrastructure` | `SyncApiServiceImpl` | HTTP client for `/api/sync/push` and `/api/sync/pull` |
| `src/app/` | `SyncJob` | 1-second interval timer that calls `sync()` |
| `src/app/` | `App` component | Triggers initial sync on login, manages toast + sync status dot |

## Sync Cases

### Case 1: No local data + user logs in

1. User signs in via Google Identity Services
2. `onUserChange` fires in `App.ngOnInit()`
3. `performInitialSync()` runs:
   - `storagePort.loadAll()` returns empty array
   - `syncQueue.ensureInitialQueue([])` exits early (nothing to enqueue)
   - `syncUseCase.sync()` runs:
     - `isFirstSync = true` (lastSyncedAt is null)
     - `pushChanges()` has nothing to push
     - `pullChanges()` runs because `isFirstSync = true`
     - Server returns all user data, saved to IndexedDB
4. Toast: "Sync completed successfully"
5. Workout component reloads via `onDataChanged` listener

### Case 2: Has local data + user logs in

1. User has been using the app offline with local data
2. User signs in
3. `performInitialSync()` runs:
   - `storagePort.loadAll()` returns existing workouts
   - `syncQueue.ensureInitialQueue(workouts)` enqueues all entities as CREATEs (because lastSyncedAt is null and no pending changes exist)
   - `syncUseCase.sync()` runs:
     - `isFirstSync = true`
     - `pushChanges()` pushes all queued CREATEs in batches of 100
     - Server acknowledges changes, resolves any conflicts
     - `pullChanges()` runs, pulls full server state
4. Toast: "Sync completed successfully"

### Case 3: Ongoing sync (already synced)

1. `SyncJob` fires every 1 second
2. `syncUseCase.sync()` runs:
   - `isFirstSync = false` (lastSyncedAt is set)
   - `pushChanges()` pushes any pending local changes
   - `pullChanges()` only runs if something was pushed
3. No toast (background operation)

## Flow Diagrams

### Initial sync (on login)

```
App.onUserChange(user)
  └─ performInitialSync()
       ├─ storagePort.loadAll()
       ├─ syncQueue.ensureInitialQueue(workouts)
       │   ├─ Check lastSyncedAt → if not null, return
       │   ├─ Check pending changes → if any, return
       │   ├─ Check workouts → if empty, return
       │   └─ Enqueue all: workout → muscleGroup → exercise → log (as CREATEs)
       └─ syncUseCase.sync()
            ├─ isFirstSync? = (lastSyncedAt === null)
            ├─ pushChanges()
            │   ├─ Get pending changes from IndexedDB
            │   ├─ Batch into groups of 100
            │   └─ For each batch:
            │       ├─ POST /api/sync/push { changes, lastSyncedAt }
            │       ├─ Remove acknowledged changes
            │       ├─ Apply server conflicts (server_wins)
            │       └─ Update lastSyncedAt
            └─ pullChanges() (if pushed or first sync)
                ├─ GET /api/sync/pull
                ├─ Convert server models to client models
                ├─ Save all to IndexedDB
                └─ Update lastSyncedAt
```

### Periodic sync (SyncJob)

```
SyncJob (every 1s)
  └─ syncUseCase.sync()
       ├─ Guard: if isSyncing, return 'idle'
       ├─ isFirstSync? → false (after initial sync)
       ├─ pushChanges() → push any new changes
       └─ pullChanges() → only if didPush
```

## Recording Changes

Any CRUD operation on entities automatically records a sync change via `SyncQueuePort.recordChange()`:

| Entity | Actions | Data fields |
| ------ | ------- | ----------- |
| Workout | CREATE, UPDATE, DELETE | id, userId, title, date, orderIndex |
| MuscleGroup | CREATE, UPDATE, DELETE | id, workoutId, title, date, orderIndex |
| Exercise | CREATE, UPDATE, DELETE | id, workoutId, muscleGroupId, title, orderIndex |
| Log | CREATE, UPDATE, DELETE | id, workoutId, muscleGroupId, exerciseId, numberReps, maxWeight, date |

## Conflict Resolution

When the server detects a conflict during push:
1. Server returns `{ changeId, resolution: 'server_wins', serverVersion }` for each conflict
2. Client loads current local data
3. Client applies the server version to the matching entity
4. Client saves updated data locally
5. Conflicting changes are removed from the queue

## UI Indicators

### Topbar sync button (visible when logged in)
- **Green dot**: No pending changes (everything synced)
- **Red dot**: Pending changes exist
- **Click**: Triggers manual `syncUseCase.sync()`, shows toast on result

### Toast notifications
- Appears at the bottom of the screen
- Auto-dismisses after 3 seconds
- Green for success, red for error

### Settings sync button
- Manual sync trigger with inline success/error message

## Sign Out

On sign out:
1. `syncQueue.clearAll()` clears all pending changes and sync metadata
2. Auth token is removed
3. Sync status resets to 'idle'
