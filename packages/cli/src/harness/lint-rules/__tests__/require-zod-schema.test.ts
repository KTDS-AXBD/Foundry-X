import { RuleTester } from "eslint";
import { requireZodSchema } from "../require-zod-schema.js";

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

ruleTester.run("require-zod-schema", requireZodSchema, {
  valid: [
    // schema.parse(c.req.json()) 래핑 → 통과
    {
      code: `const body = schema.parse(c.req.json());`,
      filename: "/home/user/packages/api/src/routes/user.ts",
    },
    // services/ 파일에서 c.req.json() → 에러 미발생 (routes/ 외)
    {
      code: `const body = c.req.json();`,
      filename: "/home/user/packages/api/src/services/user-service.ts",
    },
    // routes/ 파일이지만 json 호출 아님
    {
      code: `const text = c.req.text();`,
      filename: "/home/user/packages/api/src/routes/user.ts",
    },
  ],
  invalid: [
    // c.req.json() 미래핑 → 경고 + suggestion 존재
    {
      code: `const body = c.req.json();`,
      filename: "/home/user/packages/api/src/routes/user.ts",
      errors: [{
        messageId: "requireZod",
        suggestions: [{
          messageId: "addZodParse",
          output: `const body = schema.parse(c.req.json());`,
        }],
      }],
    },
    // await c.req.json() 미래핑 → 경고
    {
      code: `const body = await c.req.json();`,
      filename: "/home/user/packages/api/src/routes/user.ts",
      errors: [{
        messageId: "requireZod",
        suggestions: [{
          messageId: "addZodParse",
          output: `const body = await schema.parse(c.req.json());`,
        }],
      }],
    },
  ],
});
