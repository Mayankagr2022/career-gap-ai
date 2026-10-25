import { corsOrigins } from './cors-origins';

describe('corsOrigins', () => {
  it('uses the origin of the web app address, without its path', () => {
    expect(corsOrigins('https://mayankagr2022.github.io/career-gap-ai')).toEqual([
      'http://localhost:3000',
      'https://mayankagr2022.github.io',
    ]);
  });

  it('works for a plain origin and does not duplicate localhost', () => {
    expect(corsOrigins('http://localhost:3000')).toEqual(['http://localhost:3000']);
    expect(corsOrigins('https://app.example.com')).toContain('https://app.example.com');
  });

  it('falls back to local development when the address is missing or invalid', () => {
    expect(corsOrigins(undefined)).toEqual(['http://localhost:3000']);
    expect(corsOrigins('not a url')).toEqual(['http://localhost:3000']);
  });
});
