export function getUserFriendlyError(error: any): string {
  const message = error?.message?.toLowerCase() || '';

  if (message.includes('duplicate key')) {
    return 'This record already exists. Please check your input.';
  }
  if (message.includes('foreign key')) {
    return 'Cannot complete this action due to related records.';
  }
  if (message.includes('row-level security') || message.includes('permission denied')) {
    return 'You do not have permission to perform this action.';
  }
  if (message.includes('not null') || message.includes('violates not-null')) {
    return 'Required information is missing. Please fill all required fields.';
  }
  if (message.includes('check constraint')) {
    return 'The value you entered is out of the allowed range.';
  }
  if (message.includes('authentication required') || message.includes('not authenticated')) {
    return 'Please sign in to continue.';
  }
  if (message.includes('invalid login') || message.includes('invalid email or password')) {
    return 'Invalid email or password. Please try again.';
  }
  if (message.includes('email not confirmed')) {
    return 'Please verify your email address before signing in.';
  }
  if (message.includes('user already registered')) {
    return 'An account with this email already exists.';
  }

  console.error('Database error:', error);
  return 'An error occurred. Please try again or contact support.';
}
