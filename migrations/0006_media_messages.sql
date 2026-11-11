-- Suporte a anexos de mídia nas mensagens (áudios transcritos e fotos salvas no R2 com expiração de 30 dias)
ALTER TABLE messages ADD COLUMN media_key TEXT;
ALTER TABLE messages ADD COLUMN media_mime TEXT;
ALTER TABLE messages ADD COLUMN media_type TEXT;
