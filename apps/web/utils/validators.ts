/**
 * validates email format
 * @param email emil to validate
 * @returns true if email is valid, false otherwise
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * validates password strength
 * @param password password string to validate
 * @returns true if password meets criteria, false otherwise
 */
export function validatePassword(password: string): boolean {
  // Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
}

/**
 * validates phone number format
 * @param phone phone number to run valiudations on
 * @returns true if phone number is valid, false otherwise
 */
export function validatePhoneNumber(phone: string): boolean {
  // Simple phone number validation (10-15 digits, can include + and -)
  const phoneRegex = /^\+?[0-9\-]{10,15}$/;
  return phoneRegex.test(phone);
}

/**
 * validates that a value is not empty
 * @param value value to check
 * @returns
 */
export function validateNotEmpty(value: string): boolean {
  return value.trim().length > 0;
}
