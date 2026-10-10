# Supabase ingestion contract

This project uses a split persistence model for the correlation-agent payload:

- `incidents` stores the derived incident summary
- `events` stores the flattened child events
- `event_relationships` stores causal ordering and graph edges

This is intentionally different from the earlier flat event stream contract.

## Why this split is required

The agent output is not a single linear stream. It is an incident bundle:

- one incident summary
- multiple child events
- a relationship graph

A single flat `events` table would lose the parent/child semantics and would make graph traversal impossible without reconstructing the package structure.

## Canonical normalization rules

Apply these rules before insert:

- `CRITICAL`, `ERROR`, `SEVERE` => `critical`
- `WARNING` => `medium`
- `INFO` => `info`
- `deployment.completed` => `deployment`
- `metric.usage` => `metric`
- `business_failure` stays as-is

## Ingestion flow

1. Receive raw agent payload
2. Normalize event and severity types
3. Map to `incidents` + `events` + `event_relationships`
4. Upsert incident row
5. Upsert each event row with `incident_id`
6. Upsert each relationship row with `incident_id`

## Example

```sql
select public.upsert_incident_bundle($$
{
  "incident_id": "INC-201",
  "incident_title": "Checkout latency spike",
  "time_window": {"start": "2026-08-29T09:00:00Z", "end": "2026-08-29T09:10:00Z"},
  "affected_services": ["checkout-api", "payment-api"],
  "event_count": 3,
  "correlation_score": 0.94,
  "correlation_reasons": ["temporal_proximity", "service_overlap"],
  "severity": "CRITICAL",
  "status": "active",
  "service": "checkout-api",
  "events": [
    {"event_id": "evt-1", "service": "checkout-api", "event_type": "business_failure", "severity": "CRITICAL", "source": "Application Logs", "message": "Payment failures started"},
    {"event_id": "evt-2", "service": "payment-api", "event_type": "metric", "severity": "WARNING", "source": "Datadog", "message": "Latency rose"},
    {"event_id": "evt-3", "service": "checkout-api", "event_type": "deployment", "severity": "INFO", "source": "GitHub", "message": "Release pushed"}
  ],
  "relationships": [
    {"from": "evt-3", "to": "evt-2", "type": "PRECEDES"},
    {"from": "evt-2", "to": "evt-1", "type": "PRECEDES"}
  ]
}
$$);
```
