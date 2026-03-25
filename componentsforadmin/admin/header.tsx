"use client";

import { LogOut } from "lucide-react";
import { Button } from "@componentsforadmin/ui/button";

export function AdminHeader() {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6">
      <h1 className="text-base font-semibold text-foreground">Admin Portal</h1>
      <Button variant="ghost" size="sm" className="text-primary gap-2">
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </header>
  );
}
