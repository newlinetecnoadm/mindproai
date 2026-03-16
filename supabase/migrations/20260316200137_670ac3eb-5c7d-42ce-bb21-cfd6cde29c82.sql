-- Normalize default workspace flags so each user has exactly one default workspace
WITH ranked AS (
  SELECT
    id,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY CASE WHEN is_default THEN 0 ELSE 1 END, created_at ASC, id ASC
    ) AS rn
  FROM public.workspaces
)
UPDATE public.workspaces w
SET is_default = (r.rn = 1)
FROM ranked r
WHERE w.id = r.id
  AND w.is_default IS DISTINCT FROM (r.rn = 1);

-- Enforce this invariant going forward
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_one_default_per_user_idx
ON public.workspaces (user_id)
WHERE is_default = true;