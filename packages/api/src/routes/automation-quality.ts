import { Hono } from "hono";
import type { Env } from "../env.js";
import { AutomationQualityReporter } from "../services/automation-quality-reporter.js";
import {
  QualityReportQuerySchema,
  FailurePatternsQuerySchema,
  SuggestionsQuerySchema,
} from "../schemas/automation-quality.js";

const automationQualityRoute = new Hono<{ Bindings: Env }>();

// GET /automation-quality/report
automationQualityRoute.get("/report", async (c) => {
  const parsed = QualityReportQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query parameters", details: parsed.error.flatten() }, 400);
  }

  const { days, taskType } = parsed.data;
  const reporter = new AutomationQualityReporter(c.env.DB);
  const report = await reporter.generateReport(days, taskType);

  return c.json({ report, cached: false });
});

// GET /automation-quality/failure-patterns
automationQualityRoute.get("/failure-patterns", async (c) => {
  const parsed = FailurePatternsQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query parameters", details: parsed.error.flatten() }, 400);
  }

  const { days } = parsed.data;
  const reporter = new AutomationQualityReporter(c.env.DB);
  const patterns = await reporter.getFailurePatterns(days);

  return c.json({ patterns, total: patterns.length });
});

// GET /automation-quality/suggestions
automationQualityRoute.get("/suggestions", async (c) => {
  const parsed = SuggestionsQuerySchema.safeParse(c.req.query());
  if (!parsed.success) {
    return c.json({ error: "Invalid query parameters", details: parsed.error.flatten() }, 400);
  }

  const { days } = parsed.data;
  const reporter = new AutomationQualityReporter(c.env.DB);
  const suggestions = await reporter.getImprovementSuggestions(days);

  return c.json({ suggestions, evaluatedRules: 6 });
});

export { automationQualityRoute };
