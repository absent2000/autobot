create or replace function src_parser_best.sync_public_lot()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if src_parser_best.is_public_lot(new) then
    insert into src_parser_best.public_lots
      select p.* from src_parser_best.project_public_lot(new) p
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
