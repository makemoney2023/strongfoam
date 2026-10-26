const COUNT_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
] as const;

/**
 * Spell out a small count ("five") so marketing copy can derive its numbers
 * from the underlying data instead of hard-coding them. Falls back to digits
 * above twelve.
 */
export function countWord(count: number, options: { capitalize?: boolean } = {}): string {
  const word = Number.isInteger(count) && count >= 0 && count < COUNT_WORDS.length
    ? COUNT_WORDS[count]
    : String(count);
  return options.capitalize ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}
