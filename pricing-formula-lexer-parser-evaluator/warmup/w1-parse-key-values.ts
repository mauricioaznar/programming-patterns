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
//   Q1. What is the input type and what is the output type? Input type is string and output type is record<string, string> (an object with strings as values and strings as keys).
//   Q2. Which characters have a special meaning in this format, and what does each one mean? "=" join key and value, also known as delimeter. ";" separate one pair from another.
//   Q3. What should parseKeyValues('name') return — there's no `=`. Pick one and say why. Throw an error, invalid format. Strict parser ours.
//       (Not tested yet. We'll decide together after you answer.)

export const parseKeyValues = (text: string): Record<string, string> => {
  if (text === '') return {}
  const pairs = text.split(";")
  const keyValues: Record<string, string> = {}
  pairs.forEach((pair) => {
    const tokens = pair.split("=")
    const key = tokens[0] as string
    const values = tokens.slice(1, tokens.length)
    const value = values.join('=')
    keyValues[key] = value
  })
  return keyValues
};