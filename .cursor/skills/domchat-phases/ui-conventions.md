# UI feedback patterns

Required for DomChat features. Components live under `apps/web/src/components/`.

## Theme (light + dark)

- Tokens live in `src/app/globals.css` (`:root` + `.dark`)
- Use semantic classes: `.page`, `.btn-primary`, `.btn-secondary`, `.input`, `.label`, `.card`, `.muted`, `.link`, `.error-text`
- Include `AppChrome` (or at least `ThemeToggle`) on pages so users can switch theme
- Prefer CSS variables over hard-coded `zinc-*` / `emerald-*` colors
- Theme preference is stored in `localStorage` (`domchat-theme`)

## Toast

```tsx
import { useToast } from "@/components/toast";

const { toast } = useToast();
toast("Incident created");           // success (default)
toast("Failed to load", "error");    // error
```

## Button loader

```tsx
import { ButtonLoader } from "@/components/ui";

<button disabled={loading}>
  {loading ? <ButtonLoader label="Saving…" /> : "Save"}
</button>
```

## Skeletons

```tsx
import { IncidentsListSkeleton, FormPageSkeleton, PageHeaderSkeleton } from "@/components/skeletons";
import { Skeleton } from "@/components/ui";

{loading ? <IncidentsListSkeleton /> : <List data={data} />}
```

Add a new skeleton in `skeletons.tsx` when a new list/page layout needs a loading state.
