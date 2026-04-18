import React from "react";

const paths = {
  pause: "M5 3h2v10H5zm4 0h2v10H9z",
  stop: "M3 3h10v10H3z",
  note: "M3 2h7l3 3v8a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1zm6 1v3h3M5 8h6M5 10h4",
  switch: "M7 2l-3 3 3 3M9 14l3-3-3-3M4 5h8M12 11H4",
  dots: "M3 8h.01M8 8h.01M13 8h.01",
  expand: "M3 3h4M3 3v4M13 3h-4M13 3v4M3 13h4M3 13V9M13 13h-4M13 13V9",
  calendar: "M3 4h10v9H3zM3 7h10M5 2v3M11 2v3",
  folder: "M2 4h4l2 2h6v7H2z",
  gear: "M8 10a2 2 0 100-4 2 2 0 000 4zM13 8l-1.3-.8.3-1.5-1.3-.8-1.5.3L8 4l-1.2 1.2-1.5-.3-1.3.8.3 1.5L3 8l1.3.8-.3 1.5 1.3.8 1.5-.3L8 12l1.2-1.2 1.5.3 1.3-.8-.3-1.5z",
  sparkle: "M8 1.5 9.3 6 14 7.4 9.3 8.8 8 13.5 6.7 8.8 2 7.4 6.7 6Z",
  bolt: "M8 1L3 9h4l-1 6 6-8H8l1-6z",
  tag: "M2 2h6l6 6-6 6-6-6V2zm3 3a1 1 0 100-2 1 1 0 000 2z",
  search: "M6 11a5 5 0 100-10 5 5 0 000 10zM14 14l-3.5-3.5",
  plus: "M8 3v10M3 8h10",
  wifi: "M1 5c3.5-3 9.5-3 13 0M3 8c2.5-2 7.5-2 10 0M5.5 11c1.5-1.2 4.5-1.2 6 0M8 14h.01",
  battery: "M1 5h11v6H1zM14 8v0",
  spotlight: "M6 11a5 5 0 100-10 5 5 0 000 10z",
  cc: "M12 4H4v8h8z",
  "arrow-up": "M8 3v10M4 7l4-4 4 4",
  "arrow-down": "M8 13V3M4 9l4 4 4-4",
  "chevron-right": "M5 2l6 6-6 6",
};

export function TTIcon({ name, size = 16, color }) {
  const p = paths[name];
  if (!p) return null;
  const isStroke =
    name === "note" ||
    name === "switch" ||
    name === "dots" ||
    name === "gear" ||
    name === "search" ||
    name === "wifi" ||
    name === "expand" ||
    name === "calendar" ||
    name === "arrow-up" ||
    name === "arrow-down" ||
    name === "chevron-right";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={isStroke ? "none" : color || "currentColor"}
      stroke={isStroke ? color || "currentColor" : "none"}
      strokeWidth={isStroke ? 1.5 : 0}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={p} />
    </svg>
  );
}
