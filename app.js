/* Adams Apples v2 — Luna-style Schema Explorer (Enhanced v2)
 * Features:
 * - Diagram: tables with FK edges, isolate mode (1-hop)
 * - Docs: comprehensive business-focused explanations for ALL objects
 * - Glossary: plain-language database terms
 * - FK Index Audit: warns about missing indexes
 * - Print: clean PDF generation with full documentation
 * - "Why These Links Exist": workflow-based FK explanations
 */

(function () {
  "use strict";

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  if (!window.SCHEMA || !Array.isArray(window.SCHEMA.objects)) {
    console.error("SCHEMA not found. Make sure data.js loads before app.js.");
    return;
  }

  const SCHEMA = window.SCHEMA;
  const objects = SCHEMA.objects;
  const byKey = new Map(objects.map(o => [o.key, o]));
  const byType = new Map();
  for (const o of objects) {
    if (!byType.has(o.type)) byType.set(o.type, []);
    byType.get(o.type).push(o);
  }

  // ==========================================================================
  // GLOSSARY - Plain-language database terms
  // ==========================================================================
  const GLOSSARY = {
    "Database Fundamentals": {
      "Primary Key (PK)": "A column that uniquely identifies each row. Like a social security number for records—no duplicates allowed. This schema uses UUIDs (universally unique identifiers) for all primary keys.",
      "Foreign Key (FK)": "A column that links to another table's primary key. This is how we connect related data—for example, linking a tree record to its orchard location. Without FKs, you'd have to copy client info into every work order instead of just referencing the client.",
      "Index": "A lookup structure that speeds up searches on specific columns. Like the index in a book—instead of reading every page, you jump straight to what you need. Critical for FKs that get joined frequently.",
      "Constraint": "A rule enforced by the database. Examples: NOT NULL (must have a value), UNIQUE (no duplicates), CHECK (value must meet criteria). Prevents bad data from ever entering the system.",
      "Schema": "The complete structure of a database—all tables, columns, relationships, and rules. This document describes the Adams Apples schema.",
      "Row / Record": "A single entry in a table. One tree, one client, one work order.",
      "Column / Field": "A single piece of information stored for each record. Examples: name, email, planting_date.",
      "Query": "A request to retrieve or modify data. The application sends queries to the database to read and write information.",
      "JOIN": "Combining data from multiple tables based on a relationship. Example: 'Show me all trees with their variety names' joins trees to varieties."
    },
    "Data Types": {
      "UUID": "Universally Unique Identifier—a 36-character code like '550e8400-e29b-41d4-a716-446655440000'. Guaranteed unique across all systems, even when generated offline.",
      "VARCHAR(n)": "Variable-length text up to n characters. VARCHAR(200) stores up to 200 characters of text.",
      "TEXT": "Unlimited-length text. Used for descriptions, notes, and other long-form content.",
      "INTEGER": "Whole numbers: 1, 42, -7. Used for counts, years, quantities.",
      "NUMERIC(p,s)": "Precise decimal numbers with p total digits and s decimal places. NUMERIC(10,2) stores values like 12345678.99—essential for money calculations.",
      "BOOLEAN": "True or false. Used for flags like is_active, is_rootstock, follow_up_required.",
      "DATE": "Calendar date without time: 2025-03-15.",
      "TIMESTAMPTZ": "Date plus time plus timezone: 2025-03-15T14:30:00-05:00. The 'TZ' means timezone-aware, so times display correctly regardless of where users are.",
      "JSONB": "Flexible JSON data stored efficiently. Used for metadata, preferences, and other semi-structured data that varies between records. The 'B' means binary storage for faster queries.",
      "CITEXT": "Case-insensitive text. 'John@Example.com' matches 'john@example.com'. Used for email addresses to prevent duplicate accounts with different casing.",
      "UUID[]": "An array (list) of UUIDs. Used in work_orders.tree_ids to link one work order to multiple trees without needing a junction table.",
      "geometry": "PostGIS spatial data. Points store GPS coordinates (lat/long); Polygons store property boundaries. Enables mapping and geographic queries like 'find all trees within 100 meters.'"
    },
    "Database Objects": {
      "Table": "The primary storage structure. Each table holds one type of thing: clients, trees, work orders, etc. Tables have defined columns with specific data types.",
      "View": "A saved query that acts like a virtual table. Views combine data from multiple tables for reporting—like v_payroll_weekly which calculates wages. They don't store data; they compute it on demand.",
      "Function": "Reusable code stored in the database. generate_tree_number() creates unique tree IDs following the A-HON-0001 format. Called by triggers or directly from application code.",
      "Trigger": "Automatic code that runs when data changes. When you insert a tree health record, a trigger automatically updates the tree's health status. Ensures data stays consistent without application code remembering to do it.",
      "Enum": "A predefined list of allowed values. work_order_status can only be DRAFT, PROPOSED, APPROVED, etc.—not arbitrary text. Prevents typos and ensures consistent values.",
      "Sequence": "A counter that generates unique numbers. Used for sequential identifiers like WO-2025-0001. Increments atomically so concurrent users get different numbers."
    },
    "Relationships & Architecture": {
      "One-to-Many": "One record relates to many others. One client has many locations; one location has many trees. Implemented with a FK on the 'many' side pointing to the 'one' side.",
      "Many-to-Many": "Records on both sides can relate to multiple records on the other side. Example: one work order can involve multiple trees, and one tree can have multiple work orders. Implemented through junction tables or arrays.",
      "Referential Integrity": "The database prevents orphaned records. You can't delete a client if they still have locations—those locations would have no owner. ON DELETE CASCADE means child records are automatically deleted with the parent.",
      "Normalization": "Organizing data to reduce redundancy. Instead of storing 'Honeycrisp' on every tree, we store it once in varieties and link to it. Changes only need to happen in one place.",
      "Multi-tenant": "Multiple clients share the same database, separated by client_id. Each client sees only their data through application-level filtering.",
      "Audit Trail": "Recording every change. The audit_log table captures who changed what, when, and the before/after values. Critical for compliance and debugging.",
      "Soft Delete": "Marking records as is_active=FALSE instead of actually deleting them. Preserves history and allows restoration.",
      "Source of Truth": "The authoritative location for a piece of data. Clients table is the source of truth for client names—other tables reference it rather than copying the name."
    }
  };

  // ==========================================================================
  // BUSINESS_DOCS - Workflow-focused explanations for ALL objects
  // ==========================================================================
  const BUSINESS_DOCS = {
    // -------------------------------------------------------------------------
    // TABLES (27)
    // -------------------------------------------------------------------------
    clients: {
      what: "Every orchard owner Adam works with—active management clients, nursery tree buyers, and historical customers.",
      where: "Appears in: Client dropdown on location forms, work order creation, nursery order entry, invoice headers, and the client portal login.",
      why: "Clients are the SOURCE OF TRUTH for who Adam does business with. Everything rolls up to client_id for billing, permissions, reporting, and historical integrity. Without this table, you'd have inconsistent client names scattered across work orders.",
      dataFlow: "Created when a new customer signs up → Referenced when creating their locations → Linked to every work order, invoice, and nursery order → Payment terms determine invoice due dates → is_active=FALSE when relationship ends (soft delete preserves history).",
      example: "Smith Farms signs a management contract. You create their client record with 30-day payment terms. All their orchards (locations), work orders, and invoices link here via client_id."
    },
    users: {
      what: "Everyone who logs into the system—Adam's office staff, field workers, managers, and client portal users.",
      where: "Appears in: Login screen, worker assignment dropdowns, 'created by' and 'assigned to' fields, time entry clocking, client portal access.",
      why: "Users are ACTORS, not owners. The user_id tracks who performed actions (audit trail), while ownership scopes through client_id or location_id. Pay rates enable automatic labor cost and billable amount calculation.",
      dataFlow: "User created with role → Logs in → JWT token issued → Every API call checks permissions based on role → Workers clock time with their rates → Payroll calculated from rates × hours → Audit log records who changed what.",
      example: "Field worker John ($18/hr, billed at $35/hr) logs in, gets assigned to WO-2025-0044, clocks 4 hours pruning. System pays him $72, invoices client $140, logs him as the worker."
    },
    locations: {
      what: "Physical properties—client orchards, Adam's nursery, storage facilities. Each has an address, acreage, and optional GPS boundaries.",
      where: "Appears in: Location selector on work orders, tree assignment, nursery batch location, map views, the 'where' for all orchard operations.",
      why: "Locations are the GEOGRAPHIC ANCHOR for everything. Work happens AT locations. Trees grow AT locations. Enables map views, acreage-based planning, property-specific spray schedules. NULL client_id = Adam's own property.",
      dataFlow: "Client created → Their properties added as locations with GPS boundaries → Blocks subdivide large orchards → Trees assigned with row/position → Work orders scheduled per-location → Map shows everything visually.",
      example: "Smith Farms has 'North Orchard' (40 acres, Gala focus) and 'South Orchard' (25 acres, mixed varieties). Both link to Smith's client_id. Adam's nursery has client_id=NULL."
    },
    orchard_blocks: {
      what: "Subdivisions within an orchard—named sections like 'Northeast Block' or 'Peach Section' with specific planting layouts.",
      where: "Appears in: Tree location assignment, block-level reports, crew scheduling, map display with colored boundaries.",
      why: "Practical FIELD ORGANIZATION. A 100-acre orchard is unmanageable as one unit. Blocks let crews work section-by-section with different spray schedules, harvest timing, or variety focus. Row/position within blocks enables individual tree tracking.",
      dataFlow: "Location created → Blocks defined with grid layouts (rows × positions) → Trees assigned to block + row + position → Health snapshots can be per-block → Work orders may target specific blocks.",
      example: "North Orchard Block A: 20 rows × 50 trees, planted 2019, primarily Honeycrisp on G.41 rootstock, 12ft row spacing. Block B is 2022 planting, mostly Enterprise."
    },
    trees: {
      what: "Every individual tree from propagation through its productive life. The CORE ASSET being managed in this system.",
      where: "Appears in: Tree map, health records, nursery batch tracking, work order tree lists, sales records, the heart of orchard operations.",
      why: "PRECISION ORCHARD MANAGEMENT at the individual tree level. Know exactly which trees need attention, which are producing, which to replace. tree_number (A-HON-0042) is a permanent identifier that NEVER gets reused, even after removal.",
      dataFlow: "Grafted in nursery (source_batch_id) → Grows in nursery field → Reserved for client → Delivered to client's orchard → Health monitored via tree_health_records → Stage progresses through lifecycle → Eventually DEAD or REMOVED.",
      example: "A-HON-0042: Honeycrisp on G.41, grafted 2023, planted at Smith North Orchard Block A Row 5 Position 12, currently HEALTHY stage ORCHARD_PLANTED."
    },
    fruit_species: {
      what: "Top-level fruit categories: Apple, Pear, Peach, Cherry, Plum, etc. with single-letter codes.",
      where: "Appears in: Variety catalog organization, tree number prefix (A=Apple), species-level filtering and reports.",
      why: "ORGANIZES THE CATALOG. Each species has different grafting requirements, disease pressures, and market characteristics. The code (A, P, H, C, L) appears in every tree number for quick identification.",
      dataFlow: "Species defined with code → Varieties added under species → Trees linked to varieties → Species code appears in tree numbers (A-HON-0001 = Apple-Honeycrisp-0001) → Enables 'all apples' queries.",
      example: "Apple (code 'A') encompasses 100+ varieties from Honeycrisp to Enterprise to historic heirlooms like Arkansas Black."
    },
    varieties: {
      what: "Specific cultivars (Honeycrisp, Enterprise) AND rootstocks (G.41, M.9). Both stored here with is_rootstock flag.",
      where: "Appears in: Tree scion/rootstock selection, nursery batch planning, ripening schedule reports, disease resistance comparisons.",
      why: "Captures HORTICULTURAL COMPLEXITY. A tree has TWO variety links: scion (fruiting, determines flavor/timing) and rootstock (determines size/vigor/disease resistance). This enables 'all Honeycrisp trees' AND 'all trees on G.41 rootstock' queries.",
      dataFlow: "Rootstocks and scions cataloged with characteristics → Nursery batches specify scion + rootstock combo → Trees inherit variety info → Ripening reports use ripening_start_doy → Disease queries filter by resistance ratings.",
      example: "Honeycrisp (scion): ripens mid-September, needs pollinizer, stores 4-6 months. G.41 (rootstock): dwarf, excellent fire blight resistance, requires support."
    },
    nursery_batches: {
      what: "A group of trees propagated together—same scion/rootstock combination, grafted at the same time.",
      where: "Appears in: Nursery production planning, tree source tracking, inventory counts, batch success rate reports.",
      why: "PRODUCTION TRACKING. Grafting happens in batches for efficiency. Tracking planned vs. grafted vs. successful quantities shows take rates. Links finished trees back to their propagation origin for quality tracing.",
      dataFlow: "Batch planned (PLANNED) → Grafting performed (GRAFTED) → Healing monitored → Lined out in nursery rows → Trees with source_batch_id represent the successful takes → Eventually COMPLETED when all trees shipped/moved.",
      example: "NB-2025-023: 200 Honeycrisp/G.41 grafted March 2025. 170 survived (85% take rate), now LINED_OUT, ready for 2027 shipping."
    },
    nursery_orders: {
      what: "Client orders for nursery trees—quotes, confirmed orders, and completed sales. The SALES PIPELINE for nursery operations.",
      where: "Appears in: Nursery order entry, order status board, deposit tracking, delivery scheduling, revenue reports.",
      why: "REVENUE AND PRODUCTION PLANNING. Orders drive what batches to grow. Deposit tracking ensures commitment before production starts. Status workflow from QUOTE → CONFIRMED → READY → COMPLETED tracks the sales cycle.",
      dataFlow: "Client requests quote → Order created (QUOTE) → Deposit paid, status CONFIRMED → Batches grown to fill order → Trees become READY → Delivered → COMPLETED → Invoice generated from order total.",
      example: "NO-2025-007: Smith Farms orders 500 trees (300 Honeycrisp, 200 Enterprise) for March 2026 delivery. $12,500 total, $2,500 deposit paid, status CONFIRMED."
    },
    nursery_order_items: {
      what: "Line items on nursery orders—each variety/quantity combination is a separate item with its own price.",
      where: "Appears in: Order detail pages, batch assignment, delivery tracking, invoice line item generation.",
      why: "ITEMIZED TRACKING. Orders typically include multiple varieties. Each item tracks quantity ordered → produced → delivered separately. Links to the batch being grown to fill it. Enables partial shipments.",
      dataFlow: "Order created → Items added with variety/qty/price → Batch assigned to grow the trees → Trees linked as produced (nursery_order_item_id on trees) → Delivered count updated → Balance = ordered - delivered.",
      example: "Order NO-2025-007 Item 1: 300 Honeycrisp on G.41 @ $25/tree = $7,500. Linked to batch NB-2025-023. 170 produced so far."
    },
    work_order_categories: {
      what: "Top-level groupings for work types: Cultural Practices, Pest Management, Harvest Operations, etc. (7 categories)",
      where: "Appears in: Work order type selector (grouped by category), category-level reports, work type administration.",
      why: "LOGICAL ORGANIZATION. 42+ work types are unmanageable without grouping. Categories enable 'all pest management work this month' reports and keep the UI navigable. Default colors and icons provide visual consistency.",
      dataFlow: "Categories defined by admin → Types grouped under categories → Work orders reference types → Reports can aggregate by category → UI shows grouped dropdowns.",
      example: "Cultural Practices includes: Pruning, Training, Thinning (Hand), Thinning (Chemical), Suckering, Branch Spreading."
    },
    work_order_types: {
      what: "Specific kinds of work: Pruning, Spraying, Harvesting, Irrigation Repair, etc. (42+ types across 7 categories)",
      where: "Appears in: Work order creation type dropdown, default rate suggestions, work type reports, scheduling filters.",
      why: "STANDARDIZED DESCRIPTIONS. Instead of free-text 'did some pruning', selecting 'Dormant Pruning' from Work Order Types ensures consistent categorization, enables reporting, and can suggest default hourly rates.",
      dataFlow: "Type selected when creating work order → Description can auto-populate → Default rate suggested → Enables 'all pruning work this year' queries → Categories roll up types for high-level reports.",
      example: "Dormant Pruning (Cultural Practices): standard winter orchard maintenance, default $45/hour suggested rate."
    },
    work_orders: {
      what: "Tasks to be done—from initial request through completion and invoicing. The OPERATIONAL HEART of the system.",
      where: "Appears in: Work order board, scheduling calendar, time entry screens, invoice generation, client portal reviews.",
      why: "TRACKS ALL CLIENT WORK. Every billable activity flows through work orders. The status workflow enforces approval processes. Captures estimated vs. actual hours/costs. Links time entries for payroll and billing.",
      dataFlow: "Created (DRAFT) → Proposed to client → CLIENT_REVIEW → APPROVED → SCHEDULED with dates → IN_PROGRESS (workers clocking time) → COMPLETED → VERIFIED → INVOICED when added to invoice.",
      example: "WO-2025-0042: Dormant pruning at Smith North Orchard, assigned to John, 8 hours estimated, scheduled Feb 15-16, status IN_PROGRESS."
    },
    time_entries: {
      what: "Clock-in/clock-out records for workers on specific work orders. Raw time data for payroll and billing.",
      where: "Appears in: Time clock interface, work order detail (hours logged), payroll reports, billing calculations.",
      why: "LABOR COST TRACKING. Captures who worked when on what. Hourly/billable rates snapshot at entry time (in case rates change). Automatic calculation: labor_cost = duration × hourly_rate, billable_amount = duration × billable_rate.",
      dataFlow: "Worker clocks in (start_time) → Works on work order → Clocks out (end_time) → Trigger calculates duration, labor_cost, billable_amount → Work order actual_hours updated → Payroll views aggregate by user → Invoices aggregate by work order.",
      example: "John worked WO-2025-0042 from 8:00 AM to 4:30 PM with 30min break. 8 hours × $18/hr = $144 labor cost, × $35/hr = $280 billable."
    },
    invoices: {
      what: "Bills sent to clients for completed work and tree sales. Header record with status and totals.",
      where: "Appears in: Invoice generation, accounts receivable, client portal, payment application, aging reports.",
      why: "REVENUE COLLECTION. Tracks what's owed, what's paid, what's overdue. Status workflow from DRAFT → SENT → PARTIALLY_PAID → PAID. Due date auto-calculated from client's payment_terms. Balance_due = total - paid.",
      dataFlow: "Work completed/trees delivered → Invoice created (DRAFT) → Line items added from work orders/nursery orders → Sent to client → Payments received and applied → Balance tracked → Status updates based on paid_amount.",
      example: "INV-2025-0015: Smith Farms, $2,450 for February work orders, due in 30 days, status SENT, balance_due $2,450."
    },
    invoice_line_items: {
      what: "Individual charges on an invoice—each work order or nursery item becomes a line item with description and amount.",
      where: "Appears in: Invoice detail, itemized billing, work order to invoice linking, revenue by type reports.",
      why: "ITEMIZED BILLING. Clients see exactly what they're paying for. Links back to source (work_order_id or nursery_order_item_id) for traceability. Enables 'revenue from pruning' vs 'revenue from tree sales' analysis.",
      dataFlow: "Work order COMPLETED or nursery order delivered → Line item created with description + amount → Added to invoice → Invoice subtotal computed from line items → Client sees itemized bill.",
      example: "Invoice INV-2025-0015 Line 1: 'Dormant Pruning - North Orchard (8 hrs)' - $280.00, linked to WO-2025-0042."
    },
    payments: {
      what: "Money received from clients—checks, ACH transfers, credit cards, cash. Individual payment records.",
      where: "Appears in: Payment entry, invoice detail (payments applied), bank reconciliation, cash flow reports.",
      why: "CASH FLOW TRACKING. Know exactly what's been paid, by what method, when, and which invoice it applies to. Multiple payments can partially pay an invoice. Check details stored for bank reconciliation.",
      dataFlow: "Payment received → Recorded with method/amount/invoice → Invoice paid_amount updated → If paid_amount >= total_amount, status becomes PAID → Otherwise PARTIALLY_PAID → AR aging reflects actual balances.",
      example: "Payment #P-2025-089: Check #4521 for $2,450 received March 1, applied to INV-2025-0015, invoice now PAID."
    },
    inventory_items: {
      what: "Supplies, chemicals, tools, and equipment Adam uses or sells. Master catalog of inventory.",
      where: "Appears in: Inventory list, purchase entry, work order material usage, low stock alerts, equipment maintenance.",
      why: "TRACK WHAT'S ON HAND. Know quantities, costs, storage locations. Automatic stock_status updates (IN_STOCK/LOW_STOCK/OUT_OF_STOCK). Equipment tracks maintenance dates. Billable markup = price_per_unit - cost_per_unit.",
      dataFlow: "Item created in catalog → Purchases add stock (PURCHASE transactions) → Work orders consume stock (USAGE transactions) → Stock level updates → Falls below min_stock_level → stock_status becomes LOW_STOCK → Alerts generated.",
      example: "Captan 80WDG: 45 lbs in stock, min stock level 20 lbs, $85/lb cost, $110/lb billed to clients, stored at Main Warehouse."
    },
    inventory_transactions: {
      what: "Every inventory movement—purchases, usage, adjustments, transfers, disposals. Complete audit trail.",
      where: "Appears in: Inventory history, cost tracking, work order material usage, transfer records, adjustment logs.",
      why: "COMPLETE ACCOUNTABILITY. Know exactly where materials went. Links usage to work orders for billing. Quantity_change can be positive (purchase) or negative (usage). Running balance computed from transaction history.",
      dataFlow: "Purchase → PURCHASE transaction (+qty) → Work order uses material → USAGE transaction (-qty, linked to work_order_id) → Manual correction → ADJUSTMENT transaction → Transfer between locations → TRANSFER with from/to locations.",
      example: "March 5: USAGE transaction, -2 lbs Captan on WO-2025-0044, qty went from 45 to 43 lbs, cost $170 billed to client."
    },
    tree_health_records: {
      what: "Individual health observations—inspections of specific trees documenting condition, issues, and treatments.",
      where: "Appears in: Tree detail health history, inspection data entry, follow-up scheduling, health trend reports.",
      why: "TRACK TREE HEALTH OVER TIME. Regular inspections catch problems early. 1-5 ratings for vigor, leaf condition, pest damage enable trending. Triggers automatically update tree's health_status and check alert rules.",
      dataFlow: "Tree inspected → Record created with ratings + issues → Trigger sets previous_status, updates tree.health_status → Alert rules evaluated → If rule matches, alert generated → Follow-up scheduled if needed.",
      example: "Tree A-HON-0042 inspected March 5: vigor 4/5, leaf condition 3/5, fire blight symptoms in issues[], Agri-Mycin treatment applied, follow_up_required=TRUE, follow_up_date=March 19."
    },
    tree_health_alert_rules: {
      what: "Configurable triggers that generate alerts when health conditions are met. Admin-defined rules.",
      where: "Appears in: Alert rule administration, system configuration, notification setup.",
      why: "PROACTIVE NOTIFICATION. Don't wait to notice problems—get alerted automatically. Rules can trigger on status changes, thresholds, or patterns. Cooldown prevents alert spam for the same tree.",
      dataFlow: "Rule defined (trigger_type, conditions) → Health record created → Trigger evaluates all active rules → Conditions met → Alert created with specified priority → Notifications sent to notify_roles users.",
      example: "Rule 'Fire Blight Alert': trigger_type='status_change', to_status=DISEASED, notify_roles=[ADMIN,MANAGER], priority=HIGH, cooldown_hours=24."
    },
    tree_health_alerts: {
      what: "Generated alerts requiring attention—created by alert rules, tracked through acknowledgment and resolution.",
      where: "Appears in: Alert dashboard, manager inbox, tree detail alerts, resolution workflow.",
      why: "ACTION TRACKING. Ensures health issues get addressed, not lost. Workflow: OPEN → ACKNOWLEDGED → RESOLVED. Resolution can link to work order created to fix the issue. trigger_data captures what caused the alert.",
      dataFlow: "Alert rule fires → Alert created (OPEN) → Appears in dashboard → Manager acknowledges → Work order created to address → Work completed → Alert resolved with resolution_work_order_id link.",
      example: "Alert: 'Fire blight detected on A-HON-0042' - priority HIGH, status OPEN, created March 5, trigger_data shows status changed from HEALTHY to DISEASED."
    },
    tree_health_snapshots: {
      what: "Point-in-time summaries of health across an orchard—aggregate counts by health status.",
      where: "Appears in: Health trend dashboard, historical reports, orchard comparison charts.",
      why: "TREND ANALYSIS. Individual records are too granular for orchard-level trends. Snapshots aggregate 'how many healthy/diseased/dead' at a point in time. Enables 'is this orchard improving?' analysis.",
      dataFlow: "Scheduled job (or manual trigger) counts trees by health_status for each location → Snapshot created → health_score = healthy / (total - dead - removed) × 100 → Dashboard shows trends over time.",
      example: "March 1 snapshot for Smith North Orchard: 2,450 healthy, 32 attention, 8 diseased, 5 dead. health_score = 97.2%."
    },
    photos: {
      what: "Images attached to any entity—trees, work orders, locations, inventory items. Polymorphic attachment.",
      where: "Appears in: Tree detail gallery, work order documentation, before/after comparisons, inspection records.",
      why: "VISUAL DOCUMENTATION. Pictures are worth 1000 words for disease identification, damage claims, work verification. Polymorphic design (context_type + context_id) allows attaching to any entity without separate tables.",
      dataFlow: "User takes photo → Uploaded with context_type + context_id → Compressed for storage → GPS coordinates captured if available → Displayed in entity detail views → Searchable by entity.",
      example: "Photo attached to tree_health_record for A-HON-0042 showing fire blight strike, taken March 5 with GPS coordinates."
    },
    audit_log: {
      what: "Complete history of every create, update, and delete. The IMMUTABLE RECORD of all changes.",
      where: "Appears in: Admin audit reports, change history on entity details, compliance reporting, debugging.",
      why: "FULL ACCOUNTABILITY. Know who changed what, when, and what the old value was. Critical for compliance, dispute resolution, and debugging. Write-only table—records are NEVER updated or deleted.",
      dataFlow: "Any entity changes (via triggers or application) → Audit record created with entity_type, entity_id, action, user_id, old_values JSON, new_values JSON → Searchable by entity, user, date, or changed_fields.",
      example: "March 5 14:32: user 'john@example.com' UPDATE on tree A-HON-0042, changed_fields=['health_status'], old_values={health_status:'HEALTHY'}, new_values={health_status:'DISEASED'}."
    },
    notifications: {
      what: "System messages to users—work order assignments, alerts, low stock warnings, invoice reminders.",
      where: "Appears in: User notification inbox, email delivery, mobile push (if implemented), unread badge counts.",
      why: "KEEP USERS INFORMED. Bridges database events to user awareness. Delivery_method controls in-app vs email vs both. is_read tracks acknowledgment. Polymorphic entity_type/entity_id links to the relevant record.",
      dataFlow: "Event occurs (work order assigned, alert created, etc.) → Notification created for relevant users → Delivered via configured method → User views/clicks → is_read set TRUE → Old notifications can be archived.",
      example: "Notification to John: 'You've been assigned to WO-2025-0044', notification_type=WORK_ORDER_ASSIGNED, delivery_method=BOTH, is_read=FALSE."
    },
    refresh_tokens: {
      what: "Long-lived tokens for JWT authentication renewal without re-login. Security infrastructure.",
      where: "Appears in: Behind-the-scenes authentication, session management, device tracking, security admin.",
      why: "SECURITY + CONVENIENCE. Access tokens expire quickly (24hr) for security. Refresh tokens (7 days) allow seamless renewal without re-entering password. Device tracking enables 'log out all devices' feature.",
      dataFlow: "User logs in → Access token (short) + refresh token (long) issued → Access token used for API calls → Expires → Refresh token gets new access token → User logout revokes refresh token → Device_info tracks where tokens are used.",
      example: "Refresh token for john@example.com from 'iPhone Safari', expires March 12, is_revoked=FALSE."
    },

    // -------------------------------------------------------------------------
    // ENUMS (17)
    // -------------------------------------------------------------------------
    user_role: {
      what: "Defines permission levels: ADMIN (full access), MANAGER (operational), WORKER (field tasks), CLIENT (portal view).",
      where: "Stored on users.role. Checked on every API call to determine what actions are allowed.",
      why: "SECURITY AND ACCESS CONTROL. Not everyone should see financial data or delete records. Roles enable the principle of least privilege—users get exactly the access they need, no more.",
      dataFlow: "User created with role → Login returns role in JWT → Every API endpoint checks role → UI shows/hides features based on role → Audit log records role of user making changes.",
      example: "John is WORKER: can clock time and record health observations. Cannot approve work orders, view payroll, or delete clients."
    },
    location_type: {
      what: "Categories of physical locations: ORCHARD, NURSERY, FARM, GREENHOUSE, STORAGE, OTHER.",
      where: "Stored on locations.location_type. Used for filtering and location-specific logic.",
      why: "DIFFERENT LOCATION TYPES HAVE DIFFERENT NEEDS. Orchards have blocks and trees. Nurseries have batches. Storage locations hold inventory. The type determines what relationships and features are relevant.",
      dataFlow: "Location created with type → UI shows type-appropriate fields → Reports can filter by type → 'Show all orchards' query filters on location_type='ORCHARD'.",
      example: "Adam's property is type NURSERY (propagation happens here). Smith's properties are type ORCHARD (production happens there)."
    },
    nursery_batch_status: {
      what: "Lifecycle stages for propagation batches: PLANNED → GRAFTED → HEALING → LINED_OUT → READY_TO_DIG → COMPLETED.",
      where: "Stored on nursery_batches.status. Drives batch workflow and inventory visibility.",
      why: "PRODUCTION VISIBILITY. Know where each batch is in the multi-year propagation cycle. READY_TO_DIG batches are available for sale. COMPLETED means all trees have been shipped or moved.",
      dataFlow: "Batch created (PLANNED) → Grafting done (GRAFTED) → Callusing (HEALING) → Transplanted to rows (LINED_OUT) → Big enough to sell (READY_TO_DIG) → All trees shipped (COMPLETED).",
      example: "NB-2025-023 status progression: PLANNED (January) → GRAFTED (March) → HEALING (April) → LINED_OUT (June) → will be READY_TO_DIG in 2027."
    },
    nursery_order_status: {
      what: "Sales pipeline stages: QUOTE → PENDING → CONFIRMED → IN_PROGRESS → READY → PARTIALLY_SHIPPED → COMPLETED.",
      where: "Stored on nursery_orders.status. Drives order board display and workflow actions.",
      why: "SALES CYCLE TRACKING. Know which orders are firm commitments (CONFIRMED) vs just inquiries (QUOTE). READY means trees can be delivered. PARTIALLY_SHIPPED handles split deliveries.",
      dataFlow: "Client inquires (QUOTE) → Agrees and pays deposit (CONFIRMED) → Production begins (IN_PROGRESS) → Trees ready (READY) → Some trees shipped (PARTIALLY_SHIPPED) → All delivered (COMPLETED).",
      example: "Order NO-2025-007 was QUOTE → client paid $2,500 deposit → now CONFIRMED → will become IN_PROGRESS when linked batch starts growing."
    },
    tree_stage: {
      what: "Lifecycle stages: NURSERY_FIELD → RESERVED → READY_TO_SHIP → ORCHARD_PLANTED → ORCHARD_MATURE → DEAD/REMOVED.",
      where: "Stored on trees.stage. Determines where a tree is in its lifecycle and what actions are valid.",
      why: "LIFECYCLE TRACKING. A tree in NURSERY_FIELD is inventory; RESERVED is committed to a buyer; ORCHARD_PLANTED is in production. Different stages enable different operations.",
      dataFlow: "Tree created from batch (NURSERY_FIELD) → Client reserves (RESERVED, reserved_for_client_id set) → Dug (READY_TO_SHIP) → Planted at client orchard (ORCHARD_PLANTED) → Producing (ORCHARD_MATURE) → Dies (DEAD) or cut (REMOVED).",
      example: "A-HON-0042 stage: NURSERY_FIELD → RESERVED for Smith Farms → READY_TO_SHIP March 2026 → ORCHARD_PLANTED March 2026."
    },
    health_status: {
      what: "Tree health conditions: HEALTHY, ATTENTION (monitor), DISEASED (active problem), DEAD, REMOVED.",
      where: "Stored on trees.health_status and tree_health_records.health_status. Drives map coloring and alert rules.",
      why: "HEALTH VISIBILITY. At-a-glance view of orchard condition. Map shows healthy=green, attention=yellow, diseased=orange, dead=gray. Alert rules can trigger on status changes.",
      dataFlow: "Tree created (HEALTHY default) → Health inspection recorded → Trigger updates tree.health_status from record → Map updates → If changed to DISEASED, alert rules fire → Treatment applied → Status may return to HEALTHY.",
      example: "A-HON-0042 changed from HEALTHY to DISEASED after fire blight spotted. Map marker changed from green to orange. Manager alert generated."
    },
    work_order_status: {
      what: "Workflow stages: DRAFT → PROPOSED → CLIENT_REVIEW → APPROVED → SCHEDULED → IN_PROGRESS → COMPLETED → VERIFIED → INVOICED.",
      where: "Stored on work_orders.status. Drives the work order board and available actions.",
      why: "WORKFLOW ENFORCEMENT. Ensures proper approval chain. Can't invoice before completion. Can't schedule before approval. Status-based filtering shows 'what needs attention now.'",
      dataFlow: "Created (DRAFT) → Submitted (PROPOSED) → Client sees (CLIENT_REVIEW) → Client approves (APPROVED) → Dates set (SCHEDULED) → Workers clock time (IN_PROGRESS) → Work done (COMPLETED) → Manager checks (VERIFIED) → Added to invoice (INVOICED).",
      example: "WO-2025-0042 workflow: DRAFT → PROPOSED Feb 1 → APPROVED Feb 3 → SCHEDULED Feb 15-16 → IN_PROGRESS Feb 15 → COMPLETED Feb 16."
    },
    work_priority: {
      what: "Urgency levels: LOW, NORMAL, HIGH, URGENT. Affects scheduling and notification priority.",
      where: "Stored on work_orders.priority. Displayed in work order lists and used for sorting.",
      why: "SCHEDULING PRIORITIZATION. URGENT work (storm damage) jumps the queue. LOW priority fills gaps. Notifications for HIGH/URGENT may send immediately vs batched.",
      dataFlow: "Work order created with priority → Shows in priority-sorted list → URGENT items highlighted → Notifications may have elevated priority → Scheduling algorithm considers priority.",
      example: "Storm damage cleanup: priority=URGENT. Routine fertilizer application: priority=NORMAL. Paint equipment shed: priority=LOW."
    },
    invoice_status: {
      what: "Payment lifecycle: DRAFT → SENT → PARTIALLY_PAID → PAID → OVERDUE → VOID.",
      where: "Stored on invoices.status. Drives AR aging reports and payment workflows.",
      why: "ACCOUNTS RECEIVABLE TRACKING. Know what's been sent, what's due, what's overdue. OVERDUE status may trigger reminder emails. VOID cancels an invoice while preserving history.",
      dataFlow: "Invoice created (DRAFT) → Finalized and emailed (SENT) → Partial payment (PARTIALLY_PAID) → Full payment (PAID). If past due_date while SENT/PARTIALLY_PAID, becomes OVERDUE. Canceled = VOID.",
      example: "INV-2025-0015: DRAFT → SENT March 1 → due March 31 → no payment by April 1 → OVERDUE. Client pays → PAID."
    },
    payment_method: {
      what: "How money was received: CHECK, ACH, CREDIT_CARD, CASH, WIRE, OTHER.",
      where: "Stored on payments.payment_method. Used for bank reconciliation and payment reporting.",
      why: "CASH FLOW TRACKING. Know how clients pay. Checks need check_number for bank matching. ACH/card have transaction_id from processor. Different methods may have different processing times.",
      dataFlow: "Payment received → Method recorded → Check: store check_number, check_date, bank_name → Card/ACH: store transaction_id, last_four → Reconciliation matches to bank statement.",
      example: "Payment received: CHECK method, check_number='4521', bank_name='First National', amount=$2,450."
    },
    photo_context: {
      what: "What entity a photo is attached to: TREE, LOCATION, WORK_ORDER, NURSERY_BATCH, CLIENT, INVENTORY_ITEM.",
      where: "Stored on photos.context_type with context_id pointing to the record UUID.",
      why: "POLYMORPHIC ATTACHMENTS. One photos table serves all entity types. Context determines how to join back to the source record. Avoids separate tree_photos, work_order_photos, etc. tables.",
      dataFlow: "Photo uploaded → context_type set (e.g., 'TREE') → context_id set (e.g., tree UUID) → Query 'photos WHERE context_type=TREE AND context_id=X' gets all tree photos.",
      example: "Photo of fire blight: context_type=TREE, context_id=A-HON-0042's UUID. Photo of work completion: context_type=WORK_ORDER, context_id=WO-2025-0044's UUID."
    },
    inventory_category: {
      what: "Types of inventory: CHEMICAL, FERTILIZER, TOOL, EQUIPMENT, SUPPLY, OTHER.",
      where: "Stored on inventory_items.category. Used for filtering and category-level reports.",
      why: "INVENTORY ORGANIZATION. Different categories have different handling—chemicals may require safety tracking, equipment needs maintenance schedules. Enables 'total value of chemicals on hand' reports.",
      dataFlow: "Item created with category → UI groups by category → Reports aggregate by category → Equipment category items show maintenance fields.",
      example: "Captan 80WDG: category=CHEMICAL. Pruning shears: category=TOOL. Tractor: category=EQUIPMENT."
    },
    stock_status: {
      what: "Inventory levels: IN_STOCK, LOW_STOCK, OUT_OF_STOCK. Auto-calculated by trigger.",
      where: "Stored on inventory_items.stock_status. Updated automatically when quantity changes.",
      why: "INVENTORY VISIBILITY. Dashboard can show 'items needing reorder' by filtering LOW_STOCK. Trigger logic: qty <= 0 = OUT_OF_STOCK, qty <= min_stock_level = LOW_STOCK, else IN_STOCK.",
      dataFlow: "Transaction changes quantity → Trigger evaluates quantity vs min_stock_level → stock_status updated → LOW_STOCK items appear in alerts → Reorder placed → Purchase transaction → IN_STOCK.",
      example: "Captan at 45 lbs (min=20): IN_STOCK. Usage drops to 18 lbs: LOW_STOCK alert. Used to 0: OUT_OF_STOCK."
    },
    inventory_transaction_type: {
      what: "Kinds of inventory movement: PURCHASE, USAGE, ADJUSTMENT, TRANSFER, DISPOSAL.",
      where: "Stored on inventory_transactions.transaction_type. Determines how to interpret quantity_change.",
      why: "COMPLETE AUDIT TRAIL. Know why inventory changed. PURCHASE adds from vendor. USAGE removes for work order. ADJUSTMENT corrects errors. TRANSFER moves between locations. DISPOSAL removes expired/damaged.",
      dataFlow: "Each inventory change creates transaction with type → PURCHASE: positive qty_change → USAGE: negative, linked to work_order_id → ADJUSTMENT: can be +/- with notes → TRANSFER: from/to locations.",
      example: "Received 50 lbs Captan: PURCHASE type, qty_change=+50. Used 2 lbs on WO-2025-0044: USAGE type, qty_change=-2, work_order_id=WO-2025-0044."
    },
    notification_type: {
      what: "What event triggered the notification: WORK_ORDER_CREATED, WORK_ORDER_APPROVED, LOW_STOCK_ALERT, etc.",
      where: "Stored on notifications.notification_type. Determines notification content and routing.",
      why: "ACTIONABLE NOTIFICATIONS. Different types go to different people. WORK_ORDER_ASSIGNED goes to the assigned worker. LOW_STOCK_ALERT goes to inventory manager. Type determines message template.",
      dataFlow: "Event occurs → Notification type determined → Recipients determined by type → Message generated from template → Delivered via user's notification_preferences.",
      example: "Work order assigned: notification_type=WORK_ORDER_ASSIGNED, recipient=assigned_to user, message='You have been assigned to WO-2025-0044.'"
    },
    notification_priority: {
      what: "Urgency of notification: LOW, NORMAL, HIGH, URGENT. Affects delivery speed and display.",
      where: "Stored on notifications.priority. May affect email subject, push notification sound, display prominence.",
      why: "ATTENTION MANAGEMENT. URGENT notifications (tree disease outbreak) need immediate attention. LOW priority (weekly summary) can wait. Users can filter by priority.",
      dataFlow: "Notification created with priority → URGENT/HIGH may send immediately → NORMAL batched hourly → LOW batched daily → UI sorts by priority → Badges may show HIGH+ count.",
      example: "Fire blight alert: priority=HIGH, immediate email. Weekly report available: priority=LOW, batched with other low-priority items."
    },
    notification_delivery: {
      what: "How to deliver: IN_APP (notification center), EMAIL, BOTH.",
      where: "Stored on notifications.delivery_method. Also can be overridden by user preferences.",
      why: "USER CONTROL OVER INTERRUPTIONS. Some users want email for everything. Others only check the app. BOTH ensures critical notifications aren't missed.",
      dataFlow: "Notification created with delivery_method → IN_APP: appears in notification center → EMAIL: sent via email service → BOTH: both methods → User preferences may override.",
      example: "Work order assignment: delivery_method=BOTH (important to know). System maintenance notice: delivery_method=IN_APP (less urgent)."
    },

    // -------------------------------------------------------------------------
    // VIEWS (15)
    // -------------------------------------------------------------------------
    v_nursery_batch_summary: {
      what: "Combines nursery_batches with variety names, client names, and tree counts (successful, reserved, sold quantities).",
      where: "Used in: Nursery dashboard, batch list reports, production planning screens.",
      why: "DENORMALIZED FOR DISPLAY. Joining batches → varieties → clients every time is expensive. This view pre-joins common lookups and computes tree counts from the trees table.",
      dataFlow: "Query v_nursery_batch_summary → Joins nursery_batches + varieties + clients → Aggregates trees by source_batch_id → Returns batch info with computed successful_quantity, reserved_quantity, sold_quantity.",
      example: "Batch NB-2025-023: scion_name='Honeycrisp', rootstock_name='G.41', client_name='Smith Farms', successful_quantity=170, reserved_quantity=100, sold_quantity=0."
    },
    v_location_tree_counts: {
      what: "Tree counts per location with health breakdown (healthy, attention, diseased, dead, removed) and health_score percentage.",
      where: "Used in: Location dashboard, orchard health overview, client portfolio summary.",
      why: "HEALTH DASHBOARD. Instead of counting trees each time, this view provides instant health breakdown per location. health_score = healthy / (total - dead - removed) × 100.",
      dataFlow: "Query v_location_tree_counts → Joins locations + clients + trees → Groups by location → Counts trees by health_status → Computes health_score percentage.",
      example: "Smith North Orchard: total_trees=2500, healthy_count=2450, attention_count=32, diseased_count=8, dead_count=5, removed_count=5, health_score=97.2%."
    },
    v_inventory_low_stock: {
      what: "Inventory items where quantity <= min_stock_level, with storage location name and total_value calculation.",
      where: "Used in: Reorder alerts, inventory dashboard low stock section, purchasing workflow.",
      why: "REORDER ALERT VIEW. Quick answer to 'what needs to be reordered?' without scanning all inventory. Pre-filters to only LOW_STOCK and OUT_OF_STOCK items.",
      dataFlow: "Query v_inventory_low_stock → Filters inventory_items WHERE quantity <= min_stock_level → Joins storage location → Computes total_value = quantity × cost_per_unit.",
      example: "Captan 80WDG: quantity=18, min_stock_level=20, storage_location_name='Main Warehouse', total_value=$1,530 (18 × $85)."
    },
    v_inventory_summary: {
      what: "Aggregate inventory by category: item counts, total quantities, total values (cost and sale), stock status counts.",
      where: "Used in: Inventory dashboard summary cards, category-level reports, financial overview.",
      why: "CATEGORY ROLLUP. Instead of listing every item, summarize 'CHEMICAL: 45 items, $12,000 value, 3 low stock.' Enables dashboard KPIs.",
      dataFlow: "Query v_inventory_summary → Groups inventory_items by category → Counts items → Sums quantities and values → Counts by stock_status.",
      example: "CHEMICAL category: item_count=45, total_quantity=850, total_cost_value=$12,450, total_sale_value=$16,200, low_stock_count=3, out_of_stock_count=1."
    },
    v_work_order_metrics: {
      what: "Work order statistics by week: created, completed, in_progress, overdue counts plus labor_cost and billable totals.",
      where: "Used in: Operations dashboard, weekly performance reports, manager KPIs.",
      why: "WEEKLY PULSE. How many work orders created vs completed this week? Any overdue? What's the labor spend? Enables performance tracking without complex queries.",
      dataFlow: "Query v_work_order_metrics → Groups work_orders by DATE_TRUNC('week', created_at) → Counts by status → Sums actual_labor_cost and actual_billable.",
      example: "Week of March 3: total_created=12, completed=8, in_progress=3, overdue=1, total_labor_cost=$2,450, total_billable=$4,200."
    },
    v_monthly_labor_costs: {
      what: "Labor analysis by month and client: hours worked, labor cost (what Adam pays), billable (what client pays), gross margin.",
      where: "Used in: Profitability reports, client profitability analysis, monthly financial review.",
      why: "PROFITABILITY BY CLIENT. Which clients generate the most margin? Time entries × rates, rolled up by month and client. gross_margin = billable - labor_cost.",
      dataFlow: "Query v_monthly_labor_costs → Joins time_entries + work_orders + clients → Groups by month and client → Sums hours, labor_cost, billable → Computes gross_margin.",
      example: "March 2025 - Smith Farms: total_hours=45.5, total_labor_cost=$819, total_billable=$1,592.50, gross_margin=$773.50, work_order_count=6."
    },
    v_nursery_order_summary: {
      what: "Nursery orders with client info and line item aggregates: total trees ordered/produced/delivered.",
      where: "Used in: Nursery order list, sales dashboard, production planning.",
      why: "ORDER STATUS AT A GLANCE. Without joining order_items each time, see order totals. Helps answer 'how many trees has Smith ordered total?'",
      dataFlow: "Query v_nursery_order_summary → Joins nursery_orders + clients + nursery_order_items → Aggregates quantities per order.",
      example: "NO-2025-007: client_name='Smith Farms', line_item_count=2, total_trees_ordered=500, total_trees_produced=170, total_trees_delivered=0."
    },
    v_payroll_weekly: {
      what: "Weekly payroll calculation per employee: hours (regular/overtime), gross pay, estimated taxes (federal, state, FICA), net pay.",
      where: "Used in: Payroll processing, employee earnings reports, labor cost budgeting.",
      why: "PAYROLL PREVIEW. Before running actual payroll, see estimated amounts. Overtime at 1.5× after 40 hours. Missouri 4.7% state tax. Federal tax by bracket. FICA 7.65%.",
      dataFlow: "Query v_payroll_weekly → Joins users + time_entries → Groups by user and week → Computes regular/overtime hours → Applies rates and tax estimates.",
      example: "John, week of March 3: total_hours=42, regular_hours=40, overtime_hours=2, gross_pay=$774, federal_tax_estimate=$77, missouri_tax_estimate=$36, net_pay_estimate=$611."
    },
    v_payroll_biweekly: {
      what: "Same as weekly but aggregated to 2-week pay periods. 80 hours regular before overtime.",
      where: "Used in: Biweekly payroll processing (if that's the pay schedule), period reports.",
      why: "BIWEEKLY PAY PERIODS. Some businesses pay biweekly. Overtime threshold is 80 hours instead of 40. Same tax calculations.",
      dataFlow: "Similar to weekly but groups by 2-week period and uses 80-hour overtime threshold.",
      example: "John, 2-week period March 3-16: total_hours=82, regular_hours=80, overtime_hours=2, gross_pay=$1,494."
    },
    v_payroll_daily_detail: {
      what: "Daily time breakdown per employee: hours worked, breaks, pay, first/last clock times, jobs worked.",
      where: "Used in: Timesheet review, daily labor reports, attendance tracking.",
      why: "DAILY DETAIL. Before approving timesheets, managers can review daily breakdown. See clock in/out times, break time, and which work orders each day.",
      dataFlow: "Query v_payroll_daily_detail → Joins users + time_entries + work_orders → Groups by user and date → Aggregates hours, computes daily pay.",
      example: "John, March 5: hours_worked=8.5, break_hours=0.5, daily_pay=$144, first_clock_in=07:30, last_clock_out=16:30, jobs_worked='Dormant Pruning, Spray Application'."
    },
    v_nursery_pipeline: {
      what: "Nursery order fulfillment pipeline: ordered vs produced vs delivered quantities, linked batch status, tree stage breakdown.",
      where: "Used in: Nursery production planning, delivery scheduling, pipeline reports.",
      why: "PIPELINE VISIBILITY. For each order line item, see how many trees are at each stage: in_nursery, reserved, ready_to_ship, delivered_planted. Identifies bottlenecks.",
      dataFlow: "Query v_nursery_pipeline → Joins nursery_orders + order_items + batches + trees → Counts trees by stage per order item.",
      example: "NO-2025-007 Item 1 (300 Honeycrisp): quantity_ordered=300, in_nursery=170, reserved=0, ready_to_ship=0, delivered_planted=0, pending_delivery=300."
    },
    v_tree_health_history: {
      what: "All health observations for trees with variety info, location, observer name, status change flag.",
      where: "Used in: Tree detail health tab, health trend analysis, inspection history reports.",
      why: "LONGITUDINAL HEALTH VIEW. See every inspection for a tree (or across trees) with full context. status_changed flag highlights when health deteriorated or improved.",
      dataFlow: "Query v_tree_health_history → Joins tree_health_records + trees + locations + varieties + users → Adds status_changed flag where previous_status != health_status.",
      example: "A-HON-0042 history: March 1 HEALTHY (John), March 5 DISEASED (John, status_changed=TRUE), March 19 ATTENTION (Sarah)."
    },
    v_trees_requiring_followup: {
      what: "Trees with pending follow-up from health inspections, with urgency ranking (OVERDUE, TODAY, THIS_WEEK, UPCOMING).",
      where: "Used in: Follow-up task list, inspection scheduling, manager dashboard.",
      why: "FOLLOW-UP MANAGEMENT. After recording 'needs follow-up in 14 days,' this view surfaces trees approaching or past their follow-up date. Prevents things falling through cracks.",
      dataFlow: "Query v_trees_requiring_followup → Filters tree_health_records WHERE follow_up_required=TRUE → Computes urgency based on follow_up_date vs today → Sorts by urgency.",
      example: "A-HON-0042: follow_up_date=March 19, urgency=THIS_WEEK. B-ENT-0015: follow_up_date=March 1, urgency=OVERDUE."
    },
    v_open_health_alerts: {
      what: "Alerts with status=OPEN, enriched with tree info, location, client, triggering rule, and hours_open.",
      where: "Used in: Alert dashboard, manager inbox, priority queue.",
      why: "ALERT TRIAGE. What needs attention right now? Sorted by priority and age. Shows trigger_data (old_status → new_status) for context. Links to tree and location for navigation.",
      dataFlow: "Query v_open_health_alerts → Filters tree_health_alerts WHERE status='OPEN' → Joins tree, location, client, rule → Computes hours_open → Sorts by priority then age.",
      example: "Alert: tree=A-HON-0042, location='Smith North Orchard', priority=HIGH, title='Fire blight detected', hours_open=12.5."
    },
    v_health_trends_weekly: {
      what: "Weekly health metrics by location: trees inspected, status breakdown, status changes, average ratings.",
      where: "Used in: Health trend charts, location comparison, seasonal analysis.",
      why: "TREND ANALYSIS. Is orchard health improving or declining? Week-over-week status changes, average vigor/leaf condition ratings show trajectory.",
      dataFlow: "Query v_health_trends_weekly → Groups tree_health_records by week and location → Counts statuses and changes → Averages ratings.",
      example: "Smith North Orchard, week of March 3: trees_inspected=125, healthy_observations=118, status_changes=3, declined_from_healthy=2, avg_vigor=4.2."
    },

    // -------------------------------------------------------------------------
    // FUNCTIONS (9)
    // -------------------------------------------------------------------------
    update_updated_at: {
      what: "Trigger function that automatically sets updated_at = NOW() before any UPDATE operation.",
      where: "Called by: trg_*_updated_at triggers on all major tables with updated_at columns.",
      why: "AUTOMATIC TIMESTAMPS. Instead of requiring application code to remember setting updated_at, the database handles it. Ensures consistency across all update paths.",
      dataFlow: "UPDATE statement issued → BEFORE UPDATE trigger fires → update_updated_at() sets NEW.updated_at = NOW() → Update proceeds with current timestamp.",
      example: "UPDATE clients SET name='Smith Holdings' → trigger fires → updated_at automatically set to '2025-03-05 14:32:00-05' → record saved."
    },
    calculate_time_entry: {
      what: "Trigger function that computes duration_minutes, labor_cost, and billable_amount from time entry data.",
      where: "Called by: trg_time_entries_calculate on time_entries INSERT/UPDATE.",
      why: "AUTOMATIC PAYROLL CALCULATIONS. When worker clocks out, duration = end - start - breaks. Costs computed from user's rates. Ensures accurate labor tracking without manual calculation.",
      dataFlow: "Time entry saved with start/end → Trigger calculates duration_minutes → Multiplies by hourly_rate → labor_cost = duration × hourly_rate → billable_amount = duration × billable_rate.",
      example: "Clock out: start=08:00, end=16:30, break=30min → duration=450min (7.5hr) → labor_cost=7.5×$18=$135 → billable=7.5×$35=$262.50."
    },
    update_inventory_stock_status: {
      what: "Trigger function that auto-updates stock_status based on quantity vs min_stock_level.",
      where: "Called by: trg_inventory_stock_status on inventory_items INSERT/UPDATE.",
      why: "AUTOMATIC STOCK ALERTS. Stock status computed, not manually tracked. When quantity drops below threshold, status changes automatically, enabling low-stock reports.",
      dataFlow: "Inventory quantity changes → Trigger evaluates: qty <= 0 → OUT_OF_STOCK, qty <= min_stock_level → LOW_STOCK, else IN_STOCK → stock_status updated.",
      example: "Usage reduces quantity from 25 to 18 (min=20) → trigger fires → stock_status changes from IN_STOCK to LOW_STOCK."
    },
    update_invoice_balance: {
      what: "Trigger function that computes balance_due = total_amount - paid_amount on invoice changes.",
      where: "Called by: trg_invoice_balance on invoices INSERT/UPDATE.",
      why: "AUTOMATIC AR TRACKING. Balance always accurate without manual recalculation. When payments applied, balance updates automatically.",
      dataFlow: "Invoice created or paid_amount updated → Trigger computes balance_due = total_amount - paid_amount → Balance reflects current AR.",
      example: "Invoice total=$2,450, payment applied for $1,000 → paid_amount=$1,000 → balance_due automatically = $1,450."
    },
    set_invoice_due_date: {
      what: "Trigger function that auto-sets due_date based on client's payment_terms when invoice created.",
      where: "Called by: trg_invoice_due_date on invoices INSERT (only if due_date not provided).",
      why: "CLIENT-SPECIFIC TERMS. Each client may have different payment terms. When invoice created, due_date = invoice_date + client.payment_terms days.",
      dataFlow: "Invoice created without due_date → Trigger looks up client.payment_terms → Computes due_date = invoice_date + terms → Sets due_date.",
      example: "Invoice for Smith Farms (30-day terms) dated March 1 → due_date auto-set to March 31."
    },
    sync_tree_health_from_record: {
      what: "Trigger function that updates tree.health_status when a health record is created, capturing previous_status.",
      where: "Called by: trg_tree_health_sync BEFORE INSERT on tree_health_records.",
      why: "AUTOMATIC HEALTH SYNC. When inspector records observation, tree's status updates automatically. Previous status captured for change tracking.",
      dataFlow: "Health record inserted → Trigger captures tree's current status into record.previous_status → Updates tree.health_status to new value → Updates last_inspection_date.",
      example: "Record DISEASED for A-HON-0042 (currently HEALTHY) → record.previous_status=HEALTHY → tree.health_status changed to DISEASED."
    },
    check_health_alert_rules: {
      what: "Trigger function that evaluates alert rules after health record insert, creating alerts when conditions match.",
      where: "Called by: trg_tree_health_check_alerts AFTER INSERT on tree_health_records.",
      why: "AUTOMATIC ALERTING. When health changes, system checks all active rules. Matching rules create alerts for appropriate personnel. Cooldown prevents spam.",
      dataFlow: "Health record inserted → Trigger loops through active alert rules → Checks trigger conditions (status change match) → Checks cooldown → Creates tree_health_alert if triggered.",
      example: "Tree changes to DISEASED → Rule 'Alert on disease' matches → Checks cooldown (no recent alert) → Creates HIGH priority alert for MANAGER role."
    },
    generate_tree_number: {
      what: "Standalone function that creates unique tree numbers in format: SpeciesCode-VarietyCode-Sequence (e.g., A-HON-0001).",
      where: "Called by: Application code when creating new trees.",
      why: "UNIQUE TREE IDENTIFICATION. Format is human-readable and sortable. Sequence never resets, ensuring uniqueness even after deletions. Pad to 4 digits until 9999.",
      dataFlow: "Call generate_tree_number('A', 'HON') → Function finds max sequence for 'A-HON-' prefix → Increments → Returns 'A-HON-0042'.",
      example: "Creating Honeycrisp tree: generate_tree_number('A', 'HON') → Last tree was A-HON-0041 → Returns 'A-HON-0042'."
    },
    generate_document_number: {
      what: "Standalone function that creates document numbers in format: PREFIX-YEAR-Sequence (e.g., WO-2025-0001).",
      where: "Called by: Application code when creating work orders, invoices, nursery orders.",
      why: "SEQUENTIAL DOCUMENT NUMBERS. Each document type has its own sequence. Year included for easy filtering. Format: WO-2025-0001, INV-2025-0001, NO-2025-0001.",
      dataFlow: "Call generate_document_number('WO', 'work_order_number_seq') → Gets next sequence value → Combines with year → Returns 'WO-2025-0042'.",
      example: "Creating work order: generate_document_number('WO', 'work_order_number_seq') → Returns 'WO-2025-0042'."
    },

    // -------------------------------------------------------------------------
    // TRIGGERS (23) - Grouped by purpose
    // -------------------------------------------------------------------------
    // Updated_at triggers (14)
    trg_clients_updated_at: {
      what: "BEFORE UPDATE trigger that auto-sets clients.updated_at to current timestamp.",
      where: "Fires on: Any UPDATE to clients table.",
      why: "AUDIT TRAIL. Know when record was last modified without requiring application to set it. Consistent across all update paths (API, direct SQL, etc.).",
      dataFlow: "UPDATE clients → Trigger fires → update_updated_at() sets NEW.updated_at = NOW() → Record saved with current timestamp.",
      example: "Changing client name from 'Smith Farms' to 'Smith Holdings' → updated_at automatically set to now."
    },
    trg_users_updated_at: {
      what: "BEFORE UPDATE trigger that auto-sets users.updated_at to current timestamp.",
      where: "Fires on: Any UPDATE to users table.",
      why: "Same as clients—automatic timestamp tracking for user record modifications.",
      dataFlow: "UPDATE users (role change, rate change, etc.) → updated_at auto-set.",
      example: "Changing user hourly_rate from $18 to $20 → updated_at automatically set to now."
    },
    trg_locations_updated_at: {
      what: "BEFORE UPDATE trigger on locations table.",
      where: "Fires on: Any UPDATE to locations.",
      why: "Track when location details (boundaries, acreage, etc.) were last changed.",
      dataFlow: "UPDATE locations → updated_at auto-set.",
      example: "Updating location boundary polygon → updated_at automatically set."
    },
    trg_varieties_updated_at: {
      what: "BEFORE UPDATE trigger on varieties table.",
      where: "Fires on: Any UPDATE to varieties.",
      why: "Track when variety characteristics (disease ratings, ripening info) were updated.",
      dataFlow: "UPDATE varieties → updated_at auto-set.",
      example: "Updating fire_blight_resistance rating → updated_at automatically set."
    },
    trg_trees_updated_at: {
      what: "BEFORE UPDATE trigger on trees table.",
      where: "Fires on: Any UPDATE to trees.",
      why: "Track when tree data (stage, health, location) was last modified.",
      dataFlow: "UPDATE trees → updated_at auto-set.",
      example: "Changing tree stage from NURSERY_FIELD to RESERVED → updated_at automatically set."
    },
    trg_work_orders_updated_at: {
      what: "BEFORE UPDATE trigger on work_orders table.",
      where: "Fires on: Any UPDATE to work_orders.",
      why: "Track status changes, schedule updates, completions. Important for workflow auditing.",
      dataFlow: "UPDATE work_orders (status change, assignment, etc.) → updated_at auto-set.",
      example: "Changing work order status from SCHEDULED to IN_PROGRESS → updated_at automatically set."
    },
    trg_invoices_updated_at: {
      what: "BEFORE UPDATE trigger on invoices table.",
      where: "Fires on: Any UPDATE to invoices.",
      why: "Track payment applications, status changes, amount adjustments.",
      dataFlow: "UPDATE invoices → updated_at auto-set.",
      example: "Payment applied, paid_amount increased → updated_at automatically set."
    },
    trg_inventory_items_updated_at: {
      what: "BEFORE UPDATE trigger on inventory_items table.",
      where: "Fires on: Any UPDATE to inventory_items.",
      why: "Track quantity changes, price updates, stock status changes.",
      dataFlow: "UPDATE inventory_items → updated_at auto-set.",
      example: "Adjusting min_stock_level → updated_at automatically set."
    },
    // Additional updated_at triggers follow same pattern...
    trg_fruit_species_updated_at: { what: "BEFORE UPDATE trigger on fruit_species table.", where: "Fires on: fruit_species UPDATE.", why: "Track species catalog changes.", dataFlow: "UPDATE fruit_species → updated_at auto-set.", example: "Correcting scientific_name → updated_at set." },
    trg_nursery_orders_updated_at: { what: "BEFORE UPDATE trigger on nursery_orders table.", where: "Fires on: nursery_orders UPDATE.", why: "Track order status progression and amount changes.", dataFlow: "UPDATE nursery_orders → updated_at auto-set.", example: "Changing status from QUOTE to CONFIRMED → updated_at set." },
    trg_nursery_batches_updated_at: { what: "BEFORE UPDATE trigger on nursery_batches table.", where: "Fires on: nursery_batches UPDATE.", why: "Track batch status progression and quantity updates.", dataFlow: "UPDATE nursery_batches → updated_at auto-set.", example: "Updating grafted_quantity after grafting → updated_at set." },
    trg_work_order_categories_updated_at: { what: "BEFORE UPDATE trigger on work_order_categories.", where: "Fires on: work_order_categories UPDATE.", why: "Track category configuration changes.", dataFlow: "UPDATE work_order_categories → updated_at auto-set.", example: "Changing category color → updated_at set." },
    trg_work_order_types_updated_at: { what: "BEFORE UPDATE trigger on work_order_types.", where: "Fires on: work_order_types UPDATE.", why: "Track work type configuration changes.", dataFlow: "UPDATE work_order_types → updated_at auto-set.", example: "Updating default_hourly_rate → updated_at set." },
    trg_time_entries_updated_at: { what: "BEFORE UPDATE trigger on time_entries.", where: "Fires on: time_entries UPDATE.", why: "Track timesheet corrections.", dataFlow: "UPDATE time_entries → updated_at auto-set.", example: "Adjusting end_time after correction → updated_at set." },
    trg_payments_updated_at: { what: "BEFORE UPDATE trigger on payments.", where: "Fires on: payments UPDATE.", why: "Track payment record changes (rare, usually immutable).", dataFlow: "UPDATE payments → updated_at auto-set.", example: "Correcting payment amount → updated_at set." },
    trg_tree_health_records_updated_at: { what: "BEFORE UPDATE trigger on tree_health_records.", where: "Fires on: tree_health_records UPDATE.", why: "Track inspection corrections.", dataFlow: "UPDATE tree_health_records → updated_at auto-set.", example: "Adding treatment notes → updated_at set." },
    trg_tree_health_alert_rules_updated_at: { what: "BEFORE UPDATE trigger on tree_health_alert_rules.", where: "Fires on: alert_rules UPDATE.", why: "Track rule configuration changes.", dataFlow: "UPDATE tree_health_alert_rules → updated_at auto-set.", example: "Changing rule priority → updated_at set." },

    // Calculation triggers
    trg_time_entries_calculate: {
      what: "BEFORE INSERT OR UPDATE trigger that computes duration, labor_cost, billable_amount from time entry data.",
      where: "Fires on: time_entries INSERT or UPDATE.",
      why: "AUTOMATIC CALCULATIONS. Ensures duration and costs are always computed correctly, even if end_time is updated.",
      dataFlow: "Time entry saved → calculate_time_entry() computes duration_minutes = (end - start - breaks) → labor_cost = duration × hourly_rate → billable_amount = duration × billable_rate.",
      example: "Clock out with end_time=16:30 → duration calculated → costs computed from rates → all fields populated."
    },
    trg_inventory_stock_status: {
      what: "BEFORE INSERT OR UPDATE trigger that auto-updates stock_status based on quantity vs min_stock_level.",
      where: "Fires on: inventory_items INSERT or UPDATE.",
      why: "AUTOMATIC STATUS. Stock status always accurate without manual tracking. Enables low-stock dashboards.",
      dataFlow: "Quantity changes → update_inventory_stock_status() evaluates thresholds → stock_status set.",
      example: "Quantity drops below min_stock_level → status changes to LOW_STOCK → appears in reorder alerts."
    },
    trg_invoice_balance: {
      what: "BEFORE INSERT OR UPDATE trigger that computes balance_due = total_amount - paid_amount.",
      where: "Fires on: invoices INSERT or UPDATE.",
      why: "AUTOMATIC AR. Balance always correct without manual calculation. Payment application updates balance.",
      dataFlow: "Invoice saved → update_invoice_balance() computes balance_due → AR reports accurate.",
      example: "Payment applied → paid_amount increases → balance_due decreases automatically."
    },
    trg_invoice_due_date: {
      what: "BEFORE INSERT trigger that auto-sets due_date from client.payment_terms if not provided.",
      where: "Fires on: invoices INSERT (only if due_date is NULL).",
      why: "CLIENT-SPECIFIC TERMS. Don't require remembering each client's terms when creating invoices.",
      dataFlow: "Invoice created without due_date → set_invoice_due_date() looks up client.payment_terms → due_date = invoice_date + terms.",
      example: "Invoice for 30-day client created March 1 → due_date auto-set to March 31."
    },
    trg_tree_health_sync: {
      what: "BEFORE INSERT trigger that syncs tree.health_status from new health record and captures previous_status.",
      where: "Fires on: tree_health_records INSERT.",
      why: "AUTOMATIC HEALTH UPDATE. When inspection recorded, tree's status updates without separate API call. Previous captured for trending.",
      dataFlow: "Health record inserted → sync_tree_health_from_record() gets current tree status → Sets record.previous_status → Updates tree.health_status and last_inspection_date.",
      example: "Record DISEASED status → tree.previous_status=HEALTHY captured → tree.health_status changed to DISEASED."
    },
    trg_tree_health_check_alerts: {
      what: "AFTER INSERT trigger that evaluates alert rules and creates alerts when conditions match.",
      where: "Fires on: tree_health_records INSERT (after the record is committed).",
      why: "PROACTIVE ALERTING. Health change automatically triggers appropriate alerts based on configurable rules.",
      dataFlow: "Health record committed → check_health_alert_rules() loops through rules → Evaluates status_change triggers → Creates tree_health_alert if matched → Respects cooldown.",
      example: "Tree goes DISEASED → Rule 'Alert on disease' matches → No recent alert (cooldown OK) → HIGH priority alert created."
    }
  };

  // ==========================================================================
  // FK RELATIONSHIP EXPLANATIONS - Business-first "Why These Links Exist"
  // ==========================================================================
  const FK_WHY_DETAILED = {
    // -------------------------------------------------------------------------
    // Core relationships - These explain WHY FKs exist in business terms
    // -------------------------------------------------------------------------
    "client_id": {
      general: "Links to the client who owns this record. Clients are the SOURCE OF TRUTH for business relationships.",
      billing: "Enables billing—all charges roll up to the client for invoicing.",
      permissions: "Controls data access—users can only see records for their client.",
      reporting: "Allows 'show all work for Smith Farms' queries.",
      integrity: "Prevents orphaned records—can't create a location without a valid client.",
      example: "Work order WO-2025-0042 has client_id pointing to Smith Farms. Invoice generated from this work order automatically goes to Smith Farms."
    },
    "location_id": {
      general: "Links to the physical property where this happens. Everything has a 'where.'",
      geographic: "Enables map display—show all trees at this location on the orchard map.",
      scheduling: "Helps route crews—'all work at North Orchard' for scheduling.",
      context: "Provides context—knowing WHERE helps understand scope and logistics.",
      example: "Trees have location_id so you can say 'show all trees at Smith North Orchard' and see them on the map."
    },
    "user_id": {
      general: "Tracks who performed this action. Users are ACTORS, not owners.",
      audit: "Enables audit trail—know who made every change.",
      accountability: "Personal responsibility—workers see their time entries, managers see their approvals.",
      payroll: "For time entries, user_id determines pay rate and enables payroll calculation.",
      example: "Time entry has user_id=John. His hourly_rate ($18) is used to calculate labor_cost."
    },
    "scion_variety_id": {
      general: "Links to the fruiting variety grafted onto the tree. Determines what fruit you get.",
      production: "Harvest planning—ripening_window tells when to pick.",
      quality: "Disease management—resistance ratings guide spray decisions.",
      sales: "Inventory—'how many Honeycrisp trees available?' queries.",
      example: "Tree with scion_variety_id=Honeycrisp will produce Honeycrisp apples, ripening mid-September."
    },
    "rootstock_variety_id": {
      general: "Links to the rootstock variety. Determines tree size, vigor, and disease resistance.",
      management: "Planting decisions—dwarf rootstocks need support structures.",
      production: "Yield expectations—vigor affects when tree becomes productive.",
      durability: "Long-term health—fire blight resistant rootstocks survive better.",
      example: "Tree on G.41 rootstock will be dwarf (8-12ft), need support, but have excellent fire blight resistance."
    },
    "work_order_id": {
      general: "Links to the parent work order. Groups related activity.",
      billing: "Enables per-job billing—time entries roll up to work order for invoicing.",
      tracking: "Project management—see all time/materials for a work order.",
      completion: "Workflow—work order status based on associated entries.",
      example: "Time entries with work_order_id=WO-2025-0042 all belong to that pruning job. Total hours = sum of entries."
    },
    "invoice_id": {
      general: "Links payment or line item to its invoice. Groups charges for billing.",
      ar: "Accounts receivable—payments reduce invoice balance.",
      history: "Paper trail—see what charges made up each invoice.",
      example: "Payment with invoice_id=INV-2025-0015 applies to that invoice. Balance = total - sum(payments)."
    },
    "source_batch_id": {
      general: "Links tree to its propagation batch. Traceability from nursery to orchard.",
      quality: "Problem tracing—if batch had issues, find all affected trees.",
      inventory: "Production tracking—batch.successful_quantity = count of trees with this source_batch_id.",
      example: "Tree A-HON-0042 has source_batch_id=NB-2025-023. If that batch had disease, you can find all 170 trees from it."
    },
    "orchard_block_id": {
      general: "Places tree in a specific block within the orchard. Enables grid organization.",
      navigation: "Field work—crews know 'Block A, Row 5, Position 12' exactly.",
      management: "Block-level operations—spray this block, harvest that block.",
      example: "Tree with orchard_block_id='Northeast Block' is in that physical section. Map shows block boundaries."
    },
    "species_id": {
      general: "Links variety to its parent species. Organizes the variety catalog.",
      identification: "Tree numbering—species.code (A, P, H) appears in tree numbers.",
      management: "Species-level decisions—different spray programs for apples vs peaches.",
      example: "Variety 'Honeycrisp' has species_id=Apple. Tree numbers start with 'A-' for Apple."
    },
    "category_id": {
      general: "Groups work order types under categories. Navigation and reporting.",
      ui: "Dropdown organization—42 types grouped into 7 categories.",
      reporting: "Category-level reports—'all pest management work this month.'",
      example: "'Dormant Pruning' type has category_id='Cultural Practices'. UI shows it under that heading."
    },
    "nursery_order_id": {
      general: "Links batch or work order to the client order it fulfills.",
      fulfillment: "Production tracking—which orders are batches growing for?",
      planning: "Resource allocation—prioritize batches for confirmed orders.",
      example: "Batch NB-2025-023 has nursery_order_id=NO-2025-007. Growing specifically for Smith's order."
    },
    "tree_id": {
      general: "Links record to a specific tree. Individual tree tracking.",
      history: "Tree history—all health records for this tree over time.",
      precision: "Precision management—know exactly which tree has issues.",
      example: "Health record with tree_id=A-HON-0042 is specifically about that one tree."
    },
    "alert_rule_id": {
      general: "Links alert to the rule that created it. Traceability.",
      debugging: "Rule tuning—see which rules generate most alerts.",
      management: "Configuration—disable rule to stop certain alerts.",
      example: "Alert has alert_rule_id='Fire Blight Alert rule'. Can see rule's cooldown_hours, priority settings."
    }
  };

  // ==========================================================================
  // STATE
  // ==========================================================================
  const state = {
    view: "diagram",           // "diagram" | "docs" | "glossary"
    filter: "",                // sidebar search filter
    typeFilter: "all",         // type filter chip
    domainFilter: null,        // domain filter chip
    selected: null,            // currently selected object key
    hovered: null,             // currently hovered object key
    showEdges: "focus",        // "focus" | "all" | "off"
    isolateMode: false,        // true = dim non-adjacent nodes
    zoom: 1,
    pan: { x: 0, y: 0 }
  };

  // ==========================================================================
  // FK INDEX AUDIT - Find FKs missing indexes
  // ==========================================================================
  let fkIndexIssues = [];

  function auditFkIndexes() {
    fkIndexIssues = [];
    const tables = byType.get("table") || [];
    
    for (const tbl of tables) {
      if (!tbl.columns) continue;
      
      for (const col of tbl.columns) {
        if (!col.fk) continue;
        
        // Check if there's an index on this FK column
        const fkColName = col.name;
        const hasIndex = (tbl.indexes || []).some(idx => {
          const idxCols = idx.columns || [];
          // Index covers FK if FK column is first in index
          return idxCols.length > 0 && idxCols[0] === fkColName;
        });
        
        if (!hasIndex) {
          fkIndexIssues.push({
            table: tbl.name,
            column: col.name,
            referencedTable: col.fk.table,
            suggestion: `CREATE INDEX idx_${tbl.name}_${col.name} ON ${tbl.name}(${col.name});`
          });
        }
      }
    }
    
    return fkIndexIssues;
  }

  // Run audit on load
  auditFkIndexes();

  // ==========================================================================
  // DIAGRAM LAYOUT (simple grid, tables only)
  // ==========================================================================
  const NODE_W = 200;
  const NODE_PAD = 40;
  const COL_COUNT = 6;
  const ROW_HEIGHT = 160;

  const tables = objects.filter(o => o.type === "table");
  const nodePos = new Map();

  // Grid positions
  tables.forEach((t, i) => {
    const col = i % COL_COUNT;
    const row = Math.floor(i / COL_COUNT);
    nodePos.set(t.key, {
      x: col * (NODE_W + NODE_PAD) + 50,
      y: row * ROW_HEIGHT + 50
    });
  });

  // Build edge list from foreign keys
  const edges = [];
  for (const t of tables) {
    if (!t.columns) continue;
    for (const c of t.columns) {
      if (c.fk) {
        const target = objects.find(o => o.type === "table" && o.name === c.fk.table);
        if (target) {
          edges.push({ from: t.key, to: target.key, label: c.name });
        }
      }
    }
  }

  // ==========================================================================
  // SIDEBAR
  // ==========================================================================
  function renderSidebar() {
    // Update counts
    const tbls = byType.get("table") || [];
    const enums = byType.get("enum") || [];
    const views = byType.get("view") || [];
    const functions = byType.get("function") || [];
    const triggers = byType.get("trigger") || [];
    
    let indexCount = 0;
    tbls.forEach(t => { if (t.indexes) indexCount += t.indexes.length; });

    const countTables = $("#countTables");
    const countEnums = $("#countEnums");
    const countViews = $("#countViews");
    const countFunctions = $("#countFunctions");
    const countTriggers = $("#countTriggers");
    const countIndexes = $("#countIndexes");

    if (countTables) countTables.textContent = tbls.length;
    if (countEnums) countEnums.textContent = enums.length;
    if (countViews) countViews.textContent = views.length;
    if (countFunctions) countFunctions.textContent = functions.length;
    if (countTriggers) countTriggers.textContent = triggers.length;
    if (countIndexes) countIndexes.textContent = indexCount;

    // Build domain chips
    const domainChips = $("#domainChips");
    if (domainChips) {
      domainChips.innerHTML = "";
      const domains = new Set();
      objects.forEach(o => { if (o.domain) domains.add(o.domain); });
      Array.from(domains).sort().forEach(domain => {
        const chip = document.createElement("button");
        chip.className = "chip" + (state.domainFilter === domain ? " active" : "");
        chip.textContent = domain;
        chip.addEventListener("click", () => {
          state.domainFilter = state.domainFilter === domain ? null : domain;
          renderSidebar();
        });
        domainChips.appendChild(chip);
      });
    }

    // Populate object list
    const objectList = $("#objectList");
    if (!objectList) return;
    objectList.innerHTML = "";

    // Apply filters
    let filtered = objects;
    if (state.typeFilter && state.typeFilter !== "all") {
      filtered = filtered.filter(o => o.type === state.typeFilter);
    }
    if (state.domainFilter) {
      filtered = filtered.filter(o => o.domain === state.domainFilter);
    }
    if (state.filter) {
      filtered = filtered.filter(o => o.name.toLowerCase().includes(state.filter));
    }

    const groups = ["table", "enum", "view", "function", "trigger"];
    const labels = { table: "Tables", view: "Views", function: "Functions", trigger: "Triggers", enum: "Enums" };

    for (const g of groups) {
      const items = filtered.filter(o => o.type === g);
      if (!items.length) continue;

      const header = document.createElement("div");
      header.className = "list-header";
      header.textContent = `${labels[g]} (${items.length})`;
      objectList.appendChild(header);

      for (const o of items) {
        const item = document.createElement("div");
        item.className = "list-item" + (state.selected === o.key ? " selected" : "");
        item.textContent = o.name;
        item.dataset.key = o.key;
        item.addEventListener("click", () => selectObject(o.key));
        objectList.appendChild(item);
      }
    }
  }

  // ==========================================================================
  // DIAGRAM SVG
  // ==========================================================================
  function renderDiagram() {
    const svg = $("#schemaSvg");
    const viewport = $("#viewport");
    if (!svg || !viewport) return;

    // Clear viewport
    viewport.innerHTML = "";

    // Edges
    for (const e of edges) {
      const p1 = nodePos.get(e.from);
      const p2 = nodePos.get(e.to);
      if (!p1 || !p2) continue;

      const line = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const x1 = p1.x + NODE_W / 2;
      const y1 = p1.y + 40;
      const x2 = p2.x + NODE_W / 2;
      const y2 = p2.y + 40;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2 - 30;
      line.setAttribute("d", `M${x1},${y1} Q${mx},${my} ${x2},${y2}`);
      line.setAttribute("class", "edge-line");
      line.setAttribute("marker-end", "url(#arrow)");
      line.dataset.from = e.from;
      line.dataset.to = e.to;
      viewport.appendChild(line);
    }

    // Nodes (tables only)
    for (const t of tables) {
      const pos = nodePos.get(t.key);
      if (!pos) continue;
      
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("transform", `translate(${pos.x}, ${pos.y})`);
      group.setAttribute("class", "diagram-node");
      group.dataset.key = t.key;

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("width", NODE_W);
      rect.setAttribute("height", 80);
      rect.setAttribute("rx", 6);
      rect.setAttribute("class", "node-rect" + (state.selected === t.key ? " selected" : ""));

      const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
      title.setAttribute("x", 10);
      title.setAttribute("y", 24);
      title.setAttribute("class", "node-title");
      title.textContent = t.name;

      const subtitle = document.createElementNS("http://www.w3.org/2000/svg", "text");
      subtitle.setAttribute("x", 10);
      subtitle.setAttribute("y", 44);
      subtitle.setAttribute("class", "node-subtitle");
      subtitle.textContent = `${(t.columns || []).length} columns`;

      // FK index warning indicator
      const hasWarning = fkIndexIssues.some(i => i.table === t.name);
      if (hasWarning) {
        const warn = document.createElementNS("http://www.w3.org/2000/svg", "text");
        warn.setAttribute("x", NODE_W - 24);
        warn.setAttribute("y", 24);
        warn.setAttribute("class", "node-warning");
        warn.textContent = "⚠";
        warn.setAttribute("title", "Missing FK index");
        group.appendChild(warn);
      }

      group.appendChild(rect);
      group.appendChild(title);
      group.appendChild(subtitle);

      group.addEventListener("click", () => selectObject(t.key));
      group.addEventListener("mouseenter", () => hoverObject(t.key));
      group.addEventListener("mouseleave", () => hoverObject(null));

      viewport.appendChild(group);
    }

    // Apply pan/zoom, isolate mode, and edge visibility
    applyPanZoom();
    updateEdgeVisibility();
    applyIsolateMode();
  }

  function applyPanZoom(g) {
    if (!g) g = $("#viewport");
    if (!g) return;
    g.setAttribute("transform", `translate(${state.pan.x}, ${state.pan.y}) scale(${state.zoom})`);
  }

  // ==========================================================================
  // EDGE VISIBILITY & HIGHLIGHTING
  // ==========================================================================
  function updateEdgeVisibility() {
    const edgeLines = $$("#schemaSvg .edge-line");
    const activeKey = state.selected || state.hovered;

    for (const line of edgeLines) {
      const from = line.dataset.from;
      const to = line.dataset.to;

      // Determine if this edge should be highlighted
      const isHighlighted = activeKey && (from === activeKey || to === activeKey);

      // Apply highlighting
      if (isHighlighted) {
        line.classList.add("is-highlight");
        line.setAttribute("marker-end", "url(#arrowHi)");
      } else {
        line.classList.remove("is-highlight");
        line.setAttribute("marker-end", "url(#arrow)");
      }

      // Apply visibility based on showEdges mode
      if (state.showEdges === "off") {
        line.style.opacity = "0";
      } else if (state.showEdges === "all") {
        line.style.opacity = isHighlighted ? "1" : "0.4";
      } else {
        // "focus" mode - show only highlighted edges
        line.style.opacity = isHighlighted ? "1" : "0";
      }
    }
  }

  // ==========================================================================
  // ISOLATE MODE (1-hop neighbors)
  // ==========================================================================
  function getNeighborKeys(key) {
    const neighbors = new Set();
    neighbors.add(key);
    
    for (const e of edges) {
      if (e.from === key) neighbors.add(e.to);
      if (e.to === key) neighbors.add(e.from);
    }
    
    return neighbors;
  }

  function applyIsolateMode() {
    const nodes = $$("#schemaSvg .diagram-node");
    const edgeLines = $$("#schemaSvg .edge-line");

    if (!state.isolateMode || !state.selected) {
      // Remove all dimming
      nodes.forEach(n => n.classList.remove("is-dim"));
      edgeLines.forEach(e => e.classList.remove("is-dim"));
      return;
    }

    const visibleKeys = getNeighborKeys(state.selected);

    // Dim nodes not in visible set
    for (const node of nodes) {
      if (visibleKeys.has(node.dataset.key)) {
        node.classList.remove("is-dim");
      } else {
        node.classList.add("is-dim");
      }
    }

    // Dim edges not connecting visible nodes
    for (const edge of edgeLines) {
      const from = edge.dataset.from;
      const to = edge.dataset.to;
      if (visibleKeys.has(from) && visibleKeys.has(to)) {
        edge.classList.remove("is-dim");
      } else {
        edge.classList.add("is-dim");
      }
    }
  }

  // ==========================================================================
  // INSPECTOR (Right Panel)
  // ==========================================================================
  function renderInspector() {
    const panel = $("#inspector");
    if (!panel) return;
    
    const activeKey = state.selected || state.hovered;
    
    if (!activeKey) {
      panel.innerHTML = `
        <div class="inspector-header">
          <span class="inspector-type">—</span>
          <h2 class="inspector-title">Select an object</h2>
        </div>
        <div class="inspector-content">
          <div class="inspector-empty">
            <p>Click a table in the diagram or select any object from the left sidebar to see its documentation.</p>
            <p class="hint">Tip: Enable "Isolate (1-hop)" to focus on a table and its direct relationships.</p>
          </div>
        </div>
      `;
      return;
    }

    const obj = byKey.get(activeKey);
    if (!obj) {
      panel.innerHTML = '<div class="inspector-empty">Object not found.</div>';
      return;
    }

    panel.innerHTML = "";

    // Header
    const header = document.createElement("div");
    header.className = "inspector-header";
    header.innerHTML = `
      <span class="inspector-type">${obj.type}</span>
      <h2 class="inspector-title">${obj.name}</h2>
    `;
    panel.appendChild(header);

    // Tabs
    const tabs = document.createElement("div");
    tabs.className = "inspector-tabs";
    tabs.innerHTML = `
      <button class="inspector-tab active" data-tab="business">Business</button>
      <button class="inspector-tab" data-tab="technical">Technical</button>
    `;
    panel.appendChild(tabs);

    // Tab content
    const content = document.createElement("div");
    content.className = "inspector-content";
    panel.appendChild(content);

    // Wire tab clicks
    tabs.querySelectorAll(".inspector-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        tabs.querySelectorAll(".inspector-tab").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        if (btn.dataset.tab === "business") {
          renderBusinessTab(content, obj);
        } else {
          renderTechnicalTab(content, obj);
        }
      });
    });

    // Initial render
    renderBusinessTab(content, obj);
  }

  function renderBusinessTab(container, obj) {
    container.innerHTML = "";
    
    const businessDoc = BUSINESS_DOCS[obj.name];
    
    if (businessDoc) {
      // Use structured business documentation
      const sections = [
        { title: "What is this?", content: businessDoc.what, icon: "📋" },
        { title: "Where does it appear?", content: businessDoc.where, icon: "🔍" },
        { title: "Why does it exist?", content: businessDoc.why, icon: "💡" },
        { title: "Data Flow", content: businessDoc.dataFlow, icon: "🔄" },
        { title: "Example", content: businessDoc.example, icon: "📝" }
      ];

      for (const sec of sections) {
        if (!sec.content) continue;
        const div = document.createElement("div");
        div.className = "inspector-section";
        div.innerHTML = `<h3>${sec.icon} ${sec.title}</h3><p>${sec.content}</p>`;
        container.appendChild(div);
      }
    } else {
      // Fallback for objects without business docs
      const desc = obj.description || `A ${obj.type} in the Adams Apples schema.`;
      const div = document.createElement("div");
      div.className = "inspector-section";
      div.innerHTML = `<h3>📋 Description</h3><p>${desc}</p>`;
      container.appendChild(div);

      // Add a note that business docs should be added
      const noteDiv = document.createElement("div");
      noteDiv.className = "inspector-section";
      noteDiv.innerHTML = `<p class="hint"><em>Business documentation not yet available for this ${obj.type}.</em></p>`;
      container.appendChild(noteDiv);
    }

    // Relationships (for tables) - "Why These Links Exist"
    if (obj.type === "table" && obj.columns) {
      const fks = obj.columns.filter(c => c.fk);
      if (fks.length > 0) {
        const div = document.createElement("div");
        div.className = "inspector-section";
        let html = "<h3>🔗 Why These Links Exist</h3>";
        html += "<p class='hint'>Foreign keys connect this table to others. Here's what each relationship enables:</p><ul class='fk-list'>";
        for (const fk of fks) {
          const why = explainFkWhy(obj, fk);
          html += `<li>
            <strong>${fk.name}</strong> → <code>${fk.fk.table}.${fk.fk.column}</code>
            <div class="fk-explanation">${why}</div>
          </li>`;
        }
        html += "</ul>";
        div.innerHTML = html;
        container.appendChild(div);
      }

      // Incoming references (what points TO this table)
      const incomingRefs = findIncomingReferences(obj.name);
      if (incomingRefs.length > 0) {
        const div = document.createElement("div");
        div.className = "inspector-section";
        let html = "<h3>📥 Referenced By</h3>";
        html += "<p class='hint'>Other tables point to this one:</p><ul class='incoming-list'>";
        for (const ref of incomingRefs) {
          html += `<li><code>${ref.table}.${ref.column}</code></li>`;
        }
        html += "</ul>";
        div.innerHTML = html;
        container.appendChild(div);
      }
    }

    // FK Index warnings for this table
    if (obj.type === "table") {
      const issues = fkIndexIssues.filter(i => i.table === obj.name);
      if (issues.length > 0) {
        const div = document.createElement("div");
        div.className = "inspector-section fk-warning-section";
        let html = "<h3>⚠️ Missing FK Indexes</h3>";
        html += "<p>These foreign key columns would benefit from indexes for faster JOINs:</p><ul>";
        for (const issue of issues) {
          html += `<li>
            <code>${issue.column}</code> → ${issue.referencedTable}
            <div class="suggestion"><code>${issue.suggestion}</code></div>
          </li>`;
        }
        html += "</ul>";
        div.innerHTML = html;
        container.appendChild(div);
      }
    }
  }

  function findIncomingReferences(tableName) {
    const refs = [];
    const tbls = byType.get("table") || [];
    for (const tbl of tbls) {
      if (!tbl.columns) continue;
      for (const col of tbl.columns) {
        if (col.fk && col.fk.table === tableName) {
          refs.push({ table: tbl.name, column: col.name });
        }
      }
    }
    return refs;
  }

  function renderTechnicalTab(container, obj) {
    container.innerHTML = "";

    // Columns table for tables
    if (obj.type === "table" && obj.columns) {
      const div = document.createElement("div");
      div.className = "inspector-section";
      
      let html = "<h3>Columns</h3><table class='columns-table'><thead><tr><th>Name</th><th>Type</th><th>Nullable</th><th>Notes</th></tr></thead><tbody>";
      
      for (const col of obj.columns) {
        const badges = [];
        if (col.pk) badges.push('<span class="badge pk">PK</span>');
        if (col.fk) badges.push(`<span class="badge fk">FK → ${col.fk.table}</span>`);
        if (col.unique) badges.push('<span class="badge unique">UNIQUE</span>');
        
        // Check for missing FK index
        const hasWarning = fkIndexIssues.some(i => i.table === obj.name && i.column === col.name);
        if (hasWarning) {
          badges.push('<span class="badge warning">⚠️ No Index</span>');
        }
        
        html += `<tr>
          <td><code>${col.name}</code></td>
          <td><code>${col.type}</code></td>
          <td>${col.nullable ? 'Yes' : 'No'}</td>
          <td>${badges.join(' ')}</td>
        </tr>`;
      }
      
      html += "</tbody></table>";
      div.innerHTML = html;
      container.appendChild(div);
    }

    // Indexes
    if (obj.indexes && obj.indexes.length > 0) {
      const div = document.createElement("div");
      div.className = "inspector-section";
      let html = "<h3>Indexes</h3><ul class='index-list'>";
      for (const idx of obj.indexes) {
        const cols = (idx.columns || []).join(", ");
        const flags = [];
        if (idx.unique) flags.push("UNIQUE");
        if (idx.method && idx.method !== "btree") flags.push(idx.method.toUpperCase());
        if (idx.where) flags.push(`WHERE ${idx.where}`);
        const flagStr = flags.length ? ` (${flags.join(", ")})` : "";
        html += `<li><code>${idx.name}</code>: ${cols}${flagStr}</li>`;
      }
      html += "</ul>";
      div.innerHTML = html;
      container.appendChild(div);
    }

    // Definition for views/functions/triggers
    if (obj.definition) {
      const div = document.createElement("div");
      div.className = "inspector-section";
      div.innerHTML = `<h3>Definition</h3><pre class="code-block">${escapeHtml(obj.definition)}</pre>`;
      container.appendChild(div);
    }

    // Enum values
    if (obj.type === "enum" && obj.values) {
      const div = document.createElement("div");
      div.className = "inspector-section";
      let html = "<h3>Allowed Values</h3><ul class='enum-values'>";
      for (const v of obj.values) {
        html += `<li><code>${v}</code></li>`;
      }
      html += "</ul>";
      div.innerHTML = html;
      container.appendChild(div);
    }
  }

  function explainFkWhy(tableObj, fk) {
    const colName = fk.name;
    const refTable = fk.fk.table;
    
    // Use detailed explanations if available
    const baseCol = colName.replace(/_id$/, '').replace(/_by$/, '');
    const detailedWhy = FK_WHY_DETAILED[colName] || FK_WHY_DETAILED[baseCol + "_id"];
    
    if (detailedWhy) {
      // Return the "general" explanation, but could expand to show more
      return detailedWhy.general + (detailedWhy.example ? ` <em>Example: ${detailedWhy.example}</em>` : "");
    }

    // Fallback explanations for specific patterns
    const explanations = {
      client_id: `Links to the owning client. Enables billing, permissions, and "all records for this client" queries.`,
      location_id: `Links to the physical property. Enables map display and location-based filtering.`,
      user_id: `Tracks who performed this action. Enables audit trail and accountability.`,
      created_by: `Records who created this entry. Part of the audit trail.`,
      updated_by: `Records who last modified this entry. Part of the audit trail.`,
      assigned_to_id: `Identifies the responsible worker or manager for this task.`,
      approved_by_id: `Records who approved this in the workflow. Approval accountability.`,
      denied_by_id: `Records who denied this in the workflow. Denial accountability.`,
      completed_by_id: `Records who marked this complete. Completion accountability.`,
      verified_by_id: `Records who verified the work. Quality assurance accountability.`,
      proposed_by_id: `Records who initially proposed this. Origin tracking.`,
      scion_variety_id: `Links to the fruiting variety. Determines fruit characteristics.`,
      rootstock_variety_id: `Links to the rootstock. Determines tree size and vigor.`,
      species_id: `Links to the fruit species (Apple, Pear, etc.). Organizes the catalog.`,
      orchard_block_id: `Places this within a specific orchard subdivision. Field organization.`,
      source_batch_id: `Traces to the nursery batch where propagated. Quality tracing.`,
      work_order_id: `Associates with a specific work order. Job tracking.`,
      work_order_type_id: `Categorizes what type of work. Standardization and reporting.`,
      category_id: `Groups under a broader category. Organization and reporting.`,
      invoice_id: `Links to the invoice. Billing and payment tracking.`,
      nursery_order_id: `Associates with a client's tree order. Sales tracking.`,
      nursery_batch_id: `Links to the propagation batch. Production tracking.`,
      tree_id: `References a specific individual tree. Precision management.`,
      alert_rule_id: `Identifies which rule triggered this alert. Configuration tracing.`,
      tree_health_record_id: `Links to the health observation that caused this. Context.`,
      primary_species_id: `Main fruit type in this block. Block planning.`,
      storage_location_id: `Where this item is physically stored. Inventory location.`,
      destination_location_id: `Where trees will be planted after purchase. Delivery planning.`,
      inventory_item_id: `Which inventory item was involved. Material tracking.`,
      resolution_work_order_id: `Work order created to resolve this issue. Action tracking.`,
      received_by: `Who received this payment. Cash handling accountability.`,
      recorded_by: `Who recorded this observation. Inspector accountability.`,
      planted_by: `Who physically planted this tree. Planting records.`,
      reserved_for_client_id: `Which client has reserved this tree. Sales pipeline.`,
      sold_to_client_id: `Which client purchased this tree. Sales records.`,
      from_location_id: `Source location for transfer. Inventory movement.`,
      to_location_id: `Destination location for transfer. Inventory movement.`,
      nursery_order_item_id: `Specific line item on the order. Order detail tracking.`
    };

    return explanations[colName] || `Connects to ${refTable} to maintain referential integrity and enable JOINs.`;
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ==========================================================================
  // DOCS VIEW
  // ==========================================================================
  function renderDocs() {
    const container = $("#docsView");
    if (!container) return;
    
    // Store original content container
    let docsContent = container.querySelector(".docs-content");
    if (!docsContent) {
      container.innerHTML = `
        <div class="docs-header">
          <div class="docs-title">Schema Documentation</div>
          <div class="docs-sub">Complete documentation for all database objects. Click an object on the left to see details, or use "Build Print Doc" to generate a full printable version.</div>
        </div>
        <div class="docs-content"></div>
      `;
      docsContent = container.querySelector(".docs-content");
    }
    
    docsContent.innerHTML = "";

    // FK Index Warnings (if any)
    if (fkIndexIssues.length > 0) {
      const warningSection = document.createElement("div");
      warningSection.className = "doc-section fk-warning-section";
      warningSection.innerHTML = `
        <h2>⚠️ Foreign Key Index Recommendations</h2>
        <p>The following foreign key columns lack indexes. Adding indexes improves JOIN performance when querying related data:</p>
        <table class="fk-issues-table">
          <thead><tr><th>Table</th><th>FK Column</th><th>References</th><th>Suggested Index</th></tr></thead>
          <tbody>
            ${fkIndexIssues.map(i => `
              <tr>
                <td><code>${i.table}</code></td>
                <td><code>${i.column}</code></td>
                <td><code>${i.referencedTable}</code></td>
                <td><code class="suggestion">${i.suggestion}</code></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
      docsContent.appendChild(warningSection);
    }

    // Group by type with full documentation
    const groups = [
      { type: "table", title: "Tables", desc: "Core data storage structures" },
      { type: "view", title: "Views", desc: "Pre-built queries for reporting and dashboards" },
      { type: "function", title: "Functions", desc: "Reusable database code" },
      { type: "trigger", title: "Triggers", desc: "Automatic code that runs on data changes" },
      { type: "enum", title: "Enums", desc: "Predefined value lists" }
    ];

    for (const { type, title, desc } of groups) {
      const items = byType.get(type) || [];
      if (!items.length) continue;

      const section = document.createElement("div");
      section.className = "doc-section";
      section.innerHTML = `<h2>${title} <span class="doc-count">(${items.length})</span></h2><p class="doc-section-desc">${desc}</p>`;

      for (const obj of items) {
        const article = document.createElement("article");
        article.className = "doc-object";
        article.id = `doc-${obj.key}`;

        let html = `<h3>${obj.name}</h3>`;

        // Business description
        const businessDoc = BUSINESS_DOCS[obj.name];
        if (businessDoc) {
          html += `<div class="doc-business">
            <p><strong>What:</strong> ${businessDoc.what}</p>
            <p><strong>Why:</strong> ${businessDoc.why}</p>
            ${businessDoc.example ? `<p><strong>Example:</strong> <em>${businessDoc.example}</em></p>` : ''}
          </div>`;
        } else if (obj.description) {
          html += `<p>${obj.description}</p>`;
        }

        // Columns for tables
        if (type === "table" && obj.columns) {
          html += `<details><summary>Columns (${obj.columns.length})</summary><table class="columns-table"><thead><tr><th>Column</th><th>Type</th><th>Notes</th></tr></thead><tbody>`;
          for (const col of obj.columns) {
            const badges = [];
            if (col.pk) badges.push('<span class="badge pk">PK</span>');
            if (col.fk) badges.push(`<span class="badge fk">FK → ${col.fk.table}</span>`);
            if (!col.nullable) badges.push('<span class="badge required">Required</span>');
            html += `<tr><td><code>${col.name}</code></td><td><code>${col.type}</code></td><td>${badges.join(' ')}</td></tr>`;
          }
          html += `</tbody></table></details>`;
        }

        // Values for enums
        if (type === "enum" && obj.values) {
          html += `<p><strong>Values:</strong> <code>${obj.values.join('</code> · <code>')}</code></p>`;
        }

        article.innerHTML = html;
        section.appendChild(article);
      }

      docsContent.appendChild(section);
    }
  }

  // ==========================================================================
  // GLOSSARY VIEW
  // ==========================================================================
  function renderGlossary() {
    const container = $("#glossaryView");
    if (!container) return;
    
    let glossaryContent = container.querySelector(".glossary-content");
    if (!glossaryContent) {
      container.innerHTML = `
        <div class="docs-header">
          <div class="docs-title">Database Glossary</div>
          <div class="docs-sub">Plain-language definitions of database concepts used in this schema. Perfect for non-technical stakeholders.</div>
        </div>
        <div class="glossary-content"></div>
      `;
      glossaryContent = container.querySelector(".glossary-content");
    }
    
    glossaryContent.innerHTML = "";

    for (const [sectionTitle, terms] of Object.entries(GLOSSARY)) {
      const section = document.createElement("div");
      section.className = "glossary-section";

      const h2 = document.createElement("h2");
      h2.textContent = sectionTitle;
      section.appendChild(h2);

      const dl = document.createElement("dl");
      dl.className = "glossary-terms";
      for (const [term, definition] of Object.entries(terms)) {
        const dt = document.createElement("dt");
        dt.className = "glossary-term";
        dt.textContent = term;
        dl.appendChild(dt);

        const dd = document.createElement("dd");
        dd.textContent = definition;
        dl.appendChild(dd);
      }
      section.appendChild(dl);

      glossaryContent.appendChild(section);
    }
  }

  // ==========================================================================
  // PRINT / PDF GENERATION
  // ==========================================================================
  function buildPrintDoc() {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to generate the PDF document.');
      return;
    }

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const tbls = byType.get('table') || [];
    const views = byType.get('view') || [];
    const functions = byType.get('function') || [];
    const triggers = byType.get('trigger') || [];
    const enums = byType.get('enum') || [];

    let html = `<!DOCTYPE html>
<html>
<head>
  <title>Adams Apples v2 - Schema Documentation</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; 
      line-height: 1.6; 
      color: #333; 
      max-width: 900px; 
      margin: 0 auto; 
      padding: 20px;
      font-size: 11pt;
    }
    h1 { color: #2d5016; border-bottom: 3px solid #4a7c23; padding-bottom: 10px; margin-top: 0; }
    h2 { color: #4a7c23; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px; page-break-after: avoid; }
    h3 { color: #333; margin-top: 20px; page-break-after: avoid; }
    h4 { color: #555; margin-top: 15px; margin-bottom: 5px; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: "SF Mono", Consolas, monospace; font-size: 0.9em; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 0.85em; white-space: pre-wrap; }
    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 10pt; }
    th { background: #f8f8f8; font-weight: 600; }
    tr:nth-child(even) { background: #fafafa; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 0.75em; font-weight: 600; margin-right: 4px; }
    .badge.pk { background: #dbeafe; color: #1e40af; }
    .badge.fk { background: #fef3c7; color: #92400e; }
    .badge.required { background: #fee2e2; color: #991b1b; }
    .toc { background: #f8f8f8; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .toc h2 { margin-top: 0; border: none; }
    .toc ul { columns: 2; column-gap: 30px; list-style: none; padding: 0; }
    .toc li { margin: 5px 0; }
    .toc a { color: #2563eb; text-decoration: none; }
    .warning-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin: 20px 0; }
    .warning-box h3 { color: #92400e; margin-top: 0; }
    .glossary-section { margin-bottom: 25px; }
    .glossary-section h3 { color: #4a7c23; border-bottom: 1px solid #eee; padding-bottom: 5px; }
    .glossary-section dt { font-weight: 600; color: #2d5016; margin-top: 10px; }
    .glossary-section dd { margin-left: 20px; color: #555; }
    article { margin-bottom: 25px; padding-bottom: 15px; border-bottom: 1px solid #eee; page-break-inside: avoid; }
    .doc-business { background: #f0fdf4; border-left: 4px solid #4a7c23; padding: 10px 15px; margin: 10px 0; }
    .doc-business p { margin: 5px 0; }
    em { color: #666; }
    .stats { display: flex; gap: 20px; flex-wrap: wrap; margin: 20px 0; }
    .stat { background: #f0fdf4; padding: 15px 20px; border-radius: 8px; text-align: center; }
    .stat-num { font-size: 24pt; font-weight: 700; color: #2d5016; }
    .stat-label { font-size: 10pt; color: #666; }
    @media print {
      body { font-size: 10pt; }
      h1 { font-size: 18pt; }
      h2 { font-size: 14pt; page-break-after: avoid; }
      h3 { font-size: 12pt; }
      article { page-break-inside: avoid; }
      .toc { page-break-after: always; }
      .warning-box, .glossary-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>🍎 Adams Apples v2 - Database Schema</h1>
  <p><em>Generated ${today}</em></p>
  
  <div class="stats">
    <div class="stat"><div class="stat-num">${tbls.length}</div><div class="stat-label">Tables</div></div>
    <div class="stat"><div class="stat-num">${views.length}</div><div class="stat-label">Views</div></div>
    <div class="stat"><div class="stat-num">${functions.length}</div><div class="stat-label">Functions</div></div>
    <div class="stat"><div class="stat-num">${triggers.length}</div><div class="stat-label">Triggers</div></div>
    <div class="stat"><div class="stat-num">${enums.length}</div><div class="stat-label">Enums</div></div>
  </div>
  
  <div class="toc">
    <h2>Table of Contents</h2>
    <ul>
      <li><a href="#tables">Tables (${tbls.length})</a></li>
      <li><a href="#views">Views (${views.length})</a></li>
      <li><a href="#functions">Functions (${functions.length})</a></li>
      <li><a href="#triggers">Triggers (${triggers.length})</a></li>
      <li><a href="#enums">Enums (${enums.length})</a></li>
      <li><a href="#glossary">Glossary</a></li>
      ${fkIndexIssues.length > 0 ? '<li><a href="#fk-audit">FK Index Audit</a></li>' : ''}
    </ul>
  </div>`;

    // FK Warnings
    if (fkIndexIssues.length > 0) {
      html += `
  <div class="warning-box" id="fk-audit">
    <h3>⚠️ Foreign Key Index Recommendations</h3>
    <p>${fkIndexIssues.length} foreign key columns may benefit from indexes for better JOIN performance:</p>
    <table>
      <tr><th>Table</th><th>Column</th><th>References</th><th>Suggested Index</th></tr>
      ${fkIndexIssues.map(i => `<tr><td><code>${i.table}</code></td><td><code>${i.column}</code></td><td><code>${i.referencedTable}</code></td><td><code>${i.suggestion}</code></td></tr>`).join('')}
    </table>
  </div>`;
    }

    // Tables
    html += `<h2 id="tables">Tables (${tbls.length})</h2>`;
    for (const t of tbls) {
      const bd = BUSINESS_DOCS[t.name];
      html += `<article>
        <h3>${t.name}</h3>`;
      if (bd) {
        html += `<div class="doc-business">
          <p><strong>What:</strong> ${bd.what}</p>
          <p><strong>Why:</strong> ${bd.why}</p>
          ${bd.example ? `<p><strong>Example:</strong> <em>${bd.example}</em></p>` : ''}
        </div>`;
      } else if (t.description) {
        html += `<p>${t.description}</p>`;
      }
      if (t.columns) {
        html += `<h4>Columns (${t.columns.length})</h4>
        <table><thead><tr><th>Name</th><th>Type</th><th>Notes</th></tr></thead><tbody>`;
        for (const c of t.columns) {
          const badges = [];
          if (c.pk) badges.push('<span class="badge pk">PK</span>');
          if (c.fk) badges.push(`<span class="badge fk">FK → ${c.fk.table}</span>`);
          if (!c.nullable) badges.push('<span class="badge required">Req</span>');
          html += `<tr><td><code>${c.name}</code></td><td><code>${c.type}</code></td><td>${badges.join(' ')}</td></tr>`;
        }
        html += `</tbody></table>`;
      }
      html += `</article>`;
    }

    // Views
    html += `<h2 id="views">Views (${views.length})</h2>`;
    for (const v of views) {
      const bd = BUSINESS_DOCS[v.name];
      html += `<article><h3>${v.name}</h3>`;
      if (bd) {
        html += `<div class="doc-business">
          <p><strong>What:</strong> ${bd.what}</p>
          <p><strong>Why:</strong> ${bd.why}</p>
        </div>`;
      } else if (v.description) {
        html += `<p>${v.description}</p>`;
      }
      html += `</article>`;
    }

    // Functions
    html += `<h2 id="functions">Functions (${functions.length})</h2>`;
    for (const f of functions) {
      const bd = BUSINESS_DOCS[f.name];
      html += `<article><h3>${f.name}</h3>`;
      if (bd) {
        html += `<div class="doc-business">
          <p><strong>What:</strong> ${bd.what}</p>
          <p><strong>Why:</strong> ${bd.why}</p>
        </div>`;
      } else if (f.description) {
        html += `<p>${f.description}</p>`;
      }
      html += `</article>`;
    }

    // Triggers
    html += `<h2 id="triggers">Triggers (${triggers.length})</h2>`;
    for (const tr of triggers) {
      const bd = BUSINESS_DOCS[tr.name];
      html += `<article><h3>${tr.name}</h3>`;
      if (bd) {
        html += `<div class="doc-business">
          <p><strong>What:</strong> ${bd.what}</p>
          <p><strong>Why:</strong> ${bd.why}</p>
        </div>`;
      } else if (tr.description) {
        html += `<p>${tr.description}</p>`;
      }
      html += `</article>`;
    }

    // Enums
    html += `<h2 id="enums">Enums (${enums.length})</h2>`;
    for (const e of enums) {
      const bd = BUSINESS_DOCS[e.name];
      html += `<article><h3>${e.name}</h3>`;
      if (bd) {
        html += `<div class="doc-business">
          <p><strong>What:</strong> ${bd.what}</p>
          <p><strong>Why:</strong> ${bd.why}</p>
        </div>`;
      } else if (e.description) {
        html += `<p>${e.description}</p>`;
      }
      if (e.values) {
        html += `<p><strong>Values:</strong> <code>${e.values.join('</code> · <code>')}</code></p>`;
      }
      html += `</article>`;
    }

    // Glossary
    html += `<h2 id="glossary">Glossary</h2>`;
    for (const [section, terms] of Object.entries(GLOSSARY)) {
      html += `<div class="glossary-section"><h3>${section}</h3><dl>`;
      for (const [term, def] of Object.entries(terms)) {
        html += `<dt>${term}</dt><dd>${def}</dd>`;
      }
      html += `</dl></div>`;
    }

    html += `</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
  }

  // ==========================================================================
  // TOC DIALOG
  // ==========================================================================
  function buildToc() {
    const tocBody = $("#tocBody");
    if (!tocBody) return;
    tocBody.innerHTML = "";

    const groups = [
      { type: "table", title: "Tables" },
      { type: "view", title: "Views" },
      { type: "function", title: "Functions" },
      { type: "trigger", title: "Triggers" },
      { type: "enum", title: "Enums" }
    ];

    for (const { type, title } of groups) {
      const items = byType.get(type) || [];
      if (!items.length) continue;

      const group = document.createElement("div");
      group.className = "toc-group";
      group.innerHTML = `<h3>${title} (${items.length})</h3>`;

      for (const obj of items) {
        const link = document.createElement("a");
        link.className = "toc-link";
        link.textContent = obj.name;
        link.href = "#";
        link.addEventListener("click", e => {
          e.preventDefault();
          selectObject(obj.key);
          $("#tocDialog").close();
        });
        group.appendChild(link);
      }

      tocBody.appendChild(group);
    }
  }

  // ==========================================================================
  // VIEW SWITCHING
  // ==========================================================================
  function setView(view) {
    state.view = view;

    // Update tabs
    $$(".seg").forEach(t => t.classList.remove("active"));
    $(`#tab${view.charAt(0).toUpperCase() + view.slice(1)}`)?.classList.add("active");

    // Show/hide views
    $("#diagramView")?.classList.toggle("hidden", view !== "diagram");
    $("#docsView")?.classList.toggle("hidden", view !== "docs");
    $("#glossaryView")?.classList.toggle("hidden", view !== "glossary");

    // Render content
    if (view === "diagram") {
      renderDiagram();
    } else if (view === "docs") {
      renderDocs();
    } else if (view === "glossary") {
      renderGlossary();
    }
  }

  // ==========================================================================
  // SELECTION & HOVER
  // ==========================================================================
  function selectObject(key) {
    state.selected = key;
    renderSidebar();
    updateNodeSelection();
    updateEdgeVisibility();
    applyIsolateMode();
    renderInspector();
  }

  function hoverObject(key) {
    state.hovered = key;
    updateEdgeVisibility();
    if (!state.selected) {
      renderInspector();
    }
  }

  function updateNodeSelection() {
    const nodes = $$("#schemaSvg .diagram-node");
    for (const node of nodes) {
      const rect = node.querySelector("rect");
      if (rect) {
        rect.classList.toggle("selected", node.dataset.key === state.selected);
      }
    }
  }

  function cycleEdgeMode() {
    const modes = ["focus", "all", "off"];
    const idx = modes.indexOf(state.showEdges);
    state.showEdges = modes[(idx + 1) % modes.length];
    
    const btn = $("#btnToggleEdges");
    if (btn) {
      btn.textContent = `Edges: ${state.showEdges.charAt(0).toUpperCase() + state.showEdges.slice(1)}`;
    }
    
    updateEdgeVisibility();
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  function init() {
    renderSidebar();
    renderDiagram();
    renderInspector();
    wireEvents();
    
    // Set initial edge button text
    const btn = $("#btnToggleEdges");
    if (btn) {
      btn.textContent = `Edges: Focus`;
    }
  }

  function wireEvents() {
    // View tabs
    $$(".seg").forEach(tab => {
      tab.addEventListener("click", () => {
        const view = tab.id.replace("tab", "").toLowerCase();
        setView(view);
      });
    });

    // Type filter chips
    $$(".chip[data-type]").forEach(chip => {
      chip.addEventListener("click", () => {
        state.typeFilter = chip.dataset.type;
        $$(".chip[data-type]").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        renderSidebar();
      });
    });

    // Search input
    const searchInput = $("#searchInput");
    if (searchInput) {
      searchInput.addEventListener("input", e => {
        state.filter = e.target.value.toLowerCase();
        renderSidebar();
      });
    }

    // Edge toggle
    const edgeBtn = $("#btnToggleEdges");
    if (edgeBtn) {
      edgeBtn.addEventListener("click", cycleEdgeMode);
    }

    // Isolate mode toggle
    const isolateCheckbox = $("#isolateCheckbox");
    if (isolateCheckbox) {
      isolateCheckbox.addEventListener("change", () => {
        state.isolateMode = isolateCheckbox.checked;
        applyIsolateMode();
      });
    }

    // Fit button
    const fitBtn = $("#btnFit");
    if (fitBtn) {
      fitBtn.addEventListener("click", () => {
        state.zoom = 1;
        state.pan = { x: 0, y: 0 };
        applyPanZoom();
      });
    }

    // Reset view button
    const resetBtn = $("#btnResetView");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        state.zoom = 1;
        state.pan = { x: 0, y: 0 };
        applyPanZoom();
      });
    }

    // Build Print Doc button
    const buildPrintBtn = $("#btnBuildPrint");
    if (buildPrintBtn) {
      buildPrintBtn.addEventListener("click", buildPrintDoc);
    }

    // Print button
    const printBtn = $("#btnPrint");
    if (printBtn) {
      printBtn.addEventListener("click", () => window.print());
    }

    // TOC button
    const tocBtn = $("#btnToc");
    const tocDialog = $("#tocDialog");
    if (tocBtn && tocDialog) {
      tocBtn.addEventListener("click", () => {
        buildToc();
        tocDialog.showModal();
      });
    }

    // Pan with mouse drag
    const svg = $("#schemaSvg");
    if (svg) {
      let isPanning = false;
      let startPoint = { x: 0, y: 0 };

      svg.addEventListener("mousedown", e => {
        if (e.target === svg || e.target.tagName === "svg") {
          isPanning = true;
          startPoint = { x: e.clientX - state.pan.x, y: e.clientY - state.pan.y };
          svg.style.cursor = "grabbing";
        }
      });

      svg.addEventListener("mousemove", e => {
        if (!isPanning) return;
        state.pan.x = e.clientX - startPoint.x;
        state.pan.y = e.clientY - startPoint.y;
        applyPanZoom();
      });

      svg.addEventListener("mouseup", () => {
        isPanning = false;
        svg.style.cursor = "";
      });

      svg.addEventListener("mouseleave", () => {
        isPanning = false;
        svg.style.cursor = "";
      });

      // Zoom with scroll
      svg.addEventListener("wheel", e => {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        state.zoom = Math.max(0.25, Math.min(3, state.zoom * delta));
        applyPanZoom();
      });
    }

    // Keyboard shortcuts
    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        state.selected = null;
        state.hovered = null;
        renderSidebar();
        updateNodeSelection();
        updateEdgeVisibility();
        applyIsolateMode();
        renderInspector();
      }
      if (e.key === "1") setView("diagram");
      if (e.key === "2") setView("docs");
      if (e.key === "3") setView("glossary");
    });
  }

  // Start
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
