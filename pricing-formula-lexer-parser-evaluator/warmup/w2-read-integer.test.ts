import { readInteger } from './w2-read-integer';

describe('W2 — readInteger', () => {
  it('reads a single digit', () => {
    expect(readInteger('7')).toBe(7);
  });

  it('reads zero', () => {
    expect(readInteger('0')).toBe(0);
  });

  it('reads several digits', () => {
    expect(readInteger('123')).toBe(123);
  });

  it('ignores leading zeros', () => {
    expect(readInteger('007')).toBe(7);
  });

  it('reads a large number', () => {
    expect(readInteger('1000000')).toBe(1000000);
  });

  it('returns a number, not a string', () => {
    expect(typeof readInteger('42')).toBe('number');
  });
});
