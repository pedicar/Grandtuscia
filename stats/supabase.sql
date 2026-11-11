-- ==========================================================================
-- TUSCIA GAMES · statistiche su Supabase
-- Da incollare UNA volta in Supabase → SQL Editor → New query → Run.
-- Prima di eseguire, cambia la password qui sotto (riga "insert into tg_config"):
-- è quella che userai per aprire la pagina stats/ del sito.
-- ==========================================================================

-- gli eventi: una riga per ogni cosa successa nel gioco
create table if not exists public.tg_eventi (
  id    bigint generated always as identity primary key,
  t     timestamptz not null default now(),
  app   text,
  dev   text not null,          -- numero a caso del dispositivo (anonimo)
  ses   text not null,          -- numero a caso della sessione
  tipo  text not null,          -- es. luogo_visto, annuncio_ascoltato, gioco_avvio
  cosa  text,                   -- es. palazzo, caprarola, vicopesca
  val   real,                   -- secondi, punti, tempo...
  extra jsonb
);
create index if not exists tg_eventi_t on public.tg_eventi (t);
create index if not exists tg_eventi_tipo on public.tg_eventi (tipo, cosa);

-- dal browser si può solo AGGIUNGERE (mai leggere, cambiare o cancellare)
alter table public.tg_eventi enable row level security;
drop policy if exists "solo aggiunte" on public.tg_eventi;
create policy "solo aggiunte" on public.tg_eventi for insert to anon
  with check (
    char_length(tipo) <= 40 and char_length(coalesce(cosa, '')) <= 80
    and char_length(dev) <= 20 and char_length(ses) <= 20
    and coalesce(pg_column_size(extra), 0) < 2000
    and t > now() - interval '1 day' and t < now() + interval '1 hour'
  );
grant insert on public.tg_eventi to anon;

-- la password della pagina statistiche (tabella non leggibile dal browser)
create table if not exists public.tg_config (k text primary key, v text not null);
alter table public.tg_config enable row level security;
insert into public.tg_config (k, v) values ('chiave', 'CAMBIA-QUESTA-PASSWORD')
  on conflict (k) do update set v = excluded.v;

-- il riepilogo per la pagina stats/: risponde solo con la password giusta
create or replace function public.tg_riepilogo(chiave text, giorni int default 30)
returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if chiave is null or chiave <> (select v from tg_config where k = 'chiave') then
    raise exception 'password sbagliata';
  end if;
  -- i dati più vecchi di 13 mesi si cancellano da soli (regola della misura del pubblico)
  delete from tg_eventi where t < now() - interval '13 months';
  with e as (select * from tg_eventi where t > now() - make_interval(days => greatest(1, least(giorni, 400))))
  select jsonb_build_object(
    'giocatori', (select count(distinct dev) from e),
    'sessioni',  (select count(distinct ses) from e),
    'nuovi',     (select count(distinct dev) from e where tipo = 'sessione' and (extra->>'n')::int = 1),
    'giorni', coalesce((select jsonb_agg(x order by x.g) from (
        select to_char(date_trunc('day', t), 'YYYY-MM-DD') g, count(distinct dev) giocatori, count(distinct ses) sessioni,
               round(coalesce(sum(val) filter (where tipo in ('tempo', 'tempo_gioco')), 0) / 60) minuti
        from e group by 1) x), '[]'),
    'eventi', coalesce((select jsonb_agg(x) from (
        select tipo, cosa, count(*) n, count(distinct dev) persone, sum(val) somma from e group by tipo, cosa) x), '[]'),
    'testi', coalesce((select jsonb_object_agg(cosa, testo) from (
        select distinct on (cosa) cosa, extra->>'testo' testo from e where tipo = 'annuncio_inviato' and extra ? 'testo') x), '{}'),
    'provenienza', coalesce((select jsonb_agg(x) from (
        select coalesce(extra->>'da', '?') da, count(distinct dev) persone from e where tipo = 'sessione' group by 1 order by 2 desc limit 20) x), '[]'),
    'telefono', (select count(distinct dev) from e where tipo = 'sessione' and (extra->>'mob')::boolean),
    'vie', coalesce((select jsonb_agg(x) from (
        select cosa app, coalesce(extra->>'via', '?') via, count(*) sessioni, count(distinct dev) persone from e where tipo = 'sessione' group by 1, 2) x), '[]'),
    'esiti', coalesce((select jsonb_agg(x) from (
        select cosa, count(*) filter (where (extra->>'giocato')::boolean) giocate, count(*) filter (where (extra->>'ok')::boolean) finite,
               count(*) filter (where extra->>'med' = 'oro') oro, count(*) filter (where extra->>'med' = 'argento') argento, count(*) filter (where extra->>'med' = 'bronzo') bronzo
        from e where tipo = 'gioco_ritorno' group by cosa) x), '[]')
  ) into r;
  return r;
end $$;
revoke all on function public.tg_riepilogo(text, int) from public;
grant execute on function public.tg_riepilogo(text, int) to anon;
