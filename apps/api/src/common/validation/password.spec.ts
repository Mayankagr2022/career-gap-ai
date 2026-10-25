import { passwordSchema } from '@career-gap-ai/shared';
import { PASSWORD_PATTERN } from './password';

/** The API and the web forms must accept and reject exactly the same passwords. */
const serverAccepts = (password: string) => password.length >= 8 && PASSWORD_PATTERN.test(password);
const webAccepts = (password: string) => passwordSchema.safeParse(password).success;

describe('password rule', () => {
  const accepted = [
    'Passw0rd@2024',
    'Passw0rd#2024',
    'Passw0rd-2024',
    'My_Passw0rd2024',
    '#Passw0rd2024@',
    'Passw0rd 2024!',
    'aA1.....',
    'Ünïcode1Pass!',
  ];
  const rejected = [
    'Passw0rd2024', // no special character
    'passw0rd@2024', // no upper case
    'PASSW0RD@2024', // no lower case
    'Password@abc', // no digit
    'Ab1@', // too short
    '        ', // only spaces
    '',
  ];

  it.each(accepted)('accepts %j on both sides', (password) => {
    expect(serverAccepts(password)).toBe(true);
    expect(webAccepts(password)).toBe(true);
  });

  it.each(rejected)('rejects %j on both sides', (password) => {
    expect(serverAccepts(password)).toBe(false);
    expect(webAccepts(password)).toBe(false);
  });
});
