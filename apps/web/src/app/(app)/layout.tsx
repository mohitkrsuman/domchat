import { AmbientBackground } from "@/components/ambient-background";
import { AppNav } from "@/components/app-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <AmbientBackground />
      <AppNav />
      <div className="app-shell-content">{children}</div>
    </div>
  );
}
