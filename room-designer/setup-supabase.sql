-- Room Designer — Supabase schema
-- GENERATED from the live database (project cpnqippzgcezidoorwry). Do not hand-edit.
-- The previous version of this file described 13 columns; the real table
-- had 44, so anything rebuilt from it came up silently broken.
-- Regenerate:  scripts/dump-schema.sh <connection-string>

CREATE TABLE IF NOT EXISTS price_lists (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name character varying(255) NOT NULL,
  description text,
  prices jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by character varying(255),
  PRIMARY KEY (id)
);
CREATE TABLE IF NOT EXISTS room_design_shares (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  design_id uuid,
  share_token character varying(24) NOT NULL,
  permission_level character varying(20) DEFAULT 'quote_view'::character varying NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone,
  access_count integer DEFAULT 0,
  last_accessed_at timestamp with time zone,
  comments jsonb DEFAULT '[]'::jsonb,
  lead_id uuid,
  FOREIGN KEY (design_id) REFERENCES room_designs(id) ON DELETE CASCADE,
  PRIMARY KEY (id),
  UNIQUE (share_token)
);
CREATE TABLE IF NOT EXISTS room_designs (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  share_token character varying(24) NOT NULL,
  project_name character varying(255) DEFAULT 'Untitled Design'::character varying,
  room_type character varying(50) DEFAULT 'kitchen'::character varying,
  room_width numeric(10,4) DEFAULT 12,
  room_depth numeric(10,4) DEFAULT 10,
  elements jsonb DEFAULT '[]'::jsonb NOT NULL,
  walls jsonb DEFAULT '[]'::jsonb NOT NULL,
  pricing_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by character varying(255),
  expires_at timestamp with time zone,
  amount_paid numeric,
  assigned_to uuid,
  assigned_to_name text,
  collaborators jsonb,
  comments_count integer,
  completed_date timestamp with time zone,
  customer_address text,
  customer_email text,
  customer_id uuid,
  customer_name text,
  customer_phone text,
  deposit_amount numeric,
  is_public boolean,
  lead_id uuid,
  name text,
  payment_status text,
  preview_url text,
  quote_approved_at timestamp with time zone,
  quote_expires_at timestamp with time zone,
  quote_notes text,
  quote_sent_at timestamp with time zone,
  quote_total numeric,
  quote_version integer,
  quote_viewed_at timestamp with time zone,
  rooms jsonb,
  scheduled_date timestamp with time zone,
  settings jsonb,
  share_mode text,
  status text,
  stripe_customer_id text,
  stripe_payment_intent_id text,
  thumbnail_url text,
  user_id uuid,
  PRIMARY KEY (id),
  UNIQUE (share_token)
);

-- Indexes
CREATE INDEX idx_price_lists_created ON public.price_lists USING btree (created_at DESC);
CREATE UNIQUE INDEX price_lists_pkey ON public.price_lists USING btree (id);
CREATE INDEX idx_room_design_shares_design ON public.room_design_shares USING btree (design_id);
CREATE INDEX idx_room_design_shares_token ON public.room_design_shares USING btree (share_token);
CREATE UNIQUE INDEX room_design_shares_pkey ON public.room_design_shares USING btree (id);
CREATE UNIQUE INDEX room_design_shares_share_token_key ON public.room_design_shares USING btree (share_token);
CREATE INDEX idx_room_designs_created ON public.room_designs USING btree (created_at DESC);
CREATE INDEX idx_room_designs_token ON public.room_designs USING btree (share_token);
CREATE UNIQUE INDEX room_designs_pkey ON public.room_designs USING btree (id);
CREATE UNIQUE INDEX room_designs_share_token_key ON public.room_designs USING btree (share_token);

-- Row Level Security
ALTER TABLE price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_design_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_designs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anonymous delete price_lists" ON price_lists FOR DELETE USING (true);
CREATE POLICY "Allow anonymous insert price_lists" ON price_lists FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anonymous read price_lists" ON price_lists FOR SELECT USING (true);
CREATE POLICY "Allow anonymous update price_lists" ON price_lists FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous delete room_design_shares" ON room_design_shares FOR DELETE USING (true);
CREATE POLICY "Allow anonymous insert room_design_shares" ON room_design_shares FOR INSERT WITH CHECK (true);
CREATE POLICY "read shares on own designs" ON room_design_shares FOR SELECT USING (((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM room_designs d
  WHERE ((d.id = room_design_shares.design_id) AND (d.user_id = auth.uid()))))));
CREATE POLICY "Allow anonymous update room_design_shares" ON room_design_shares FOR UPDATE USING (true);
CREATE POLICY "Allow anonymous insert room_designs" ON room_designs FOR INSERT WITH CHECK (true);
CREATE POLICY "read own or public designs" ON room_designs FOR SELECT USING (((COALESCE(is_public, false) = true) OR ((auth.uid() IS NOT NULL) AND (user_id = auth.uid()))));
CREATE POLICY "Allow anonymous update room_designs" ON room_designs FOR UPDATE USING (true);

-- Token-keyed readers. Reads run as the owner so callers never need
-- blanket SELECT; possession of the share token is the authorisation.
CREATE OR REPLACE FUNCTION public.cleanup_old_designs()
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM room_designs
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND id NOT IN (SELECT DISTINCT design_id FROM room_design_shares WHERE design_id IS NOT NULL);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$
;
CREATE OR REPLACE FUNCTION public.get_share_record(p_token text)
 RETURNS SETOF room_design_shares
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.* FROM room_design_shares s
  WHERE s.share_token = p_token
    AND (s.expires_at IS NULL OR s.expires_at > now())
  ORDER BY s.created_at DESC
  LIMIT 1;
$function$
;
CREATE OR REPLACE FUNCTION public.get_shared_design(p_token text)
 RETURNS SETOF room_designs
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT d.* FROM room_designs d
  WHERE d.share_token = p_token
    AND (d.expires_at IS NULL OR d.expires_at > now())
  UNION
  SELECT d.* FROM room_designs d
  JOIN room_design_shares s ON s.design_id = d.id
  WHERE s.share_token = p_token
    AND (s.expires_at IS NULL OR s.expires_at > now())
  LIMIT 1;
$function$
;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;
-- Triggers
DROP TRIGGER IF EXISTS update_room_designs_updated_at ON room_designs;
CREATE TRIGGER update_room_designs_updated_at BEFORE UPDATE ON room_designs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_price_lists_updated_at ON price_lists;
CREATE TRIGGER update_price_lists_updated_at BEFORE UPDATE ON price_lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

GRANT EXECUTE ON FUNCTION public.get_shared_design(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_share_record(text) TO anon, authenticated;
