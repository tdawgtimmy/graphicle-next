<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# shadcn Storybook stories

When installing a shadcn/ui component that has a Storybook story available, install the story too from the `@lloyd` registry (https://registry.lloydrichards.dev, `base` variant) instead of hand-writing one.

The registry alias is already configured in `components.json`:

```json
"registries": {
  "@lloyd": "https://registry.lloydrichards.dev/v3/base/{name}.json"
}
```

Install stories with:

```
npx shadcn@latest add @lloyd/<component-name>-story
```

e.g. `npx shadcn@latest add @lloyd/button-story`. Check the registry (or run with `--dry-run` first) to confirm a story exists for a given component before assuming the name — not every shadcn component has one.
