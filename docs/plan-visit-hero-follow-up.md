# Plan my visit hero — follow-up

The accepted first live direction is implemented. No test suites were run, per
the maintainer's request.

## Before merge

- Complete translations for the new plan-visit keys in the remaining EU locales;
  English and Italian are the current source/iteration languages.
- Rerun the focused Storybook interaction and accessibility stories. The
  Storybook MCP test runner did not start in this session (30-second startup
  timeout), so its result is still unknown.
- During merge review, compare the page against the accepted first live variant
  in light and dark schemes and at mobile/intermediate widths. Confirm the
  ember halo is visible at rest, the idle pill says “Dettatura”, and recording
  shows stop/bars/time without expanding to full width.
- Confirm the age-validation error focuses the first missing age and is
  announced, and that API failures are announced.
