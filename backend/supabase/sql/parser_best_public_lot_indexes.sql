create index if not exists public_lots_stream_idx
  on src_parser_best.public_lots(stream_at desc, parser_id desc);
create index if not exists public_lots_source_stream_idx
  on src_parser_best.public_lots(source, stream_at desc, parser_id desc);
create index if not exists public_lots_type_stream_idx
  on src_parser_best.public_lots(vehicle_type, stream_at desc, parser_id desc);
create index if not exists public_lots_make_model_stream_idx
  on src_parser_best.public_lots(make_key, model_key, stream_at desc, parser_id desc);
create index if not exists public_lots_year_stream_idx
  on src_parser_best.public_lots(model_year, stream_at desc, parser_id desc);
create index if not exists public_lots_auction_day_stream_idx
  on src_parser_best.public_lots(auction_day, stream_at desc, parser_id desc);
create index if not exists public_lots_buy_now_stream_idx
  on src_parser_best.public_lots(stream_at desc, parser_id desc) where has_buy_now;
create index if not exists public_lots_vin_prefix_idx
  on src_parser_best.public_lots(vin text_pattern_ops);
create index if not exists public_lots_source_lot_idx
  on src_parser_best.public_lots(source, lot_id);
create index if not exists public_lots_search_trgm_idx
  on src_parser_best.public_lots using gin(search_text gin_trgm_ops);
