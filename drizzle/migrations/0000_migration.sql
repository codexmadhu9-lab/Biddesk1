
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  company_name text,
  industry text,
  categories text[] NOT NULL DEFAULT '{}',
  states text[] NOT NULL DEFAULT '{}',
  annual_turnover_cr numeric NOT NULL DEFAULT 0,
  years_in_business int NOT NULL DEFAULT 0,
  certifications text[] NOT NULL DEFAULT '{}',
  is_msme boolean NOT NULL DEFAULT false,
  onboarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)));
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.tenders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_no text NOT NULL,
  title text NOT NULL,
  buyer text NOT NULL,
  ministry text NOT NULL,
  source text NOT NULL,
  category text NOT NULL,
  state text NOT NULL,
  city text NOT NULL,
  value_cr numeric NOT NULL,
  emd_lakh numeric NOT NULL,
  published_at date NOT NULL,
  deadline timestamptz NOT NULL,
  description text NOT NULL,
  min_turnover_cr numeric NOT NULL DEFAULT 0,
  min_experience_yrs int NOT NULL DEFAULT 0,
  required_certs text[] NOT NULL DEFAULT '{}',
  documents text[] NOT NULL DEFAULT '{}',
  msme_emd_exempt boolean NOT NULL DEFAULT true,
  tender_type text NOT NULL DEFAULT 'Open',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tenders TO authenticated;
GRANT ALL ON public.tenders TO service_role;
ALTER TABLE public.tenders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenders readable" ON public.tenders FOR SELECT TO authenticated USING (true);

CREATE TABLE public.watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tender_id)
);
GRANT SELECT, INSERT, DELETE ON public.watchlist TO authenticated;
GRANT ALL ON public.watchlist TO service_role;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own watchlist" ON public.watchlist FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  stage text NOT NULL DEFAULT 'Qualifying',
  quoted_value_cr numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tender_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bids TO authenticated;
GRANT ALL ON public.bids TO service_role;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bids" ON public.bids FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.bid_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  bid_id uuid NOT NULL REFERENCES public.bids(id) ON DELETE CASCADE,
  title text NOT NULL,
  assignee text,
  due_date date,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bid_tasks TO authenticated;
GRANT ALL ON public.bid_tasks TO service_role;
ALTER TABLE public.bid_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tasks" ON public.bid_tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.tender_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  tender_id uuid NOT NULL REFERENCES public.tenders(id) ON DELETE CASCADE,
  analysis jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, tender_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tender_analyses TO authenticated;
GRANT ALL ON public.tender_analyses TO service_role;
ALTER TABLE public.tender_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own analyses" ON public.tender_analyses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO public.tenders (ref_no,title,buyer,ministry,source,category,state,city,value_cr,emd_lakh,published_at,deadline,description,min_turnover_cr,min_experience_yrs,required_certs,documents,msme_emd_exempt,tender_type)
SELECT
  CASE WHEN s.src='GeM' THEN 'GEM/2026/B/'||(5400000+i*137) ELSE '2026_'||upper(left(s.st,3))||'_'||(81000+i*53)||'_1' END,
  t.title, t.buyer, t.ministry, s.src, t.cat, s.st, s.city,
  round((t.base * (0.6 + ((i*37)%90)/100.0))::numeric, 2),
  round((t.base * (0.6 + ((i*37)%90)/100.0) * 2)::numeric, 1),
  (date '2026-10-06' - ((i*3)%21)),
  (timestamptz '2026-10-06 15:00+05:30' + ((((i*7)%40) - 3) || ' days')::interval),
  t.descr, round((t.base*1.5)::numeric,1), t.exp, t.certs,
  ARRAY['PAN & GST registration','Last 3 years audited balance sheets','Similar work completion certificates','Technical compliance sheet','Price bid (BOQ)','Undertaking against blacklisting'],
  (i%4<>0), CASE WHEN i%5=0 THEN 'Limited' ELSE 'Open' END
