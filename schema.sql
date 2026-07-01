-- Supabase SQL schema for Rental Marketplace
-- Run this script in Supabase SQL editor to initialize the tables.

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  mobile_number text unique,
  google_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  image_url text not null,
  hourly_rate numeric not null check (hourly_rate >= 0),
  daily_rate numeric not null check (daily_rate >= 0),
  is_company_owned boolean not null default false,
  is_available boolean not null default true,
  owner_id uuid references users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Seed sample users and products for the Rental Marketplace.
-- Run this script once after creating the tables to populate example inventory.

insert into users (id, email, mobile_number, google_id)
values
  ('00000000-0000-0000-0000-000000000001', 'company@rentalmarketplace.com', '+911234567890', null),
  ('00000000-0000-0000-0000-000000000002', 'owner@example.com', '+911234567891', null);

insert into products (name, description, image_url, hourly_rate, daily_rate, is_company_owned, is_available, owner_id)
values
  (
    'Portable Speaker',
    'Bluetooth speaker with 12 hours of battery life, ideal for outdoor events.',
    'https://images.unsplash.com/photo-1518441902114-0f2b4d7f8e0a?auto=format&fit=crop&w=800&q=80',
    120,
    450,
    true,
    true,
    '00000000-0000-0000-0000-000000000001'
  ),
  (
    'Camping Tent',
    '4-person waterproof camping tent with fast setup and durable construction.',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80',
    180,
    650,
    false,
    true,
    '00000000-0000-0000-0000-000000000002'
  ),
  (
    'Action Camera',
    'Rugged 4K action camera for adventure filming and hands-free mounting.',
    'https://images.unsplash.com/photo-1519183071298-a2962ae0b2f4?auto=format&fit=crop&w=800&q=80',
    210,
    799,
    false,
    true,
    '00000000-0000-0000-0000-000000000002'
  );

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  duration_type text not null check (duration_type in ('hour', 'day')),
  duration_value int not null check (duration_value > 0),
  total_price numeric not null check (total_price >= 0),
  payment_type text not null check (payment_type in ('full', '50-50', 'upi')),
  payment_method text not null check (payment_method in ('upi', 'other')),
  damage_policy_accepted boolean not null default false,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
