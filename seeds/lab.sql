-- Clínica de teste (laboratório).
-- ANTES de executar em novo ambiente: confirme o "Phone number ID" real no painel da Meta (API Setup).
INSERT INTO tenants (id, name, phone_number_id, bot_config, active) VALUES (
  'lab',
  'Clínica Teste',
  '1459702903890342',
  '{"clinic_name":"Clínica Sorriso Teste","tone":"acolhedor","address":"Rua Exemplo, 123 - Centro, Rio de Janeiro","hours":"Segunda a sexta, 8h às 18h; sábado, 8h às 12h","initial_consultation":{"duration":"30 min","price":"","details":"Avaliação presencial completa com plano de tratamento personalizado."},"procedure_items":[{"name":"Limpeza & Profilaxia","checked":true,"duration":"40 min","note":"Remoção de tártaro, placa bacteriana e polimento","category":"odonto"},{"name":"Clareamento Dental a Laser","checked":true,"duration":"1h","note":"Clareamento de consultório com proteção gengival","category":"odonto"},{"name":"Restaurações Estéticas","checked":true,"duration":"45 min","note":"Resina composta na cor natural do dente","category":"odonto"},{"name":"Ortodontia / Alinhadores","checked":true,"duration":"30 min","note":"Avaliação de alinhadores invisíveis e aparelhos","category":"odonto"},{"name":"Toxina Botulínica (Botox)","checked":true,"duration":"30 min","note":"Aplicação em terço superior, glabela e pés de galinha","category":"estetica"},{"name":"Preenchimento Labial","checked":true,"duration":"45 min","note":"Ácido hialurônico para contorno e volume natural","category":"estetica"}],"procedures":["Limpeza & Profilaxia","Clareamento Dental a Laser","Restaurações Estéticas","Ortodontia / Alinhadores","Toxina Botulínica (Botox)","Preenchimento Labial"],"prices_note":"Valores são informados somente na avaliação presencial com o especialista.","emergency_contact":"Para urgências, ligue para (21) 0000-0000 durante o horário de atendimento."}',
  1
)
ON CONFLICT(id) DO UPDATE SET
  name = excluded.name,
  phone_number_id = excluded.phone_number_id,
  bot_config = excluded.bot_config,
  active = excluded.active;

-- Usuários iniciais de desenvolvimento/teste (senha inicial padrão: 'admin123' — altere em /admin em produção)
INSERT OR IGNORE INTO users (tenant_id, email, password_hash, name, role) VALUES
  ('lab', 'pedrogutierres@protonmail.com', '219f1b54263a28a320ddb777b89011a54d75d32bc5d0e6b20b9fdbdc02d61876', 'Pedro Gutierres', 'superadmin'),
  ('lab', 'admin@clinica.com', '219f1b54263a28a320ddb777b89011a54d75d32bc5d0e6b20b9fdbdc02d61876', 'Dra. Fernanda (Admin)', 'admin');
