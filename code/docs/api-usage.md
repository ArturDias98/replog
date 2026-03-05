# Replog API Usage

## Base URL

| Environment | URL |
|-------------|-----|
| Development | `http://localhost:5139` or `https://localhost:7282` |
| Production  | TBD |

## Authentication

All endpoints require a Google OAuth2 ID token in the `Authorization` header.

```
Authorization: Bearer <google_id_token>
```

The API validates the token against Google's JWKS and extracts the user ID from the `sub` claim.

## Rate Limiting

Sync endpoints are limited to **10 requests per minute** per user. Exceeding this returns `429 Too Many Requests`.

## CORS

| Environment | Allowed Origin |
|-------------|---------------|
| Development | `http://localhost:4200` |
| Production  | `https://replog.adrvcode.com` |

Allowed headers: `Authorization`, `Content-Type`
Allowed methods: `GET`, `POST`

---

## Endpoints

### POST `/api/sync/push`

Push local changes to the server.

#### Request Body

```json
{
  "changes": [
    {
      "id": "unique-change-id",
      "entityType": "workout | muscleGroup | exercise | log",
      "action": "CREATE | UPDATE | DELETE",
      "timestamp": "2026-03-01T12:00:00Z",
      "data": { }
    }
  ],
  "lastSyncedAt": "2026-03-01T11:00:00Z"
}
```

#### `data` Shapes by Entity and Action

**Workout CREATE**

```json
{
  "id": "workout-uuid",
  "userId": "google-sub-claim",
  "title": "Push Day",
  "date": "2026-03-01",
  "orderIndex": 0
}
```

**Workout UPDATE**

```json
{
  "id": "workout-uuid",
  "title": "Updated Title",
  "date": "2026-04-01",
  "orderIndex": 1
}
```

**Workout DELETE**

```json
{
  "id": "workout-uuid"
}
```

**MuscleGroup CREATE**

```json
{
  "id": "mg-uuid",
  "workoutId": "workout-uuid",
  "title": "Chest",
  "date": "2026-03-01",
  "orderIndex": 0
}
```

**MuscleGroup UPDATE**

```json
{
  "id": "mg-uuid",
  "workoutId": "workout-uuid",
  "title": "Updated Chest",
  "date": "2026-04-01",
  "orderIndex": 1
}
```

**MuscleGroup DELETE**

```json
{
  "id": "mg-uuid",
  "workoutId": "workout-uuid"
}
```

**Exercise CREATE**

```json
{
  "id": "exercise-uuid",
  "workoutId": "workout-uuid",
  "muscleGroupId": "mg-uuid",
  "title": "Bench Press",
  "orderIndex": 0
}
```

**Exercise UPDATE**

```json
{
  "id": "exercise-uuid",
  "workoutId": "workout-uuid",
  "muscleGroupId": "mg-uuid",
  "title": "Incline Press",
  "orderIndex": 1
}
```

**Exercise DELETE**

```json
{
  "id": "exercise-uuid",
  "workoutId": "workout-uuid",
  "muscleGroupId": "mg-uuid"
}
```

**Log CREATE**

```json
{
  "id": "log-uuid",
  "workoutId": "workout-uuid",
  "muscleGroupId": "mg-uuid",
  "exerciseId": "exercise-uuid",
  "numberReps": 10,
  "maxWeight": 80.5,
  "date": "2026-03-01"
}
```

**Log UPDATE**

```json
{
  "id": "log-uuid",
  "workoutId": "workout-uuid",
  "muscleGroupId": "mg-uuid",
  "exerciseId": "exercise-uuid",
  "numberReps": 12,
  "maxWeight": 90.5
}
```

**Log DELETE**

```json
{
  "id": "log-uuid",
  "workoutId": "workout-uuid",
  "muscleGroupId": "mg-uuid",
  "exerciseId": "exercise-uuid"
}
```

#### Response `200 OK`

```json
{
  "acknowledgedChangeIds": ["change-id-1", "change-id-2"],
  "conflicts": [
    {
      "changeId": "change-id-3",
      "resolution": "server_wins",
      "serverVersion": { }
    }
  ],
  "serverTimestamp": "2026-03-01T12:00:01Z"
}
```

- `acknowledgedChangeIds` — changes that were applied successfully.
- `conflicts` — changes rejected due to a newer server version. `serverVersion` contains the current server state of the entity. The client should replace its local version with this data.
- `serverTimestamp` — use this as `lastSyncedAt` on the next push.

---

### GET `/api/sync/pull`

Pull all workouts for the authenticated user.

#### Response `200 OK`

```json
{
  "workouts": [
    {
      "id": "workout-uuid",
      "userId": "google-sub-claim",
      "title": "Push Day",
      "date": "2026-03-01",
      "orderIndex": 0,
      "muscleGroup": [
        {
          "id": "mg-uuid",
          "workoutId": "workout-uuid",
          "title": "Chest",
          "date": "2026-03-01",
          "orderIndex": 0,
          "exercises": [
            {
              "id": "exercise-uuid",
              "muscleGroupId": "mg-uuid",
              "title": "Bench Press",
              "orderIndex": 0,
              "log": [
                {
                  "id": "log-uuid",
                  "numberReps": 10,
                  "maxWeight": 80.5,
                  "date": "2026-03-01"
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "serverTimestamp": "2026-03-01T12:00:00Z"
}
```

---

## Error Responses

| Status | Meaning |
|--------|---------|
| `400`  | Validation error (invalid request body) |
| `401`  | Missing or invalid Google ID token |
| `429`  | Rate limit exceeded (10 req/min) |
| `500`  | Internal server error |
