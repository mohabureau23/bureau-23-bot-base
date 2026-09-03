const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

let currentLevel = "info";

/** Masque tout secret éventuel avant écriture console. */
function redact(value) {
  const token = process.env.DISCORD_TOKEN;
  let text =
    typeof value === "string" ? value : safeStringify(value);
  if (token && token.length > 8) {
    text = text.split(token).join("***redacted***");
  }
  return text.replace(
    /[A-Za-z0-9_-]{24,28}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27,}/g,
    "***redacted***",
  );
}

function safeStringify(value) {
  if (value instanceof Error) return `${value.name}: ${value.message}\n${value.stack ?? ""}`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function write(level, message, meta) {
  if (LEVELS[level] < LEVELS[currentLevel]) return;
  const line = `[${new Date().toISOString()}] [${level.toUpperCase()}] ${redact(message)}`;
  const extra = meta === undefined ? "" : ` ${redact(meta)}`;
  const target = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  target(line + extra);
}

export const logger = {
  setLevel(level) {
    if (LEVELS[level]) currentLevel = level;
  },
  debug: (msg, meta) => write("debug", msg, meta),
  info: (msg, meta) => write("info", msg, meta),
  warn: (msg, meta) => write("warn", msg, meta),
  error: (msg, meta) => write("error", msg, meta),
};
