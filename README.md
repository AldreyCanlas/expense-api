# expense-api

Small HTTP API for recording personal expenses and totaling them by category. Data lives in memory and resets when the process stops.

## Requirements

- Node.js 22.18 or newer

## Run

```bash
npm install
npm start
```

The server listens on port 3000, or on `PORT` when that variable is set.

## API

Amounts are decimal numbers in major units (for example, `12.5` dollars). Dates use `YYYY-MM-DD`. `from` and `to` are inclusive.

### `GET /health`

```json
{ "ok": true }
```

### `POST /expenses`

```json
{
  "amount": 12.5,
  "category": "food",
  "note": "lunch",
  "occurredOn": "2026-01-10"
}
```

`note` is optional.

### `GET /expenses`

Optional query parameters: `from`, `to`, `category`.

### `GET /expenses/:id`

### `DELETE /expenses/:id`

Returns `204` when the expense is removed.

### `GET /summary`

Uses the same query parameters as `GET /expenses`.

```json
{
  "summary": {
    "from": "2026-01-01",
    "to": "2026-01-31",
    "category": null,
    "count": 2,
    "total": 15,
    "byCategory": [{ "category": "food", "total": 15, "count": 2 }]
  }
}
```

## Checks

```bash
npm test
npm run typecheck
```
