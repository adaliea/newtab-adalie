# Project workflow

- After completing requested changes and appropriate verification, automatically commit and push them to the current branch's upstream. No additional confirmation is needed unless the user asks otherwise.
- Amend the latest commit when a change belongs to the same logical unit of work and amending makes sense. Prefer a new commit if the previous commit has already been pushed, to avoid rewriting shared history unless the user explicitly requests it.
- If there are no changes, do not create an empty commit; push any pending commits and report the status.
