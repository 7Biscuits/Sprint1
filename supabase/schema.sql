-- SignalProof session persistence (Supabase Postgres).
-- Server writes with the service-role key only; never expose it to the client.
-- Anonymous, non-PII demo records. Retain only for the event, then delete/export.

create table if not exists analysis_sessions (
  session_id            text primary key,
  started_at            timestamptz not null,
  completed_at          timestamptz not null,
  total_latency_ms      integer not null,
  symbol                text not null,
  profile_id            text not null,
  profile_name          text not null,
  risk_tolerance        text not null,
  scenario              text not null,
  data_mode             text not null,
  data_source           text not null,
  data_fetched_at       timestamptz not null,
  data_age_days         integer not null,
  agent_summary         jsonb not null,
  technical_latency_ms  integer not null,
  filing_latency_ms     integer not null,
  news_latency_ms       integer not null,
  concentration_pct     numeric not null,
  concentration_hhi     integer not null,
  citation_count        integer not null,
  claim_count           integer not null,
  cited_claim_count     integer not null,
  conflict_flag         boolean not null,
  conflict_agents       jsonb not null,
  caps_applied          jsonb not null,
  market_outlook        text not null,
  market_outlook_confidence integer not null,
  final_action          text not null,
  final_action_code     text not null,
  final_confidence      integer not null,
  final_rule_id         text not null,
  raw_signal_fingerprint text not null,
  storage_mode          text not null default 'supabase',
  decision              text check (decision in ('will_review', 'dismissed')),
  decision_at           timestamptz
);

create index if not exists analysis_sessions_started_at_idx
  on analysis_sessions (started_at desc);

-- Production hardening (demo runs with server-side service role):
-- alter table analysis_sessions enable row level security;
