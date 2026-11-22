import { CANARY, REFUSAL_SECRET } from "./prompts";

/* ---------- 1. obvious extraction attempts never reach the model ---------- */

const EXTRACTION = [
  // English
  /ignore\s+(all\s+|any\s+|the\s+)?(previous|prior|above|earlier)\s+(instructions|rules|prompts?)/i,
  /(forget|disregard|override)\s+(all\s+|your\s+|the\s+)?(instructions|rules|guidelines|prompt)/i,
  /(system|initial|hidden|secret|original|developer)\s+(prompt|message|instructions)/i,
  /(repeat|print|reveal|show|output|dump|leak|display)\s+(me\s+)?(the\s+|your\s+)?(text|words|everything)\s+(above|before)/i,
  /(what|tell me)\s+(are|were)\s+your\s+(instructions|rules|guidelines)/i,
  /\b(developer|dev|god|debug|admin|maintenance|sudo|jailbreak|dan)\s+mode\b/i,
  /\bdo anything now\b/i,
  /\b(api|secret|private|access)\s*[-_ ]?(key|token)s?\b/i,
  /\b(env(ironment)?\s+variables?|process\.env|\.env\b|BLOB_READ_WRITE|_API_KEY)/i,
  /\b(show|give|send|print|reveal|share|paste|leak)\s+(me\s+)?(your|the|felt'?s|nimbus'?s|this\s+(app|site)'?s?)\s+(source\s+)?code\b/i,
  /\b(codebase|source\s+code\s+of\s+(felt|nimbus|this))\b/i,
  // Russian
  /(игнорир|забудь|отмени)\w*\s+(все\s+|предыдущ\w*\s+|прошл\w*\s+)*(инструкц|правил|указан)/i,
  /(системн\w*|скрыт\w*|исходн\w*|секретн\w*)\s+(промпт|инструкц|сообщени|подсказ)/i,
  /(покажи|выведи|напиши|раскрой|повтори)\s+(свой\s+|свои\s+|твой\s+|твои\s+)?(промпт|инструкц|правила|текст\s+выше)/i,
  /(api|апи)[\s-]*(ключ|токен)|ключ\w*\s+api|токен\w*\s+доступа/i,
  /(покажи|дай|скинь|выведи|раскрой|пришли)\s+(мне\s+)?(свой\s+|твой\s+|исходн\w*\s+)*код/i,
  /(код\s+(этого\s+)?(сайта|приложения|проекта|nimbus|felt)|переменн\w*\s+окружени)/i,
  /режим\s+(разработчика|отладки|администратора|бога)/i,
];

export function looksLikeExtraction(text: string): boolean {
  return EXTRACTION.some((re) => re.test(text));
}

/* ---------- 2. every reply is scrubbed on the way out ---------- */

const SECRET_SHAPES = [
  /[a-z]+-[A-Za-z0-9]{32,}/,
  /sk-(ant-)?[A-Za-z0-9_-]{20,}/,
  /vercel_blob_rw_[A-Za-z0-9_]+/i,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/, // JWT-like
  /\b(BLOB_READ_WRITE_TOKEN|[A-Z]+_API_KEY|DATABASE_URL)\b/,
  /postgres(ql)?:\/\/\S+/i,
  /```/, // code blocks never belong in Nimbus' answers
  /\bsrc\/(lib|app|components)\//,
];

/** Returns a safe reply: the original, trimmed — or the refusal if anything looks leaked. */
export function scrubReply(text: string, maxLength = 1200): string {
  const leaked = text.includes(CANARY) || /FELT-CANARY/i.test(text) || SECRET_SHAPES.some((re) => re.test(text));
  if (leaked) return REFUSAL_SECRET;
  const plain = text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/^#+\s*/gm, "").trim();
  return plain.length > maxLength ? `${plain.slice(0, maxLength).trimEnd()}…` : plain;
}

/* ---------- 3. untrusted text is fenced so it cannot close its own block ---------- */

export function fence(tag: string, text: string): string {
  const safe = text.replace(/<\/?\s*[a-z_]+\s*>/gi, (m) => m.replace(/</g, "‹").replace(/>/g, "›"));
  return `<${tag}>\n${safe}\n</${tag}>`;
}

export function cleanInput(text: string, max: number): string {
  // drop control/zero-width characters often used to smuggle instructions
  return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F​-‏‪-‮⁠-⁤﻿]/g, "").slice(0, max);
}
