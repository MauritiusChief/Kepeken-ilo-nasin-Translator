import { PropsWithChildren } from "react";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="flex min-h-screen flex-col" data-testid="app-shell">
        {children}
      </div>
    </div>
  );
}

export default AppShell;
