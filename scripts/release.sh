#!/usr/bin/env bash
set -euo pipefail

# ─── Preflight checks ────────────────────────────────────────────────────────

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [[ "$BRANCH" != "main" ]]; then
	echo "Error: must be on main branch (currently on $BRANCH)" >&2
	exit 1
fi

if [[ -n $(git status --porcelain) ]]; then
	echo "Error: working tree is dirty — commit or stash changes first" >&2
	exit 1
fi

echo "Running tests..."
if ! npm test --silent 2>/dev/null; then
	echo "Error: tests failed" >&2
	exit 1
fi

# ─── Determine bump type ─────────────────────────────────────────────────────

BUMP="${1:-}"

LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [[ -z "$BUMP" ]]; then
	if [[ -n "$LAST_TAG" ]]; then
		COMMITS=$(git log "$LAST_TAG"..HEAD --format="%s")
	else
		COMMITS=$(git log --format="%s")
	fi

	if echo "$COMMITS" | grep -q "BREAKING CHANGE"; then
		BUMP="major"
	elif echo "$COMMITS" | grep -q "^feat:"; then
		BUMP="minor"
	elif echo "$COMMITS" | grep -qE "^(fix|perf):"; then
		BUMP="patch"
	else
		BUMP="patch"
	fi
fi

if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
	echo "Error: invalid bump type '$BUMP' (must be patch, minor, or major)" >&2
	exit 1
fi

# ─── Bump version in package.json ────────────────────────────────────────────

CURRENT=$(node -p "require('./package.json').version")
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

case "$BUMP" in
	major)
		MAJOR=$((MAJOR + 1))
		MINOR=0
		PATCH=0
		;;
	minor)
		MINOR=$((MINOR + 1))
		PATCH=0
		;;
	patch)
		PATCH=$((PATCH + 1))
		;;
esac

NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"

echo "Bumping $CURRENT → $NEW_VERSION ($BUMP)"

node -e "
const fs = require('fs');
const raw = fs.readFileSync('package.json', 'utf8');
const pkg = JSON.parse(raw);
pkg.version = '$NEW_VERSION';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, '\t') + '\n');
"

# ─── Generate/update CHANGELOG.md ────────────────────────────────────────────

TODAY=$(date +%Y-%m-%d)

if [[ -n "$LAST_TAG" ]]; then
	LOG=$(git log "$LAST_TAG"..HEAD --format="%h %s")
else
	LOG=$(git log --format="%h %s")
fi

FEATURES=""
FIXES=""
OTHER=""

while IFS= read -r line; do
	[[ -z "$line" ]] && continue

	HASH="${line%% *}"
	MSG="${line#* }"

	if [[ "$MSG" =~ ^feat:\ (.+) ]]; then
		FEATURES+="- ${BASH_REMATCH[1]} ($HASH)"$'\n'
	elif [[ "$MSG" =~ ^(fix|perf):\ (.+) ]]; then
		FIXES+="- ${BASH_REMATCH[2]} ($HASH)"$'\n'
	else
		OTHER+="- ${MSG} ($HASH)"$'\n'
	fi
done <<< "$LOG"

SECTION=""
SECTION+="## [${NEW_VERSION}] - ${TODAY}"$'\n'

if [[ -n "$FEATURES" ]]; then
	SECTION+=$'\n'"### Features"$'\n\n'"${FEATURES}"
fi
if [[ -n "$FIXES" ]]; then
	SECTION+=$'\n'"### Fixes"$'\n\n'"${FIXES}"
fi
if [[ -n "$OTHER" ]]; then
	SECTION+=$'\n'"### Other"$'\n\n'"${OTHER}"
fi

if [[ -f "CHANGELOG.md" ]]; then
	# Prepend new section after the "# Changelog" header
	EXISTING=$(tail -n +2 "CHANGELOG.md")
	printf '# Changelog\n\n%s\n%s\n' "$SECTION" "$EXISTING" > CHANGELOG.md
else
	printf '# Changelog\n\n%s\n' "$SECTION" > CHANGELOG.md
fi

# ─── Commit, tag, push, release ──────────────────────────────────────────────

git add package.json CHANGELOG.md
git commit -m "release: v${NEW_VERSION}"
git tag "v${NEW_VERSION}"
git push origin main
git push origin "v${NEW_VERSION}"

gh release create "v${NEW_VERSION}" \
	--title "v${NEW_VERSION}" \
	--notes "$SECTION"

echo ""
echo "Released v${NEW_VERSION}"
