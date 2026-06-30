import { MainLayout } from "@/components/layout/MainLayout";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";

function App() {
  return (
    <ThemeProvider>
      <QueryProvider>
        <TooltipProvider delayDuration={200}>
          <MainLayout />
          <Toaster position="top-center" />
        </TooltipProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

export default App;
