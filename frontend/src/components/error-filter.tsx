"use client";

import { useEffect } from "react";

export default function ErrorFilter() {
  useEffect(() => {
    const original = console.error;
    console.error = (...args: any[]) => {
      try {
        if (args.length === 1 && typeof args[0] === "object" && args[0] !== null) {
          const obj = args[0];
          // ignore empty plain objects which create noisy dev overlay like `{}`
          if (Object.keys(obj).length === 0 && obj.constructor === Object) {
            return;
          }
        }
      } catch (e) {
        // fallthrough to original
      }
      original.apply(console, args);
    };

    return () => {
      console.error = original;
    };
  }, []);

  return null;
}
