import { describe, it, expect } from 'vitest';
import { colorForApp, timeAgo } from './LiveSignalFeed';

describe('colorForApp', () => {
  it('returns a Tailwind background class', () => {
    expect(colorForApp('Vaultwarden')).toMatch(/^bg-/);
  });

  it('is deterministic for the same input', () => {
    expect(colorForApp('Vaultwarden')).toBe(colorForApp('Vaultwarden'));
  });

  it('can differentiate different names', () => {
    expect(colorForApp('Vaultwarden')).not.toBe(colorForApp('Syncthing'));
  });
});

describe('timeAgo', () => {
  it('returns an empty string for missing input', () => {
    expect(timeAgo(undefined)).toBe('');
    expect(timeAgo('')).toBe('');
  });

  it('returns an empty string for an invalid date', () => {
    expect(timeAgo('not-a-date')).toBe('');
  });

  it('formats a date from days ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(timeAgo(threeDaysAgo)).toBe('3d ago');
  });

  it('formats a very recent date as "Just now"', () => {
    expect(timeAgo(new Date().toISOString())).toBe('Just now');
  });
});
