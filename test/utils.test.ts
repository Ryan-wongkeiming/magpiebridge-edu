import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn utility function', () => {
  it('should merge class names correctly', () => {
    expect(cn('btn', 'btn-primary')).toBe('btn btn-primary');
  });

  it('should handle conditional class names', () => {
    expect(cn('btn', { 'btn-primary': true, 'btn-secondary': false })).toBe('btn btn-primary');
  });

  it('should handle falsy values', () => {
    expect(cn('btn', null, undefined, false, 'btn-primary')).toBe('btn btn-primary');
  });

  it('should handle empty inputs', () => {
    expect(cn()).toBe('');
  });
});