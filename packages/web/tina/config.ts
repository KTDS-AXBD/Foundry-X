import { defineConfig } from "tinacms";

export default defineConfig({
  branch: process.env.TINA_BRANCH ?? "master",
  clientId: process.env.VITE_TINA_CLIENT_ID ?? "",
  token: process.env.TINA_TOKEN ?? "",
  build: {
    outputFolder: "admin",
    publicFolder: "public",
  },
  schema: {
    collections: [
      {
        name: "landing",
        label: "Landing Pages",
        path: "content/landing",
        format: "md",
        fields: [
          {
            type: "string",
            name: "title",
            label: "Title",
            isTitle: true,
            required: true,
          },
          { type: "string", name: "section", label: "Section" },
          { type: "string", name: "tagline", label: "Tagline" },
          { type: "string", name: "phase", label: "Current Phase" },
          { type: "string", name: "phaseTitle", label: "Phase Title" },
          {
            type: "object",
            name: "stats",
            label: "Stats",
            list: true,
            fields: [
              { type: "string", name: "value", label: "Value" },
              { type: "string", name: "label", label: "Label" },
            ],
          },
          {
            type: "rich-text",
            name: "body",
            label: "Body",
            isBody: true,
          },
        ],
      },
      {
        name: "wiki",
        label: "Wiki Pages",
        path: "content/wiki",
        format: "md",
        fields: [
          {
            type: "string",
            name: "title",
            label: "Title",
            isTitle: true,
            required: true,
          },
          { type: "string", name: "category", label: "Category" },
          {
            type: "rich-text",
            name: "body",
            label: "Body",
            isBody: true,
          },
        ],
      },
    ],
  },
});
