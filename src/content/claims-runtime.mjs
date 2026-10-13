export const MARKETING_CLAIM_PATTERNS = [
  {
    label: "banned absolute term",
    pattern: /\b(?:greenest|unrivalled|best|guaranteed|always)\b/i,
  },
  {
    label: "absolute environmental claim",
    pattern:
      /\bmost\s+(?:environmentally[\s-]+friendly|eco[\s-]+friendly|sustainable|green)\b/i,
  },
  {
    label: "absolute performance claim",
    pattern: /\b100%\s+(?:effective|reliable|efficient|successful)\b/i,
  },
  {
    label: "absolute safety claim",
    pattern: /\b(?:completely|totally)\s+safe\b/i,
  },
  {
    label: "absolute superiority claim",
    pattern: /\bsuperior\s+to\s+all\b/i,
  },
  {
    label: "absolute reliability claim",
    pattern: /\bnever\s+fails?\b/i,
  },
  {
    label: "absolute risk claim",
    pattern: /\b(?:zero|no)\s+risk\b/i,
  },
  {
    label: "absolute rank claim",
    pattern: /\b(?:number\s+(?:one|1)|#\s*1)\b/i,
  },
];

function childPath(path, key) {
  return /^[A-Za-z_$][\w$]*$/.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`;
}

export function assertMarketingClaimsSafe(value, surface) {
  const visited = new WeakSet();

  function visit(current, path) {
    if (typeof current === "string") {
      const match = MARKETING_CLAIM_PATTERNS.find(({ pattern }) =>
        pattern.test(current),
      );

      if (match) {
        throw new Error(
          `Unsafe marketing claim on ${surface} at ${path}: ${match.label}`,
        );
      }
      return;
    }

    if (current === null || typeof current !== "object") return;
    if (visited.has(current)) return;
    visited.add(current);

    if (Array.isArray(current)) {
      current.forEach((entry, index) => visit(entry, `${path}[${index}]`));
      return;
    }

    for (const [key, entry] of Object.entries(current)) {
      visit(entry, childPath(path, key));
    }
  }

  visit(value, "$");
}
