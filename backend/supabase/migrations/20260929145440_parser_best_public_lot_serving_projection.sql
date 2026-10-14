create table src_parser_best.public_lots (
  parser_id text primary key references src_parser_best.lots(parser_id) on delete cascade,
  market text not null,
  source text not null,
  lot_id text not null,
  vin text,
  title text,
  make_key text,
  model_key text,
  model_year integer,
  vehicle_type text,
  body_style text,
  auction_day text,
  has_buy_now boolean not null,
  search_text text not null,
  stream_at timestamptz not null,
  source_updated_at timestamptz not null
);
alter table src_parser_best.public_lots enable row level security;
comment on table src_parser_best.public_lots is 'Private, source-owned serving projection of eligible active US Parser.best auction lots; raw evidence remains in src_parser_best.lots.';
create function src_parser_best.is_public_lot(r src_parser_best.lots)
returns boolean language sql immutable set search_path = '' as $$
  select r.stream_at is not null
    and ((r.market='copart_us' and r.source='copart') or (r.market='iaai_us' and r.source='iaai'))
    and r.is_active is true and not coalesce(r.archived,false)
    and r.raw #>> '{specifications,vehicle_type}' in ('car','suv','van','truck','pickup','motorcycle')
    and not (r.raw #>> '{specifications,vehicle_type}'='motorcycle' and coalesce(r.raw #>> '{specifications,body_style}','')='atv')
    and r.raw #>> '{images,0,url}' is not null
    and (r.source <> 'iaai' or r.raw #>> '{images,0,url}' like '%~SID~B%')
$$;
create function src_parser_best.project_public_lot(r src_parser_best.lots)
returns src_parser_best.public_lots language sql immutable set search_path = '' as $$
  select r.parser_id, r.market, r.source, r.lot_id,
    case when upper(r.vin) ~ '^[A-HJ-NPR-Z0-9]{17}$' then upper(r.vin) else null end,
    nullif(r.raw #>> '{general,title}',''),
    lower(nullif(r.raw #>> '{specifications,make}','')),
    lower(nullif(r.raw #>> '{specifications,model}','')),
    case when r.raw #>> '{specifications,year}' ~ '^[0-9]{4}$' then (r.raw #>> '{specifications,year}')::integer else null end,
    r.raw #>> '{specifications,vehicle_type}',
    r.raw #>> '{specifications,body_style}',
    case when r.raw #>> '{auction,auction_date}' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T' then left(r.raw #>> '{auction,auction_date}',10) else null end,
    case when jsonb_typeof(r.raw #> '{auction,buy_now_price}')='number' then (r.raw #>> '{auction,buy_now_price}')::numeric > 0 else false end,
    concat_ws(' ',r.raw #>> '{general,title}',r.raw #>> '{specifications,make}',r.raw #>> '{specifications,model}'),
    r.stream_at,r.updated_at
$$;
create function src_parser_best.sync_public_lot()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if src_parser_best.is_public_lot(new) then
    insert into src_parser_best.public_lots
      select (src_parser_best.project_public_lot(new)).*
    on conflict (parser_id) do update set
      market=excluded.market,source=excluded.source,lot_id=excluded.lot_id,
      vin=excluded.vin,title=excluded.title,make_key=excluded.make_key,
      model_key=excluded.model_key,model_year=excluded.model_year,
      vehicle_type=excluded.vehicle_type,body_style=excluded.body_style,
      auction_day=excluded.auction_day,has_buy_now=excluded.has_buy_now,
      search_text=excluded.search_text,stream_at=excluded.stream_at,
      source_updated_at=excluded.source_updated_at
    where excluded.source_updated_at >= src_parser_best.public_lots.source_updated_at;
  else
    delete from src_parser_best.public_lots where parser_id=new.parser_id;
  end if;
  return new;
end
$$;
create trigger lots_public_serving_sync
  after insert or update on src_parser_best.lots
  for each row execute function src_parser_best.sync_public_lot();
