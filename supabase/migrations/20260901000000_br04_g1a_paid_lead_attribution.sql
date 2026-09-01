-- SCR-BR04-G1A lightweight paid-lead attribution schema
-- Adds nullable attribution columns to public.public_project_inquiries for campaign tracking.

alter table public.public_project_inquiries
  add column if not exists utm_source text check (char_length(utm_source) <= 120),
  add column if not exists utm_medium text check (char_length(utm_medium) <= 120),
  add column if not exists utm_campaign text check (char_length(utm_campaign) <= 120),
  add column if not exists gclid text check (char_length(gclid) <= 255),
  add column if not exists landing_page text check (char_length(landing_page) <= 2048);
