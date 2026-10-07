
CREATE TABLE public.competitors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  hq_state text NOT NULL,
  categories text[] NOT NULL,
  turnover_cr numeric NOT NULL,
  is_msme boolean NOT NULL DEFAULT false,
  pricing_style text NOT NULL,
  description text NOT NULL
);
GRANT SELECT ON public.competitors TO authenticated;
GRANT ALL ON public.competitors TO service_role;
ALTER TABLE public.competitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "competitors readable" ON public.competitors FOR SELECT TO authenticated USING (true);

CREATE TABLE public.awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  buyer text NOT NULL,
  category text NOT NULL,
  state text NOT NULL,
  winner_id uuid NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  estimated_cr numeric NOT NULL,
  awarded_cr numeric NOT NULL,
  bidders int NOT NULL,
  awarded_on date NOT NULL,
  payment_days int NOT NULL
);
GRANT SELECT ON public.awards TO authenticated;
GRANT ALL ON public.awards TO service_role;
ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "awards readable" ON public.awards FOR SELECT TO authenticated USING (true);

CREATE TABLE public.company_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  doc_type text NOT NULL,
  expiry_date date,
  file_path text,
  file_size bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_documents TO authenticated;
GRANT ALL ON public.company_documents TO service_role;
ALTER TABLE public.company_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own docs" ON public.company_documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.guarantees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL DEFAULT 'EMD',
  tender_id uuid REFERENCES public.tenders(id) ON DELETE SET NULL,
  beneficiary text NOT NULL,
  bank text NOT NULL,
  instrument_no text,
  amount_lakh numeric NOT NULL,
  issued_on date NOT NULL DEFAULT current_date,
  expiry_date date NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.guarantees TO authenticated;
GRANT ALL ON public.guarantees TO service_role;
ALTER TABLE public.guarantees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own guarantees" ON public.guarantees FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  keyword text,
  category text,
  state text,
  min_value_cr numeric,
  min_fit int,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_rules TO authenticated;
GRANT ALL ON public.alert_rules TO service_role;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rules" ON public.alert_rules FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "own files read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own files insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own files delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='documents' AND (storage.foldername(name))[1] = auth.uid()::text);

INSERT INTO public.competitors (name,hq_state,categories,turnover_cr,is_msme,pricing_style,description) VALUES
('Suryodaya Renewables Pvt Ltd','Gujarat',ARRAY['Solar & Renewable','Electrical'],140,false,'Aggressive','Rooftop and ground-mount solar EPC; frequently L1 on SECI and state nodal agency tenders.'),
('Bharat Lumina Industries','Uttar Pradesh',ARRAY['Electrical'],62,true,'Aggressive','LED luminaire manufacturer with strong municipal rate-contract presence.'),
('Deccan Infraprojects Ltd','Telangana',ARRAY['Civil Construction','Water & Pipes'],920,false,'Balanced','Large EPC contractor for flyovers, highways and water schemes.'),
('NexaGov Technologies','Karnataka',ARRAY['IT & Software','IT Hardware'],210,false,'Premium','GovTech SaaS & system integrator; wins on technical score in QCBS tenders.'),
('MediSure Healthcare Supplies','Tamil Nadu',ARRAY['Medical & Healthcare'],78,true,'Aggressive','Surgical consumables distributor across southern state medical corporations.'),
('Volt-Tran Electricals','Rajasthan',ARRAY['Electrical'],180,false,'Balanced','Distribution transformer manufacturer, BEE 3-star portfolio.'),
('CleanSpace Facility Services','Delhi',ARRAY['Facility Management'],95,false,'Aggressive','Integrated facility management for central government campuses.'),
('Ganga Pipes & Castings','West Bengal',ARRAY['Water & Pipes'],460,false,'Balanced','DI pipe manufacturer supplying Jal Jeevan Mission projects.'),
('Infosphere Networks','Maharashtra',ARRAY['IT & Software','IT Hardware'],330,false,'Balanced','Networking SI for BFSI and PSU branch networks.'),
('Kalpana Office Systems','Madhya Pradesh',ARRAY['Furniture'],34,true,'Aggressive','Modular office furniture maker, GeM-heavy seller.'),
('Pragati Electro-Mech Contractors','Odisha',ARRAY['Electrical','Civil Construction'],250,false,'Premium','Station and building MEP contractor for railways.'),
('Arogya Pharma Distributors','Uttar Pradesh',ARRAY['Medical & Healthcare'],55,true,'Balanced','Regional distributor for district hospital supplies.');

INSERT INTO public.awards (title,buyer,category,state,winner_id,estimated_cr,awarded_cr,bidders,awarded_on,payment_days)
SELECT
  c.categories[1] || ' contract #' || (2400+i),
  (ARRAY['Solar Energy Corporation of India','Municipal Corporation','Public Works Department','State IT Department','State Medical Services Corporation','State Power Distribution Company','Central Public Works Department','State Water Supply & Sewerage Board','Public Sector Bank','Samagra Shiksha Abhiyan','Rail Land Development Authority','District Collectorate'])[1 + (i % 12)],
  c.categories[1],
  (ARRAY['Maharashtra','Uttar Pradesh','Gujarat','Karnataka','Tamil Nadu','Rajasthan','Delhi','West Bengal','Telangana','Madhya Pradesh','Odisha'])[1 + (i % 11)],
  c.id,
  e.est,
  round(e.est * (CASE c.pricing_style WHEN 'Aggressive' THEN 0.78 WHEN 'Balanced' THEN 0.87 ELSE 0.95 END + ((i*13)%9)/100.0), 2),
  3 + (i*7)%9,
  date '2026-09-30' - (i*5),
  (ARRAY[30,45,60,90,120])[1 + (i % 5)]
FROM generate_series(1,144) i
JOIN LATERAL (SELECT * FROM public.competitors ORDER BY name OFFSET (i % 12) LIMIT 1) c ON true
CROSS JOIN LATERAL (SELECT round((c.turnover_cr * (0.02 + ((i*17)%15)/100.0))::numeric, 2) AS est) e;
