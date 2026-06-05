import { ProjectBrain } from "../types";

export const seedProject: ProjectBrain = {
  id: "demo-shopease",
  name: "ShopEase",
  repoUrl: "https://github.com/demo/shopease",
  stack: ["Next.js", "TypeScript", "Express", "Zod", "JWT"],
  modules: [
    {
      id: "module-auth",
      name: "Auth",
      summary: "JWT verification and authenticated user helpers.",
      files: ["src/lib/auth.ts"],
    },
    {
      id: "module-cart",
      name: "Cart",
      summary: "Cart quantity normalization, item pricing, totals, and discount logic.",
      files: ["src/lib/cartService.ts", "src/lib/validation.ts"],
    },
    {
      id: "module-checkout",
      name: "Checkout",
      summary: "Checkout API validation, final total calculation, and order creation.",
      files: ["src/app/api/checkout/route.ts"],
    },
    {
      id: "module-products",
      name: "Products",
      summary: "Product catalog data and inventory surfaces.",
      files: [],
    },
  ],
  riskAreas: ["Checkout total mismatch", "Coupon ordering", "API validation drift"],
  lastTask: "Add coupon support",
};

export const seedProjects: ProjectBrain[] = [seedProject];
