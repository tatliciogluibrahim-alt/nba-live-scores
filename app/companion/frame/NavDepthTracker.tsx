"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { recordPathname } from "./nav-depth";

// Mounted once per page by CompanionFrame. Pages remount this on every
// route change, so the module-level lastPathname comparison in nav-depth
// is what detects "this is a navigation, not the session's first page".
export function NavDepthTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname) recordPathname(pathname);
  }, [pathname]);
  return null;
}
