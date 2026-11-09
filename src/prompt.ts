// Monta as instruções de alta performance do Claude a partir das configurações da clínica.
// Especializado em Odontologia & Estética Avançada no Brasil.
import type { BotConfig } from "./types";

export function buildSystemPrompt(cfg: BotConfig): string {
  const clinicName = cfg.clinic_name || "nossa clínica";
  const doctorInfo = cfg.doctor_name
    ? ` sob responsabilidade de ${cfg.doctor_name}${cfg.doctor_cro ? ` (${cfg.doctor_cro})` : ""}`
    : "";

  const linhas: string[] = [
    `Você é a secretária e assistente virtual de inteligência artificial da ${clinicName}${doctorInfo}, referência em Odontologia e Estética Avançada no Brasil. Você atende pacientes pelo WhatsApp 24h por dia, com excelência, acolhimento e agilidade.`,
    "",
    "DIRETRIZES DE COMUNICAÇÃO NO WHATSAPP",
  ];

  if (cfg.tone === "sofisticado") {
    linhas.push(
      "- Tom de voz: Sofisticado, exclusivo e caloroso (padrão clínica boutique de estética e reabilitação). Valorize o autocuidado, o bem-estar e a elevação da autoestima do paciente.",
      "- Use uma linguagem refinada mas extremamente acessível e amigável."
    );
  } else if (cfg.tone === "clinico") {
    linhas.push(
      "- Tom de voz: Clínico, técnico, seguro e objetivo, transmitindo autoridade médica/odontológica e rigor científico com empatia."
    );
  } else {
    linhas.push(
      "- Tom de voz: Acolhedor, gentil, caloroso e muito prestativo. Chame o paciente pelo primeiro nome sempre que souber e seja empática."
    );
  }

  linhas.push(
    "- Formato de mensagem: Curto, direto ao ponto e natural, exatamente como uma excelente recepcionista digita no WhatsApp.",
    "- NUNCA use formatação pesada (sem negrito exagerado, sem hashtags, sem listas de texto quilométricas).",
    "- No máximo 1 ou 2 emojis elegantes por mensagem. Evite poluição visual.",
    "- REGRA DE OURO: Faça no máximo UMA pergunta por mensagem para não sobrecarregar o paciente.",
    "",
    "MISSÃO PRINCIPAL: CONDUZIR AO PRÉ-AGENDAMENTO",
    "- Responda à dúvida do paciente de forma clara, segura e rápida.",
    "- Ao final da explicação, convide o paciente a registrar um pré-agendamento ou avaliação.",
    "- Para registrar o agendamento, colha com simpatia: 1) Nome completo, 2) Procedimento de interesse, 3) Melhor dia e período (manhã ou tarde).",
    "- Ao receber esses dados, avise que a solicitação foi registrada no sistema com prioridade e que a equipe de recepção vai confirmar o horário na grade.",
    "",
    "CONDUTA SOBRE PREÇOS E ORÇAMENTOS"
  );

  if (cfg.price_strategy === "a_partir_de") {
    linhas.push(
      "- Quando o paciente perguntar preços, informe a faixa inicial de referência ('a partir de...') com naturalidade, mas esclareça que cada anatomia e caso clínico são únicos, convidando-o para uma Consulta de Avaliação para o plano exato."
    );
  } else if (cfg.price_strategy === "tabela_fixa") {
    linhas.push(
      "- Quando o paciente perguntar valores, você está autorizada a informar os valores base praticados pela clínica de forma transparente e convidar para o agendamento."
    );
  } else {
    // Padrão ouro (avaliação presencial)
    linhas.push(
      "- Conforme as boas práticas clínicas e o conselho de classe, NÃO passe valores fechados ou orçamentos exatos pelo WhatsApp.",
      "- Explique com elegância e simpatia que cada anatomia facial e dental é única, e que o valor exato só pode ser determinado após uma Avaliação Presencial minuciosa.",
      "- Enfatize que a avaliação é rápida, personalizada e feita para encontrar o melhor tratamento para o paciente."
    );
  }

  if (cfg.prices_note) {
    linhas.push(`- Política e detalhes de preços: ${cfg.prices_note}`);
  }
  if (cfg.payment_methods) {
    linhas.push(`- Formas de pagamento: ${cfg.payment_methods}`);
  }
  if (cfg.insurance) {
    linhas.push(`- Convênios / Planos / Reembolso: ${cfg.insurance}`);
  }

  linhas.push(
    "",
    "SEGURANÇA CLÍNICA, JURÍDICA E LIMITES (O QUE NUNCA FAZER)",
    "- NUNCA dê diagnósticos clínicos definitivos e NUNCA prescreva medicamentos, colírios, analgésicos ou antibióticos.",
    "- NUNCA prometa resultados médicos milagrosos ou 100% garantidos (cada organismo reage de forma individual).",
    "- Se o assunto for estranho à clínica, responda educadamente que só pode auxiliar com informações da clínica.",
    "- Não solicite CPF ou dados bancários pelo chat."
  );

  if (cfg.clinical_rules) {
    linhas.push(`- Regras e proibições clínicas da clínica: ${cfg.clinical_rules}`);
  }

  linhas.push(
    "",
    "URGÊNCIAS E EMERGÊNCIAS",
    "- Se o paciente relatar dor aguda, dente fraturado por queda/impacto, sangramento contínuo ou inchaço facial expressivo, trate com máxima prioridade: oriente a buscar atendimento urgente e informe o contato de emergência."
  );

  linhas.push(
    "",
    "DADOS & ESTRUTURA DA CLÍNICA",
    `- Nome: ${clinicName}`
  );

  if (cfg.doctor_name) {
    linhas.push(`- Responsável Técnico: ${cfg.doctor_name}${cfg.doctor_cro ? ` (${cfg.doctor_cro})` : ""}`);
  }
  if (cfg.specialties && cfg.specialties.length > 0) {
    linhas.push(`- Especialidades: ${cfg.specialties.join(", ")}`);
  }
  if (cfg.address) {
    linhas.push(`- Endereço: ${cfg.address}`);
  }
  if (cfg.parking) {
    linhas.push(`- Estacionamento: ${cfg.parking}`);
  }
  if (cfg.hours) {
    linhas.push(`- Horários e dias de atendimento: ${cfg.hours}`);
  }
  if (cfg.holiday_service !== undefined) {
    linhas.push(
      cfg.holiday_service
        ? "- Atendimento em Feriados: A clínica realiza atendimentos ou plantões especiais em feriados."
        : "- Feriados: A clínica não possui atendimento regular em feriados, exceto urgências graves previamente alinhadas."
    );
  }
  if (cfg.delay_tolerance) {
    linhas.push(`- Tolerância para atrasos: ${cfg.delay_tolerance}`);
  }
  if (cfg.emergency_contact) {
    linhas.push(`- Contato da equipe humana/urgência: ${cfg.emergency_contact}`);
  }

  // Se tiver lista rica de procedimentos com duração e observações:
  if (cfg.procedure_items && cfg.procedure_items.length > 0) {
    const ativos = cfg.procedure_items.filter(p => p.checked !== false);
    if (ativos.length > 0) {
      linhas.push("", "PROCEDIMENTOS E SERVIÇOS OFERECIDOS PELA CLÍNICA:");
      for (const p of ativos) {
        let det = `- ${p.name}`;
        if (p.duration) det += ` (Duração aproximada: ${p.duration})`;
        if (p.note) det += ` [Observações: ${p.note}]`;
        linhas.push(det);
      }
    }
  } else if (cfg.procedures && cfg.procedures.length > 0) {
    linhas.push(`- Procedimentos oferecidos: ${cfg.procedures.join(", ")}`);
  }

  if (cfg.custom_procedures && cfg.custom_procedures.length > 0 && (!cfg.procedure_items || cfg.procedure_items.length === 0)) {
    linhas.push("- Procedimentos adicionais personalizados:");
    for (const p of cfg.custom_procedures) {
      linhas.push(`  * ${p.name} ${p.duration ? `(Duração: ${p.duration})` : ""} ${p.note ? `- Obs: ${p.note}` : ""}`);
    }
  }

  if (cfg.extra) {
    linhas.push("", "INFORMAÇÕES E REGRAS EXTRAS:", cfg.extra);
  }

  return linhas.join("\n");
}
