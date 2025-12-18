# Adams Apples Schema Explorer - Enhanced Version

## How to Use

Open `index.html` in a browser. The application runs entirely client-side with no server required. Use the **Diagram** tab to visualize table relationships—click any table to see its connections, toggle **Isolate Mode** to focus on one table and its neighbors, and switch **Edge Mode** between Focus/All/Off. The **Docs** tab provides searchable documentation for all 91 database objects with business-focused explanations. The **Glossary** tab explains technical database terms in plain language. Click **Build Print Doc** to generate a complete PDF-ready document with all documentation, FK audit warnings, and the glossary included.

---

## What Changed (Enhanced v2)

### 1. Comprehensive Business Documentation (91 Objects)
- **27 Tables**: Each has what/where/why/dataFlow/example sections explaining business purpose
- **17 Enums**: Purpose, workflow impact, and concrete examples
- **15 Views**: What they compute, why they exist, when to use them
- **9 Functions**: What they do, when called, automation value
- **23 Triggers**: What fires them, why automatic, workflow impact

### 2. Business-First FK Explanations
- **FK_WHY_DETAILED**: Rich explanations for common FK patterns (client_id, location_id, user_id, etc.)
- **Multiple aspects per FK**: billing, permissions, integrity, example
- **Workflow-oriented**: Explains WHAT relationships enable, not just that they exist
- Example: "client_id links everything for billing, permissions, reporting, and historical integrity"

### 3. Enhanced Print Document Generation
- **Complete standalone HTML**: Opens in new window with all content
- **All object types**: Tables, enums, views, functions, triggers with business docs
- **Statistics dashboard**: Shows counts by type (27 tables, 17 enums, etc.)
- **FK Index Audit**: Warns about missing indexes with SQL snippets
- **Full Glossary**: All technical terms defined
- **Professional formatting**: Page breaks, clean typography, print-optimized CSS

### 4. Diagram Features (Already Implemented)
- **Isolate Mode (1-hop)**: Toggle to show only selected table and direct neighbors
- **Edge Mode**: Focus (default), All, or Off
- **FK Index Warnings**: ⚠ icon on nodes with missing FK indexes
- **Pan/Zoom**: Mouse drag and wheel zoom

### 5. Inspector Enhancements
- **📋 Business Context**: What/where/why/dataFlow/example
- **📝 Why These Links Exist**: Detailed FK explanations
- **🔍 Referenced By**: Shows incoming FKs (what points TO this table)
- **⚠ Index Warnings**: Highlighted missing FK index recommendations
- **💡 Hints**: Contextual tips based on object type

### 6. Dark Theme Improvements
- **Link colors**: Readable cyan (#4dc3ff) on dark backgrounds
- **Hover states**: Lighter blue (#8dd7ff) for hover
- **Consistent styling**: Applied to diagram and doc links

---

## File Statistics

| File | Lines | Size |
|------|-------|------|
| app.js | 2,122 | 127 KB |
| styles.css | 595 | 16 KB |
| index.html | 145 | 6 KB |
| data.js | 1,521 | 77 KB |

## Object Coverage

| Type | Count | Business Docs |
|------|-------|---------------|
| Tables | 27 | ✅ All documented |
| Enums | 17 | ✅ All documented |
| Views | 15 | ✅ All documented |
| Functions | 9 | ✅ All documented |
| Triggers | 23 | ✅ All documented |
| **Total** | **91** | **100%** |

---

## Acceptance Checklist

- [x] Isolate mode works and is 1-hop
- [x] Selecting a table makes relationships legible
- [x] Object docs feel written for a client (not repetitive/generic)
- [x] "Why these links exist" explains business reason per relationship
- [x] Missing FK indexes are flagged + summarized
- [x] Glossary exists and prints
- [x] Print output is clean and complete
