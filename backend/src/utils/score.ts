const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "be",
  "but",
  "for",
  "if",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .split(/[^a-z0-9/_.-]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

export function keywordScore(query: string, fields: string[]): number {
  const terms = tokenize(query);
  const haystack = fields.join(" ").toLowerCase();

  return terms.reduce((score, term) => {
    if (haystack.includes(term)) {
      return score + (term.length > 5 ? 2 : 1);
    }
    return score;
  }, 0);
}
