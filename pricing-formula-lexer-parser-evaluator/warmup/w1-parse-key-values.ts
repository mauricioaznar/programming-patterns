// W1 — What is a parser?
//
// A parser takes text and gives back structured data. You've used one already:
// JSON.parse('{"a":1}') turns a string into an object.
//
// Here the text is a list of `key=value` pairs separated by `;`.
//
//   parseKeyValues('name=Mau;age=31')  →  { name: 'Mau', age: '31' }
//
// Answer before coding (write your answers here as comments):
//   Q1. What is the input type and what is the output type?
//   Q2. Which characters have a special meaning in this format, and what does each one mean?
//   Q3. What should parseKeyValues('name') return — there's no `=`. Pick one and say why.
//       (Not tested yet. We'll decide together after you answer.)

export const parseKeyValues = (text: string): Record<string, string> => {
  // TODO(Mau)
  throw new Error('not implemented');
};
