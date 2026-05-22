# Feature Modules

This folder is the target home for feature-owned code. Keep each business area isolated so changes in one section are less likely to affect another.

Recommended structure inside each feature:

```text
feature-name/
|-- components/   Feature-only UI components
|-- hooks/        Feature-only data and state hooks
|-- pages/        Route-level screens for this feature
|-- services/     Supabase queries, mutations, and side effects
|-- types.ts      Feature-specific TypeScript types
`-- index.ts      Public exports for the feature
```

Shared code should stay outside feature folders:

- `src/components/ui` for reusable base UI.
- `src/components/layout` for app shell layout.
- `src/contexts` for app-wide providers.
- `src/integrations` for external clients.
- `src/lib` for shared utilities.

Avoid importing directly from another feature's internal files. If one feature must expose something, export it through that feature's `index.ts`.
