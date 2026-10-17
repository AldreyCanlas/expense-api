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

Amounts are decimal numbers in major units (for example, `12.5` dollars). Totals are added in integer cents and then converted back to major units. Dates use `YYYY-MM-DD`. `from` and `to` are inclusive.

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

Optional query parameters: `from`, `to`, `category`. `month=YYYY-MM` is a shorthand that sets `from` and `to` to the first and last day of that month.

### `GET /expenses/:id`

### `DELETE /expenses/:id`

Returns `204` when the expense is removed.

### `GET /summary`

Uses the same query parameters as `GET /expenses`. When `from` and `to` are both set, `days` is the inclusive length of the range and `dailyAverage` is the total spread across those days. Both are `null` otherwise.

```json
{
  "summary": {
    "from": "2026-01-01",
    "to": "2026-01-31",
    "category": null,
    "count": 2,
    "total": 15,
    "days": 31,
    "dailyAverage": 0.48,
    "byCategory": [{ "category": "food", "total": 15, "count": 2 }]
  }
}
```

## Checks

```bash
npm test
npm run typecheck
```
