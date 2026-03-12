# Documentation Writing Standards

**Core Principle**: Keep documentation focused, modular, and concise (≤150 lines per file)

---

## File Size Rules

### ✅ DO
- **Limit each file to ~150 lines** (absolute max: 200 lines)
- **Split large topics** into multiple focused files
- **Create index files** to link to detailed docs

### ❌ DON'T
- Put everything in one massive file (300+ lines)
- Mix unrelated topics in same file
- Create walls of text without structure

---

## Structure Patterns

### Overview File (~100 lines)
```markdown
# Title

**Overview**: One sentence summary

## What It Does
- Key point 1
- Key point 2

## Quick Stats
| Metric | Value |

## Next Steps
1. Step 1
2. Step 2

**See Also**: [detailed-file.md](detailed-file.md)
```

### Detailed File (~120-150 lines)
```markdown
# Title - Subtitle

**Context**: What & why

## Technical Details
### Section 1
- Sub-point A
- Sub-point B

### Section 2
**Code example**
```sql
SELECT ...
```

## Verification
```bash
command to verify
```

## Troubleshooting
| Issue | Solution |
|-------|----------|
```

---

## Content Guidelines

### 1. Be Concise
- ✅ Short paragraphs (2-3 sentences)
- ✅ Bullet points over paragraphs
- ✅ Tables over lists
- ❌ Walls of text
- ❌ Repeating same info

### 2. Be Focused
- ✅ One main topic per file
- ✅ Clear title reflects content
- ❌ Multiple unrelated topics
- ❌ Vague titles

### 3. Be Structured
- ✅ Use headings (##, ###)
- ✅ Use tables for comparisons
- ✅ Use code blocks for examples
- ✅ Use lists for steps
- ❌ Flat text without structure

### 4. Be Linked
- ✅ Link between related files
- ✅ "See Also" sections at bottom
- ✅ Line counts in index files
- ❌ Orphaned files without context

---

## File Organization

### For Large Topics

**Pattern: 1 Overview + N Detail Files**

```
overview.md (80-100 lines)
├── feature-1.md (120-150 lines) - Detailed implementation
├── feature-2.md (120-150 lines) - Detailed implementation
└── feature-3.md (120-150 lines) - Detailed implementation
```

**Example**:
```
session-summary.md (81 lines)
├── session-monthly-reset.md (100 lines)
├── session-pii-scrubbing.md (106 lines)
└── session-performance.md (83 lines)
```

### Index File Pattern

**Include in README or main index**:
```markdown
## Documentation Index

### Topic Area
- **[file-1.md](file-1.md)** (XX lines) - Brief description
- **[file-2.md](file-2.md)** (XX lines) - Brief description
- **[file-3.md](file-3.md)** (XX lines) - Brief description
```

---

## Section Templates

### Technical Documentation
```markdown
## Overview
**What**: Brief description
**Why**: Reason for existing

## Implementation
### Key Concept
**Explanation**: How it works

**Example**:
```typescript
code here
```

## Configuration
```sql
SQL or config here
```

## Testing
- ✅ Test 1
- ✅ Test 2

## See Also
- [related-doc.md](related-doc.md)
```

### Process/How-To
```markdown
## Prerequisites
- [ ] Item 1
- [ ] Item 2

## Steps
1. **Step 1** - Description
   ```bash
   command
   ```

2. **Step 2** - Description

## Verification
```bash
# Check result
command to verify
```

## Troubleshooting
| Issue | Solution |
|-------|----------|
```

---

## Writing Style

### Headings
- ✅ `# Main Title` - File topic
- ✅ `## Section` - Major topic
- ✅ `### Sub-section` - Detail
- ❌ More than 3 levels deep (keep flat)

### Code Blocks
- ✅ Always specify language
- ✅ Keep examples short (<10 lines)
- ✅ Add comments for clarity

```typescript
// Good: Short, commented
const result = await scrubPII(data);
```

### Tables
- ✅ Use for comparisons
- ✅ Use for before/after
- ✅ Use for options/settings

```markdown
| Feature | Before | After |
|---------|--------|-------|
```

### Emojis
- ✅ Use sparingly for emphasis
- ✅ ✅ = completed/done
- ✅ ❌ = not done/problem
- ❌ Don't overuse (keeps professional)

---

## Quality Checks

### Before Finalizing
1. **Line count**: ≤150 lines?
2. **Focus**: One main topic?
3. **Structure**: Headings, bullets, tables?
4. **Links**: Related files linked?
5. **Clarity**: Can someone understand without you?

### Review Checklist
- [ ] File < 150 lines
- [ ] Single clear topic
- [ ] Has "See Also" links
- [ ] Uses headings/structure
- [ ] Code examples included
- [ ] Troubleshooting if technical

---

## Examples

### ✅ Good (Focused, 100 lines)
```markdown
# Feature X - Implementation

**Purpose**: What it does

## How It Works
1. Step 1
2. Step 2

## Configuration
```yaml
setting: value
```

## Testing
- ✅ Test 1
- ✅ Test 2

**See Also**: [overview.md](overview.md)
```

### ❌ Bad (300+ lines, multiple topics)
```markdown
# Everything About Project X

[100 lines about architecture]
[50 lines about setup]
[80 lines about configuration]
[70 lines about troubleshooting]
```

**Should be**:
```markdown
# Project X Overview (100 lines)
├── setup.md (100 lines)
├── configuration.md (120 lines)
└── troubleshooting.md (80 lines)
```

---

## When to Split Files

### Split When:
- File exceeds 150 lines
- Multiple distinct topics
- Different audiences (users vs developers)
- Deep detail on sub-topics

### Keep Together When:
- File under 120 lines
- Single cohesive topic
- Sequential steps in process
- Brief overview needs context

---

## File Naming

### Patterns
- **Overview**: `summary.md`, `overview.md`, `README.md`
- **Detail**: `feature-name.md`, `component-name.md`
- **Process**: `process-name.md`, `how-to-name.md`
- **Release**: `release-notes.md`, `release-features.md`

### Convention
- **lowercase-with-hyphens** for filenames
- **Title Case** for headings
- **Descriptive** names (not `doc1.md`, `notes.md`)

---

## Quick Reference

### Maximum File Size
- **Soft limit**: 150 lines
- **Hard limit**: 200 lines
- **Ideal**: 80-120 lines

### Minimum File Size
- **Too short**: <20 lines (combine with related)
- **Ideal**: 60-120 lines

### Link Requirements
- **Every file**: Should have "See Also" links
- **Overview files**: Link to all detail files
- **Detail files**: Link back to overview

---

## Memory Key Points

When writing documentation:

1. **150 lines max** - Split if longer
2. **One topic per file** - Keep focused
3. **Structure with headings** - Make scannable
4. **Link related files** - Create web of docs
5. **Show line counts** - In index files
6. **Use tables/bullets** - Over paragraphs
7. **Be concise** - Quality over quantity

**Remember**: Users scan, they don't read. Make it easy to find what they need.

---

**Last Updated**: March 12, 2026
**Purpose**: Documentation standards for consistent, focused docs
