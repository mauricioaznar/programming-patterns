// W2 — One character at a time.
//
// Real parsers don't call split() or Number(). They walk the text with a cursor
// (`pos`) and look at one character at a time:
//
//   peek()    → the character at `pos`, without moving
//   advance() → the character at `pos`, then move `pos` one step forward
//
// Your job: readInteger('123') → 123, built digit by digit.
// Rules: no Number(), parseInt(), parseFloat(), unary `+`, or split().
//
// Answer before coding (write your answers here as comments):
//   Q1. You've read '12' so far and hold the number 12. The next character is '3'.
//       What arithmetic turns 12 into 123? concatenation
//   Q2. How do you turn the character '7' into the number 7 without Number()?
//       (Hint: every character has a numeric code.), asci codes. 48 - 57 (0 - 9)
//   Q3. What should peek() return when `pos` is past the end of the text?, its contract states that output is always string, exceptions are meant for bugs so that is not the case we are looking at, i would say empty string (not a whitespace)
//   Q4. What should readInteger('') or readInteger('12a') do? Pick one and say why. It would return null instead of throwing an error, it means the text could not convert to a number
//       (Not tested yet. We'll decide together after you answer.)

// CLEANUP — W2 passes its tests but isn't finished. Work through these in order:
//   1. BUG (untested): the upper bound of the digit check is wrong — readInteger(':')
//      returns 10. Compare the bounds against your own Q2 answer.
//   2. TYPES: `advance` is declared `: string` but returns nothing. Either return the
//      character it moved past, or make it `: void` (and consider renaming it).
//      Run `npm run typecheck` — Vitest alone won't catch this.
//   3. CONTRACT: `peek` returns `undefined` past the end. Make it honour Q3 ('').
//   4. Q4: readInteger('') returns 0, but you decided `null`. Add a test, then fix.
//   5. DUPLICATION: `curr.charCodeAt(0)` is computed three times. Compute it once,
//      or pull out an `isDigit(ch)` helper.
//   6. MAGIC NUMBERS: replace 48 / 57 with `'0'.charCodeAt(0)` / `'9'.charCodeAt(0)`
//      (named constants), so the code explains itself and can't be off by one.
//   7. Q1: update your answer — the code uses arithmetic, not concatenation.
//
// IMPROVEMENT (after the cleanup) — reshape the loop the way a lexer reads numbers:
//   `while (isDigit(peek()))` that simply stops at the first non-digit, then decide
//   '' / '12a' with one check after the loop. This is the loop you'll reuse in M1.

export const readInteger = (text: string): number | null => {
  let pos = 0;
  let total = 0;

  const peek = (): string => {
    return text[pos]
  };

  const advance = () => {
    pos = pos + 1
  };

  while (pos < text.length) {
    const curr = peek()
    if (curr.charCodeAt(0) >= 48 && curr.charCodeAt(0) <= 57) {
      const num = (curr.charCodeAt(0) - 48)
      total = (total * 10) + num
    } else {
      return null
    }
    advance()
  }

  return total;
};
