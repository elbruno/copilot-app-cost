# How to Create the Gist for Easy Installation

To make installation as simple as "paste URL and import", we need to create a GitHub Gist with the extension code.

## Creating the Gist (One-Time Setup)

### Option 1: Manual Gist Creation (Recommended)

1. Go to https://gist.github.com
2. Create a new public gist named `copilot-app-cost-canvas` (or similar)
3. Add **two files**:
   - `copilot-extension.json` (the extension manifest — **required**, or the import fails with "Gist is missing `copilot-extension.json`")
   - `extension.mjs` (the **bundled**, self-contained extension)
4. For `copilot-extension.json`, copy the contents of `.github/extensions/copilot-app-cost/copilot-extension.json`
5. For `extension.mjs`, run `npm run bundle` first and copy the contents of `dist/extension.mjs`
   (the raw `.github/extensions/copilot-app-cost/extension.mjs` imports from `./lib/*.mjs`, which **cannot** be resolved in a flat gist — you must use the bundled output)
6. Click "Create public gist"
7. Copy the gist URL (e.g., `https://gist.github.com/elbruno/abc123...`)
8. Click the "Raw" button on `extension.mjs` to get the raw content URL

### Option 2: Using GitHub CLI

```bash
# Bundle the extension into a single self-contained file
npm run bundle

# Create gist with the manifest + bundled extension
gh gist create \
  --public \
  --description "GitHub Copilot App Canvas: AI-credit monitoring" \
  .github/extensions/copilot-app-cost/copilot-extension.json \
  dist/extension.mjs
```

To update an existing gist instead:

```bash
npm run bundle
gh gist edit <GIST_ID> --add .github/extensions/copilot-app-cost/copilot-extension.json
gh gist edit <GIST_ID> -f extension.mjs dist/extension.mjs
```

This will output the gist URL. Get the raw URL by:
1. Opening the gist
2. Clicking "Raw"
3. Copying that URL

## The Resulting URL Format

Your gist raw URL will look like:

```
https://gist.githubusercontent.com/{username}/{gist-id}/raw/{branch}/{filename}
```

Example:
```
https://gist.githubusercontent.com/elbruno/copilot-app-cost-canvas/raw/main/extension.mjs
```

## Updating the Documentation

Update all docs to reference your gist URL:

### README.md
```markdown
## Quick Start (1 minute) ⚡

Open **GitHub Copilot App** → Click **"Add to panel..."** → **"Import canvas from gist/URL"** → Paste:

```
YOUR_GIST_RAW_URL_HERE
```
```

### docs/INSTALL.md
```markdown
### Step 2: Paste the Gist URL

```
YOUR_GIST_RAW_URL_HERE
```
```

## How Users Will Install

Once the gist is created and documented:

1. User opens GitHub Copilot App
2. User clicks "Add to panel..." → "Import canvas from gist/URL"
3. User pastes the gist URL
4. Canvas appears in the side panel
5. Done! ✅

**No cloning, no npm install, no complexity.**

## Keeping the Gist Updated

When you update the extension in the repository, also update the gist:

```bash
# Get raw gist content
curl -o extension-current.mjs \
  "YOUR_GIST_RAW_URL"

# Compare with repo
diff extension-current.mjs .github/extensions/copilot-app-cost/extension.mjs

# If different, update gist:
# 1. Go to gist on GitHub
# 2. Edit the extension.mjs file
# 3. Paste the new content from repo
# 4. Click "Update gist"
```

## Current Status

⏳ **Gist not yet created** — Follow steps above to create it once the extension is finalized.

Once created, update:
- README.md with the gist URL
- docs/INSTALL.md with the gist URL
- Push to GitHub

Then users can install with a single paste!

## Why This Is Better

| Approach | Simplicity | Setup Time | Updates |
|----------|-----------|-----------|---------|
| **Clone + Load** | ❌ Complex | 5 min | Manual reload |
| **Gist URL** | ✅ Simple | 1 min | Copy-paste |
| **NPM Package** | ✅ Very Simple | 30 sec | Auto-updates |

**Gist is the sweet spot:** Easy for users, easy to maintain, no npm publishing needed.

---

**Next Step:** Create the gist using instructions above, then update docs with the URL.
