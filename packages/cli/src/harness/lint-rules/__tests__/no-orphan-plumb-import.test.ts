import { RuleTester } from "eslint";
import { noOrphanPlumbImport } from "../no-orphan-plumb-import.js";

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

ruleTester.run("no-orphan-plumb-import", noOrphanPlumbImport, {
  valid: [
    // cli 파일에서 plumb import → 통과
    {
      code: `import { PlumbBridge } from "../plumb/bridge.js";`,
      filename: "/home/user/packages/cli/src/services/sync.ts",
    },
    // api 파일에서 plumb 무관한 import → 통과
    {
      code: `import { Hono } from "hono";`,
      filename: "/home/user/packages/api/src/routes/health.ts",
    },
  ],
  invalid: [
    // api 파일에서 plumb import → 에러
    {
      code: `import { PlumbBridge } from "../../cli/src/plumb/bridge.js";`,
      filename: "/home/user/packages/api/src/services/some-service.ts",
      errors: [{
        messageId: "noOrphanImport",
        suggestions: [{
          messageId: "useMcp",
          output: `/* TODO: use MCP instead */ import { PlumbBridge } from "../../cli/src/plumb/bridge.js";`,
        }],
      }],
    },
    // web 파일에서 plumb import → 에러
    {
      code: `import { runPlumb } from "../../../cli/src/plumb/index.js";`,
      filename: "/home/user/packages/web/src/lib/plumb-client.ts",
      errors: [{
        messageId: "noOrphanImport",
        suggestions: [{
          messageId: "useMcp",
          output: `/* TODO: use MCP instead */ import { runPlumb } from "../../../cli/src/plumb/index.js";`,
        }],
      }],
    },
  ],
});
