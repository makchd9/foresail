-- Trigram indexes so server-side ILIKE search stays fast at scale.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Deal_title_trgm_idx" ON "Deal" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "Company_name_trgm_idx" ON "Company" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Contact_name_trgm_idx" ON "Contact" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Contact_email_trgm_idx" ON "Contact" USING GIN ("email" gin_trgm_ops);
