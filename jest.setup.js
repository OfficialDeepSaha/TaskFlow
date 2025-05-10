// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock IndexedDB
require('fake-indexeddb/auto');

// Mock the fetch API
global.fetch = jest.fn();

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost/',
    origin: 'http://localhost',
    pathname: '/',
    search: '',
    hash: '',
    assign: jest.fn(),
    replace: jest.fn(),
    reload: jest.fn(),
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock service worker registrations
Object.defineProperty(window.navigator, 'serviceWorker', {
  value: {
    register: jest.fn().mockResolvedValue({ scope: '/' }),
    ready: Promise.resolve({
      unregister: jest.fn().mockResolvedValue(undefined),
      sync: {
        register: jest.fn().mockResolvedValue(undefined),
      },
    }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
});
