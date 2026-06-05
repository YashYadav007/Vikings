import { Router } from "express";
import { GraphService } from "../services/graph.service";

export function createGraphRouter(graphService: GraphService): Router {
  const router = Router();

  router.get("/demo-shopease", (_req, res) => {
    res.json(graphService.getProjectGraph());
  });

  return router;
}
