import { RagChunk } from "../types";

export const seedChunks: RagChunk[] = [
  {
    id: "chunk-cart-service",
    projectId: "demo-shopease",
    filePath: "src/lib/cartService.ts",
    module: "Cart",
    summary: "Handles cart total calculation, quantity normalization, item pricing and discount logic.",
    content: `export type CartItem = {
  sku: string;
  price: number;
  quantity: number | string;
};

export function normalizeQuantity(quantity: number | string): number {
  const parsed = Number(quantity);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

export function calculateCartTotal(items: CartItem[]): number {
  return items.reduce((total, item) => {
    const quantity = normalizeQuantity(item.quantity);
    return total + item.price * quantity;
  }, 0);
}`,
  },
  {
    id: "chunk-checkout-route",
    projectId: "demo-shopease",
    filePath: "src/app/api/checkout/route.ts",
    module: "Checkout",
    summary: "Checkout API validates cart payload, calculates final total and creates order.",
    content: `import { calculateCartTotal } from "@/lib/cartService";
import { checkoutSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = checkoutSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Invalid checkout payload", issues: parsed.error.flatten() }, { status: 400 });
  }

  const total = calculateCartTotal(parsed.data.items);
  const order = { id: crypto.randomUUID(), total };
  return Response.json({ order });
}`,
  },
  {
    id: "chunk-auth",
    projectId: "demo-shopease",
    filePath: "src/lib/auth.ts",
    module: "Auth",
    summary: "Handles JWT auth helpers.",
    content: `import jwt from "jsonwebtoken";

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return null;
  }
}`,
  },
  {
    id: "chunk-validation",
    projectId: "demo-shopease",
    filePath: "src/lib/validation.ts",
    module: "Cart",
    summary: "Shared Zod validation schemas including cart item validation.",
    content: `import { z } from "zod";

export const cartItemSchema = z.object({
  sku: z.string().min(1),
  price: z.number().nonnegative(),
  quantity: z.union([z.number(), z.string()]),
});

export const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  couponCode: z.string().optional(),
});`,
  },
];
