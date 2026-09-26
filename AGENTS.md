# Agents

This project uses the Payload CMS skill at `.agents/skills/payload/`.
Start with `.agents/skills/payload/SKILL.md` for a quick reference, then see `.agents/skills/payload/reference/` for detailed docs.

## Storybook MCP (`storybook` in `opencode.json`)

When working on UI components, always use the `storybook` MCP tools to access Storybook's component and documentation knowledge before answering or taking any action. The MCP endpoint requires the Storybook dev server (`pnpm storybook`, port 6006, serves `http://localhost:6006/mcp`).

- **CRITICAL: Never hallucinate component properties!** Before using ANY property on a component from the design system (including common-sounding ones like `shadow`, etc.), you MUST use the MCP tools to check if the property is actually documented for that component.
- Query `list-all-documentation` to get a list of documented components
- Query `get-documentation` for that component to see all available properties and examples (use `get-documentation-for-story` when you need a full story)
- Only use properties that are explicitly documented or shown in example stories
- If a property isn't documented, do not assume properties based on naming conventions or common patterns from other libraries. Check back with the user in these cases.
- Use the `get-storybook-story-instructions` tool to fetch the latest instructions for creating or updating stories. This will ensure you follow current conventions and recommendations.
- Check your work by running `run-story-tests` (includes accessibility checks).

Remember: A story name might not reflect the property name correctly, so always verify properties through documentation or example stories before using them.
