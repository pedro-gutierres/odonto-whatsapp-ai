-- Clínica de teste.
-- ANTES de executar: troque o valor marcado abaixo pelo "Phone number ID"
-- que aparece no painel da Meta (API Setup), mantendo as aspas.
INSERT OR REPLACE INTO tenants (id, name, phone_number_id, bot_config) VALUES (
  'lab',
  'Clínica Teste',
  '1459702903890342',
  '{"clinic_name":"Clínica Sorriso Teste","tone":"acolhedor e profissional","address":"Rua Exemplo, 123 - Centro, Rio de Janeiro","hours":"Segunda a sexta, 8h às 18h; sábado, 8h às 12h","procedures":["Limpeza","Clareamento","Restaurações","Ortodontia (aparelhos)","Implantes","Avaliação inicial"],"prices_note":"Valores são informados somente na avaliação, pela equipe.","emergency_contact":"Para urgências, ligue para (21) 0000-0000 durante o horário de atendimento."}'
);