FROM generate_series(1,42) i
CROSS JOIN LATERAL (SELECT * FROM (VALUES
 (0,'Supply, installation & commissioning of 2.5 MW grid-connected rooftop solar PV plants','Solar Energy Corporation of India','Ministry of New & Renewable Energy','Solar & Renewable',12.0,5,ARRAY['ISO 9001','MNRE Empanelment'],'Design, supply, installation, testing and commissioning of rooftop solar PV systems across government buildings including 5-year comprehensive O&M.'),
 (1,'Annual rate contract for supply of LED street lights (90W & 120W)','Municipal Corporation','Ministry of Housing & Urban Affairs','Electrical',3.2,3,ARRAY['BIS Certification','ISO 9001'],'Rate contract for LED street luminaires with 5-year warranty, BIS-compliant drivers and smart CCMS readiness.'),
 (2,'Construction of 4-lane flyover with approach roads (EPC mode)','Public Works Department','Ministry of Road Transport & Highways','Civil Construction',85.0,7,ARRAY['Class-AA Contractor Registration'],'EPC contract for a 1.2 km four-lane elevated corridor including service roads, drainage, utility shifting and road furniture.'),
 (3,'Implementation of cloud-based HRMS & payroll for state employees','State IT Department','Ministry of Electronics & IT','IT & Software',6.5,4,ARRAY['ISO 27001','CMMI Level 3'],'SaaS-based HRMS covering 1.2 lakh employees: payroll, leave, attendance, e-service book and grievance modules with 3-year support.'),
 (4,'Procurement of medical consumables & surgical items for district hospitals','State Medical Services Corporation','Ministry of Health & Family Welfare','Medical & Healthcare',4.8,3,ARRAY['WHO-GMP','CDSCO Licence'],'Two-year rate contract for surgical gloves, syringes, sutures, IV sets and dressing material for 38 district hospitals.'),
 (5,'Supply of 11kV/433V distribution transformers (100–250 kVA)','State Power Distribution Company','Ministry of Power','Electrical',9.5,5,ARRAY['BIS Certification','BEE Star Rating','ISO 9001'],'Supply of BEE 3-star rated oil-cooled distribution transformers with type test reports from NABL labs.'),
 (6,'Comprehensive facility management services for central secretariat','Central Public Works Department','Ministry of Housing & Urban Affairs','Facility Management',2.4,3,ARRAY['ISO 9001','ISO 14001'],'Integrated housekeeping, MEP maintenance, pest control and front-office services for 4.5 lakh sq ft for 3 years.'),
 (7,'Supply of ductile iron pipes for Jal Jeevan Mission water supply scheme','State Water Supply & Sewerage Board','Ministry of Jal Shakti','Water & Pipes',18.0,5,ARRAY['BIS Certification','ISO 9001'],'Supply of K7/K9 class DI pipes (DN 100–600) with fittings for rural piped water supply covering 120 villages.'),
 (8,'Network modernisation and SD-WAN rollout for 600 bank branches','Public Sector Bank','Department of Financial Services','IT & Software',14.0,5,ARRAY['ISO 27001','OEM Authorisation'],'Design and implementation of SD-WAN, branch routers, NOC monitoring and 5-year managed services.'),
 (9,'Supply of desktop computers & all-in-one PCs for schools','Samagra Shiksha Abhiyan','Ministry of Education','IT Hardware',5.0,3,ARRAY['BIS Certification','OEM Authorisation'],'Supply and installation of 4,000 desktop/AIO units with preloaded OS, 5-year onsite warranty for government schools.'),
 (10,'Railway station redevelopment – electrical & HVAC works','Rail Land Development Authority','Ministry of Railways','Electrical',26.0,6,ARRAY['Electrical Contractor Licence Class-A','ISO 9001'],'Complete electrical, HVAC, fire-fighting and BMS works for a redeveloped A1 category station building.'),
 (11,'Supply of office furniture for new collectorate complex','District Collectorate','Ministry of Rural Development','Furniture',1.6,2,ARRAY['BIFMA / IS compliance'],'Modular workstations, chairs, conference tables and storage units for a 3-floor administrative complex.')
) v(k,title,buyer,ministry,cat,base,exp,certs,descr) WHERE v.k = i % 12) t
CROSS JOIN LATERAL (SELECT * FROM (VALUES
 (0,'GeM','Maharashtra','Pune'),(1,'CPPP','Uttar Pradesh','Lucknow'),(2,'State e-Proc','Gujarat','Ahmedabad'),
 (3,'GeM','Karnataka','Bengaluru'),(4,'CPPP','Tamil Nadu','Chennai'),(5,'State e-Proc','Rajasthan','Jaipur'),
 (6,'GeM','Delhi','New Delhi'),(7,'IREPS','West Bengal','Kolkata'),(8,'State e-Proc','Telangana','Hyderabad'),
 (9,'GeM','Madhya Pradesh','Bhopal'),(10,'CPPP','Odisha','Bhubaneswar')
) w(k,src,st,city) WHERE w.k = i % 11) s;
