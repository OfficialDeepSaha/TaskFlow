import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/theme-provider';

// Create a fresh QueryClient for each test
export const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 0,
      refetchOnWindowFocus: false,
    },
  },
});

// Wrapper for testing components that use react-query
export const createWrapper = () => {
  const testQueryClient = createTestQueryClient();
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>
      <ThemeProvider defaultTheme="light" storageKey="test-theme">
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
};

// Custom render function that includes providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  wrapper?: React.ComponentType<{ children: React.ReactNode }>;
}

const customRender = (
  ui: React.ReactElement,
  options?: CustomRenderOptions
) => {
  const Wrapper = options?.wrapper || createWrapper();
  return render(ui, { ...options, wrapper: Wrapper });
};

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render method
export { customRender as render };
