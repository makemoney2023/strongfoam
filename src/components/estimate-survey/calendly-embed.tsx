"use client";

import { useEffect } from "react";

export function CalendlyEmbed({
  name,
  email,
  url,
}: {
  name: string;
  email: string;
  url: string;
}) {
  const separator = url.includes("?") ? "&" : "?";
  const src = `${url}${separator}name=${encodeURIComponent(name)}&email=${encodeURIComponent(email)}`;

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, []);

  return (
    <div
      className="calendly-inline-widget mt-8 min-h-[720px] w-full overflow-hidden rounded-xl"
      data-url={src}
    />
  );
}
