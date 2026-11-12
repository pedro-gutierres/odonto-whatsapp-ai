ALTER TABLE tenants ADD COLUMN business_sectors TEXT CHECK (business_sectors IN ('dentistry','aesthetics','both'));
UPDATE tenants SET business_sectors=business_sector WHERE business_sectors IS NULL AND business_sector IS NOT NULL;
