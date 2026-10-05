import { parseKeyValues } from './w1-parse-key-values';

describe('W1 — parseKeyValues', () => {
  it('parses one pair', () => {
    expect(parseKeyValues('name=Mau')).toEqual({ name: 'Mau' });
  });

  it('parses several pairs separated by ;', () => {
    expect(parseKeyValues('name=Mau;age=31')).toEqual({ name: 'Mau', age: '31' });
  });

  it('keeps values as strings — the parser only reads text', () => {
    expect(parseKeyValues('age=31').age).toBe('31');
  });

  it('returns an empty object for empty text', () => {
    expect(parseKeyValues('')).toEqual({});
  });

  it('lets a later key overwrite an earlier one', () => {
    expect(parseKeyValues('a=1;a=2')).toEqual({ a: '2' });
  });
});
