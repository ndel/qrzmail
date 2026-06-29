"use client";

import { useEffect } from "react";

export default function MarketingBodyClass() {
  useEffect(() => {
    document.body.classList.add("marketing-route");
    return () => {
      document.body.classList.remove("marketing-route");
    };
  }, []);
  return null;
}
