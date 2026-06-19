-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Auction type and status enums
create type auction_type as enum ('tax_deed', 'tax_lien', 'foreclosure');
create type auction_status as enum ('upcoming', 'active', 'sold', 'cancelled');
create type property_type as enum ('residential', 'commercial', 'land');
create type data_source as enum ('api', 'scrape');
create type scrape_status as enum ('success', 'partial', 'failed');

-- Auctions table
create table auctions (
  id                    uuid primary key default gen_random_uuid(),
  type                  auction_type not null,
  status                auction_status not null default 'upcoming',
  auction_date          date,
  state                 varchar(2) not null,
  county                varchar(100) not null,
  address               text,
  parcel_id             varchar(100),
  property_type         property_type,
  min_bid               numeric(12,2),
  assessed_value        numeric(12,2),
  market_value_estimate numeric(12,2),
  outstanding_debt      numeric(12,2),
  tax_amount_owed       numeric(12,2),
  interest_rate         numeric(5,2),
  photo_url             text,
  zillow_url            text,
  redfin_url            text,
  source                data_source not null,
  source_url            text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_auctions_state on auctions(state);
create index idx_auctions_county on auctions(county);
create index idx_auctions_type on auctions(type);
create index idx_auctions_status on auctions(status);
create index idx_auctions_auction_date on auctions(auction_date);

-- Favorites table
create table favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  auction_id  uuid not null references auctions(id) on delete cascade,
  notes       text,
  created_at  timestamptz not null default now(),
  unique(user_id, auction_id)
);

-- Alerts table
create table alerts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  filters      jsonb not null default '{}',
  email        varchar(255) not null,
  active       boolean not null default true,
  last_sent_at timestamptz,
  created_at   timestamptz not null default now()
);

-- Scrape logs table
create table scrape_logs (
  id             uuid primary key default gen_random_uuid(),
  source         varchar(100) not null,
  state          varchar(2),
  county         varchar(100),
  records_found  integer not null default 0,
  records_new    integer not null default 0,
  status         scrape_status not null,
  error_message  text,
  ran_at         timestamptz not null default now()
);

-- Row Level Security
alter table favorites enable row level security;
alter table alerts enable row level security;

create policy "Users manage their own favorites"
  on favorites for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own alerts"
  on alerts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Updated_at trigger
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger auctions_updated_at
  before update on auctions
  for each row execute function update_updated_at();
