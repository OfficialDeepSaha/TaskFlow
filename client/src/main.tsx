import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./hooks/use-auth";
import { ThemeProvider } from "./components/theme-provider";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

const root = createRoot(document.getElementById("root")!);

// Clear the initial loading message
const loadingElement = document.getElementById("loading");
if (loadingElement) {
  loadingElement.remove();
}

// Make sure QueryClientProvider is the outermost provider
root.render(
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="light" storageKey="taskflow-theme">
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);
