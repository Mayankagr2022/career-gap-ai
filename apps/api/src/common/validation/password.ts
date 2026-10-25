/**
 * Password strength rule shared by registration, password reset and password change.
 * It must stay equivalent to `passwordSchema` in packages/shared (used by the web forms); password.spec.ts checks that.
 *
 * At least one lower case letter, one upper case letter, one digit and one character that is not a letter or digit
 * (any symbol counts, e.g. # - _ ! @; a space does not). Length is validated separately (minimum 8).
 */
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d\s])/;

export const PASSWORD_MESSAGE = 'Password must contain uppercase, lowercase, number, and special character';
