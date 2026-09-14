import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
  configurable: true,
  value: vi.fn(() => Promise.resolve()),
});

Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  value: vi.fn(),
});