import { Memory } from "../types";

export const seedMemories: Memory[] = [
  {
    id: "memory-cart-quantity-bug",
    projectId: "demo-shopease",
    type: "bug",
    title: "Cart quantity bug",
    content:
      "Cart quantity was previously parsed as a string, causing checkout total mismatch. Always normalize quantity before calculating totals.",
    relatedFiles: ["src/lib/cartService.ts"],
    createdAt: "2026-05-01T09:00:00.000Z",
  },
  {
    id: "memory-coupon-order",
    projectId: "demo-shopease",
    type: "decision",
    title: "Coupon calculation order",
    content:
      "Coupon discounts should be applied after quantity normalization but before checkout summary generation.",
    relatedFiles: ["src/lib/cartService.ts", "src/app/api/checkout/route.ts"],
    createdAt: "2026-05-05T10:30:00.000Z",
  },
  {
    id: "memory-validation-style",
    projectId: "demo-shopease",
    type: "style",
    title: "Validation style",
    content: "Use Zod validation for API inputs and return structured error messages.",
    relatedFiles: ["src/app/api/**/route.ts"],
    createdAt: "2026-05-10T14:20:00.000Z",
  },
  {
    id: "memory-checkout-total-risk",
    projectId: "demo-shopease",
    type: "risk",
    title: "Checkout total risk",
    content:
      "Checkout total calculation is sensitive to operation order: quantity normalization, coupon discount, tax, then final total.",
    relatedFiles: ["src/lib/cartService.ts", "src/app/api/checkout/route.ts"],
    createdAt: "2026-05-15T16:45:00.000Z",
  },
  {
    id: "memory-debug-logging",
    projectId: "demo-shopease",
    type: "preference",
    title: "Debug logging preference",
    content:
      "Developer prefers temporary debug logs during bug fixes, but they should be removed before final PR.",
    relatedFiles: [],
    createdAt: "2026-05-20T11:15:00.000Z",
  },
];
