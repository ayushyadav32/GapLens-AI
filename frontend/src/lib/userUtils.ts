import type { User } from '@/types';

/**
 * Format user display name without duplicating first/last names
 * (e.g. avoids "Ayush Ayush" if the user entered their full name in first_name
 * or identical values in first and last name fields).
 */
export const formatUserName = (user: User | null | undefined): string => {
  if (!user) return 'Research Investigator';

  const first = (user.first_name || '').trim();
  const last = (user.last_name || '').trim();

  if (first && last) {
    const firstLower = first.toLowerCase();
    const lastLower = last.toLowerCase();

    // Identical first and last name (e.g. "Ayush" and "Ayush")
    if (firstLower === lastLower) {
      return first;
    }

    // First name already ends with last name (e.g. first="Ayush Sharma", last="Sharma")
    if (firstLower.endsWith(lastLower)) {
      return first;
    }

    // First name already contains last name as a distinct word
    const firstWords = firstLower.split(/\s+/);
    if (firstWords.includes(lastLower)) {
      return first;
    }

    // Last name starts with first name (e.g. first="Ayush", last="Ayush Sharma")
    if (lastLower.startsWith(firstLower)) {
      return last;
    }

    return `${first} ${last}`.trim();
  }

  if (first) return first;
  if (last) return last;

  if (user.username && !user.username.includes('@')) {
    return user.username;
  }

  if (user.email) {
    const prefix = user.email.split('@')[0];
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }

  return 'Research Investigator';
};

/**
 * Derive user avatar initials cleanly
 */
export const getUserInitials = (user: User | null | undefined): string => {
  if (!user) return 'I';

  const first = (user.first_name || '').trim();
  const last = (user.last_name || '').trim();

  if (first && last && first.toLowerCase() !== last.toLowerCase()) {
    return `${first[0]}${last[0]}`.toUpperCase();
  }

  if (first) return first[0].toUpperCase();
  if (user.username) return user.username[0].toUpperCase();
  if (user.email) return user.email[0].toUpperCase();

  return 'I';
};
