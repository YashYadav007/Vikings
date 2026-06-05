import { ProjectGraph } from "../types";

export class GraphService {
  getProjectGraph(): ProjectGraph {
    return {
      nodes: [
        { id: "project-demo-shopease", type: "project", data: { label: "ShopEase" }, position: { x: 400, y: 0 } },
        { id: "module-auth", type: "module", data: { label: "Auth" }, position: { x: 40, y: 160 } },
        { id: "module-cart", type: "module", data: { label: "Cart" }, position: { x: 280, y: 160 } },
        { id: "module-checkout", type: "module", data: { label: "Checkout" }, position: { x: 520, y: 160 } },
        { id: "module-products", type: "module", data: { label: "Products" }, position: { x: 760, y: 160 } },
        {
          id: "file-cart-service",
          type: "file",
          data: { label: "src/lib/cartService.ts" },
          position: { x: 220, y: 320 },
        },
        {
          id: "file-checkout-route",
          type: "file",
          data: { label: "src/app/api/checkout/route.ts" },
          position: { x: 500, y: 320 },
        },
        { id: "file-auth", type: "file", data: { label: "src/lib/auth.ts" }, position: { x: 20, y: 320 } },
        {
          id: "memory-cart-bug",
          type: "memory",
          data: { label: "Bug: Cart quantity bug" },
          position: { x: 160, y: 500 },
        },
        {
          id: "memory-coupon-order",
          type: "memory",
          data: { label: "Decision: Coupon calculation order" },
          position: { x: 420, y: 500 },
        },
        {
          id: "memory-validation-style",
          type: "memory",
          data: { label: "Style: Zod validation" },
          position: { x: 680, y: 500 },
        },
        { id: "task-add-coupon", type: "task", data: { label: "Add coupon support" }, position: { x: 420, y: 680 } },
        {
          id: "risk-checkout-total",
          type: "risk",
          data: { label: "Checkout total mismatch" },
          position: { x: 420, y: 840 },
        },
      ],
      edges: [
        { id: "edge-project-auth", source: "project-demo-shopease", target: "module-auth", label: "has module" },
        { id: "edge-project-cart", source: "project-demo-shopease", target: "module-cart", label: "has module" },
        {
          id: "edge-project-checkout",
          source: "project-demo-shopease",
          target: "module-checkout",
          label: "has module",
        },
        { id: "edge-project-products", source: "project-demo-shopease", target: "module-products", label: "has module" },
        { id: "edge-auth-file", source: "module-auth", target: "file-auth", label: "owns file" },
        { id: "edge-cart-file", source: "module-cart", target: "file-cart-service", label: "owns file" },
        {
          id: "edge-checkout-file",
          source: "module-checkout",
          target: "file-checkout-route",
          label: "owns file",
        },
        { id: "edge-cart-bug", source: "module-cart", target: "memory-cart-bug", label: "has memory" },
        { id: "edge-cart-decision", source: "module-cart", target: "memory-coupon-order", label: "has memory" },
        {
          id: "edge-checkout-style",
          source: "module-checkout",
          target: "memory-validation-style",
          label: "has memory",
        },
        { id: "edge-memory-bug-task", source: "memory-cart-bug", target: "task-add-coupon", label: "influences task" },
        {
          id: "edge-memory-decision-task",
          source: "memory-coupon-order",
          target: "task-add-coupon",
          label: "influences task",
        },
        {
          id: "edge-memory-style-task",
          source: "memory-validation-style",
          target: "task-add-coupon",
          label: "influences task",
        },
        { id: "edge-task-cart-file", source: "task-add-coupon", target: "file-cart-service", label: "touches file" },
        { id: "edge-task-checkout-file", source: "task-add-coupon", target: "file-checkout-route", label: "touches file" },
        { id: "edge-task-risk", source: "task-add-coupon", target: "risk-checkout-total", label: "has risk" },
      ],
    };
  }
}
