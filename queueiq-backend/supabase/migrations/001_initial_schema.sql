-- Organizations (clinics, banks, universities, etc.)
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  city text,
  area text,
  plan text default 'starter',
  avg_rating numeric default 0,
  review_count int default 0,
  created_at timestamptz default now()
);

-- Users (patients/customers)
create table users (
  id uuid primary key default gen_random_uuid(),
  full_name text,
  phone text unique not null,
  whatsapp_opt_in boolean default true,
  preferred_language text default 'en',
  wallet_credit numeric default 0,
  created_at timestamptz default now()
);

-- Doctors / service providers
create table doctors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  name text not null,
  specialty text,
  is_available boolean default true,
  created_at timestamptz default now()
);

-- Appointments
create table appointments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete cascade,
  doctor_id uuid references doctors(id) on delete set null,
  slot_time timestamptz not null,
  status text default 'booked' check (status in ('booked','completed','no_show','cancelled','rescheduled')),
  created_at timestamptz default now()
);

-- Tokens (Normal / Express / Emergency)
create table tokens (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments(id) on delete cascade,
  token_type text not null check (token_type in ('normal','express','emergency')),
  token_number int,
  price numeric,
  queue_position int,
  created_at timestamptz default now()
);

-- Reviews / ratings
create table reviews (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  appointment_id uuid references appointments(id) on delete set null,
  rating int check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

-- Payments
create table payments (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references appointments(id) on delete cascade,
  method text check (method in ('jazzcash','easypaisa')),
  transaction_id text,
  amount numeric,
  status text default 'pending' check (status in ('pending','verified','failed')),
  created_at timestamptz default now()
);

-- Notifications log
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  type text,
  channel text default 'whatsapp' check (channel in ('whatsapp','sms')),
  content text,
  sent_at timestamptz default now()
);