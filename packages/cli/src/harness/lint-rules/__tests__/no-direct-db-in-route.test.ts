import { RuleTester } from "eslint";
import { noDirectDbInRoute } from "../no-direct-db-in-route.js";

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: "module" },
});

ruleTester.run("no-direct-db-in-route", noDirectDbInRoute, {
  valid: [
    // services/ 파일에서 db.prepare() → 에러 미발생
    {
      code: `const result = db.prepare("SELECT * FROM users").all();`,
      filename: "/home/user/packages/api/src/services/user-service.ts",
    },
    // routes/ 파일이지만 DB 접근 없음
    {
      code: `const result = await userService.getAll();`,
      filename: "/home/user/packages/api/src/routes/user.ts",
    },
  ],
  invalid: [
    // routes/ 파일에서 c.env.DB 감지 → 에러
    {
      code: `const db = c.env.DB;`,
      filename: "/home/user/packages/api/src/routes/user.ts",
      errors: [{
        messageId: "noDirectDb",
        suggestions: [{
          messageId: "useService",
          output: `const db = /* TODO: use service */ c.env.DB;`,
        }],
      }],
    },
    // routes/ 파일에서 db.prepare() 감지 → 에러
    {
      code: `const result = db.prepare("SELECT * FROM users").all();`,
      filename: "/home/user/packages/api/src/routes/user.ts",
      errors: [{
        messageId: "noDirectDb",
        suggestions: [{
          messageId: "useService",
          output: `const result = /* TODO: use service */ db.prepare("SELECT * FROM users").all();`,
        }],
      }],
    },
  ],
});
