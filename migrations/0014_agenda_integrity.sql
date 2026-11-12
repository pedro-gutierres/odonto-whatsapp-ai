-- Keep legacy data intact. New accounts must write a validated interval and professional.
ALTER TABLE appointments ADD COLUMN ends_at TEXT;
CREATE TRIGGER appointment_insert_guard BEFORE INSERT ON appointments
WHEN NEW.status!='cancelado' AND EXISTS(SELECT 1 FROM tenants WHERE id=NEW.tenant_id AND commercial_status!='legacy') BEGIN
  SELECT CASE WHEN NEW.ends_at IS NULL OR NEW.ends_at<=NEW.scheduled_at OR NOT EXISTS(
    SELECT 1 FROM professionals WHERE id=NEW.professional_id AND tenant_id=NEW.tenant_id AND active=1)
    THEN RAISE(ABORT,'VALID_APPOINTMENT_REQUIRED') END;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM appointments WHERE tenant_id=NEW.tenant_id AND status!='cancelado'
    AND (professional_id=NEW.professional_id OR professional_id IS NULL)
    AND scheduled_at<NEW.ends_at AND COALESCE(ends_at,datetime(scheduled_at,'+30 minutes'))>NEW.scheduled_at)
    THEN RAISE(ABORT,'APPOINTMENT_CONFLICT') END;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM appointment_blocks WHERE tenant_id=NEW.tenant_id AND professional_id=NEW.professional_id
    AND starts_at<NEW.ends_at AND ends_at>NEW.scheduled_at) THEN RAISE(ABORT,'APPOINTMENT_CONFLICT') END;
END;
CREATE TRIGGER appointment_update_guard BEFORE UPDATE ON appointments
WHEN NEW.status!='cancelado' AND (NEW.scheduled_at IS NOT OLD.scheduled_at OR NEW.ends_at IS NOT OLD.ends_at
  OR NEW.professional_id IS NOT OLD.professional_id OR OLD.status='cancelado')
  AND EXISTS(SELECT 1 FROM tenants WHERE id=NEW.tenant_id AND commercial_status!='legacy') BEGIN
  SELECT CASE WHEN NEW.ends_at IS NULL OR NEW.ends_at<=NEW.scheduled_at OR NOT EXISTS(
    SELECT 1 FROM professionals WHERE id=NEW.professional_id AND tenant_id=NEW.tenant_id AND active=1)
    THEN RAISE(ABORT,'VALID_APPOINTMENT_REQUIRED') END;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM appointments WHERE tenant_id=NEW.tenant_id AND id!=NEW.id AND status!='cancelado'
    AND (professional_id=NEW.professional_id OR professional_id IS NULL)
    AND scheduled_at<NEW.ends_at AND COALESCE(ends_at,datetime(scheduled_at,'+30 minutes'))>NEW.scheduled_at)
    THEN RAISE(ABORT,'APPOINTMENT_CONFLICT') END;
  SELECT CASE WHEN EXISTS(SELECT 1 FROM appointment_blocks WHERE tenant_id=NEW.tenant_id AND professional_id=NEW.professional_id
    AND starts_at<NEW.ends_at AND ends_at>NEW.scheduled_at) THEN RAISE(ABORT,'APPOINTMENT_CONFLICT') END;
END;
CREATE TRIGGER professional_added AFTER INSERT ON professionals BEGIN
  UPDATE tenants SET agenda_ready_at=NULL WHERE id=NEW.tenant_id AND commercial_status!='legacy';
END;
CREATE TRIGGER professional_schedule_changed AFTER UPDATE OF working_days,start_hour,end_hour,break_start,break_end,active,procedures_json ON professionals BEGIN
  UPDATE tenants SET agenda_ready_at=NULL WHERE id=NEW.tenant_id AND commercial_status!='legacy';
END;
CREATE TRIGGER professional_removed AFTER DELETE ON professionals BEGIN
  UPDATE tenants SET agenda_ready_at=NULL WHERE id=OLD.tenant_id AND commercial_status!='legacy';
END;
