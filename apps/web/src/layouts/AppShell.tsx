import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/navigation/Sidebar';
import { TopBar } from '../components/navigation/TopBar';

export function AppShell() {
  const OutletComponent: any = Outlet;
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-slate-100 antialiased font-sans">
      {/* Global Product Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Global TopBar */}
        <TopBar />

        {/* Dynamic Route Content */}
        <main className="flex-1 overflow-y-auto bg-background p-6 cyber-grid">
          <div className="max-w-7xl mx-auto w-full">
            <OutletComponent />
          </div>
        </main>
      </div>
    </div>
  );
}
