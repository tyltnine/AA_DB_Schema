/**
 * Adams Apples V5 - Schema Data
 * Extracted from V001__initial_schema_v2.sql
 * 
 * Statistics:
 * - 27 Tables
 * - 17 Enums  
 * - 15 Views
 * - 9 Functions
 * - 23 Triggers
 */

window.SCHEMA = {
  objects: [
    // =========================================================================
    // TABLES (27)
    // =========================================================================
    {
      key: "table_clients",
      type: "table",
      name: "clients",
      domain: "Core",
      description: "Orchard owners who contract Adam for management services. NULL client_id on locations indicates Adam's own property.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "name", type: "VARCHAR(200)", nullable: false },
        { name: "contact_name", type: "VARCHAR(200)", nullable: true },
        { name: "email", type: "CITEXT", nullable: true },
        { name: "phone", type: "VARCHAR(50)", nullable: true },
        { name: "address", type: "TEXT", nullable: true },
        { name: "city", type: "VARCHAR(100)", nullable: true },
        { name: "state", type: "VARCHAR(50)", nullable: true },
        { name: "zip_code", type: "VARCHAR(20)", nullable: true },
        { name: "country", type: "VARCHAR(100)", nullable: true, default: "'USA'" },
        { name: "billing_address", type: "TEXT", nullable: true },
        { name: "payment_terms", type: "INTEGER", nullable: true, default: "30" },
        { name: "tax_id", type: "VARCHAR(50)", nullable: true },
        { name: "client_portal_enabled", type: "BOOLEAN", nullable: false, default: "FALSE" },
        { name: "portal_notes", type: "TEXT", nullable: true },
        { name: "notes", type: "TEXT", nullable: true },
        { name: "is_active", type: "BOOLEAN", nullable: false, default: "TRUE" },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_clients_name", columns: ["name"] },
        { name: "idx_clients_active", columns: ["is_active"] },
        { name: "idx_clients_portal_enabled", columns: ["client_portal_enabled"], where: "client_portal_enabled = TRUE" }
      ]
    },
    {
      key: "table_users",
      type: "table",
      name: "users",
      domain: "Core",
      description: "System users including Adam's team and client portal users. Implements UserDetails for Spring Security.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "email", type: "CITEXT", nullable: false, unique: true },
        { name: "password_hash", type: "VARCHAR(255)", nullable: false },
        { name: "first_name", type: "VARCHAR(100)", nullable: false },
        { name: "last_name", type: "VARCHAR(100)", nullable: false },
        { name: "phone", type: "VARCHAR(50)", nullable: true },
        { name: "role", type: "user_role", nullable: false, default: "'WORKER'" },
        { name: "client_id", type: "UUID", nullable: true, fk: { table: "clients", column: "id" } },
        { name: "hourly_rate", type: "NUMERIC(10,2)", nullable: true },
        { name: "billable_rate", type: "NUMERIC(10,2)", nullable: true },
        { name: "portal_permissions", type: "JSONB", nullable: true },
        { name: "notification_preferences", type: "JSONB", nullable: true },
        { name: "is_active", type: "BOOLEAN", nullable: false, default: "TRUE" },
        { name: "last_login_at", type: "TIMESTAMPTZ", nullable: true },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_users_email", columns: ["email"] },
        { name: "idx_users_role", columns: ["role"] },
        { name: "idx_users_client_id", columns: ["client_id"] },
        { name: "idx_users_active", columns: ["is_active"] }
      ]
    },
    {
      key: "table_locations",
      type: "table",
      name: "locations",
      domain: "Location",
      description: "Physical locations: orchards, nurseries, farms. Uses PostGIS for spatial data. NULL client_id = Adam's own property.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "client_id", type: "UUID", nullable: true, fk: { table: "clients", column: "id", onDelete: "CASCADE" } },
        { name: "name", type: "VARCHAR(200)", nullable: false },
        { name: "location_type", type: "location_type", nullable: false },
        { name: "description", type: "TEXT", nullable: true },
        { name: "address", type: "TEXT", nullable: true },
        { name: "city", type: "VARCHAR(100)", nullable: true },
        { name: "state", type: "VARCHAR(50)", nullable: true },
        { name: "zip_code", type: "VARCHAR(20)", nullable: true },
        { name: "country", type: "VARCHAR(100)", nullable: true, default: "'USA'" },
        { name: "acreage", type: "NUMERIC(10,2)", nullable: true },
        { name: "centroid", type: "geometry(Point,4326)", nullable: true },
        { name: "boundary", type: "geometry(Polygon,4326)", nullable: true },
        { name: "planting_year", type: "INTEGER", nullable: true },
        { name: "soil_type", type: "VARCHAR(100)", nullable: true },
        { name: "irrigation_type", type: "VARCHAR(100)", nullable: true },
        { name: "is_active", type: "BOOLEAN", nullable: false, default: "TRUE" },
        { name: "metadata", type: "JSONB", nullable: true },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_locations_client_id", columns: ["client_id"] },
        { name: "idx_locations_type", columns: ["location_type"] },
        { name: "idx_locations_active", columns: ["is_active"] },
        { name: "idx_locations_centroid", columns: ["centroid"], type: "GIST" },
        { name: "idx_locations_boundary", columns: ["boundary"], type: "GIST" }
      ]
    },
    {
      key: "table_fruit_species",
      type: "table",
      name: "fruit_species",
      domain: "Variety",
      description: "High-level fruit types (Apple, Pear, Peach). Single-letter code used in tree numbering (A-HON-0001).",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "common_name", type: "VARCHAR(100)", nullable: false, unique: true },
        { name: "scientific_name", type: "VARCHAR(200)", nullable: true },
        { name: "code", type: "CHAR(1)", nullable: false, unique: true },
        { name: "notes", type: "TEXT", nullable: true },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: []
    },
    {
      key: "table_varieties",
      type: "table",
      name: "varieties",
      domain: "Variety",
      description: "Scion varieties (Honeycrisp) and rootstocks (G.41). Contains disease ratings, ripening info, vigor categories.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "species_id", type: "UUID", nullable: false, fk: { table: "fruit_species", column: "id" } },
        { name: "variety_name", type: "VARCHAR(200)", nullable: false },
        { name: "code", type: "VARCHAR(10)", nullable: true },
        { name: "scientific_name", type: "VARCHAR(200)", nullable: true },
        { name: "is_rootstock", type: "BOOLEAN", nullable: false, default: "FALSE" },
        { name: "vigor_category", type: "VARCHAR(20)", nullable: true },
        { name: "mature_height_min_ft", type: "NUMERIC(5,2)", nullable: true },
        { name: "mature_height_max_ft", type: "NUMERIC(5,2)", nullable: true },
        { name: "requires_support", type: "BOOLEAN", nullable: true, default: "FALSE" },
        { name: "root_hardiness_zone", type: "INTEGER", nullable: true },
        { name: "trademark_name", type: "VARCHAR(200)", nullable: true },
        { name: "patent_number", type: "VARCHAR(50)", nullable: true },
        { name: "patent_expiry", type: "DATE", nullable: true },
        { name: "club_managed", type: "BOOLEAN", nullable: true, default: "FALSE" },
        { name: "pollination_group", type: "INTEGER", nullable: true },
        { name: "self_fertile", type: "BOOLEAN", nullable: true, default: "FALSE" },
        { name: "good_pollenizer", type: "BOOLEAN", nullable: true, default: "FALSE" },
        { name: "vigor", type: "INTEGER", nullable: true },
        { name: "car_rating", type: "INTEGER", nullable: true },
        { name: "fire_blight_resistance", type: "INTEGER", nullable: true },
        { name: "scab_resistance", type: "INTEGER", nullable: true },
        { name: "mildew_resistance", type: "INTEGER", nullable: true },
        { name: "black_spot_rating", type: "INTEGER", nullable: true },
        { name: "summer_rots_notes", type: "TEXT", nullable: true },
        { name: "general_disease_notes", type: "TEXT", nullable: true },
        { name: "regular_crop_rating", type: "INTEGER", nullable: true },
        { name: "taste_rating", type: "INTEGER", nullable: true },
        { name: "taste_notes", type: "TEXT", nullable: true },
        { name: "storage_quality", type: "TEXT", nullable: true },
        { name: "storage_months", type: "INTEGER", nullable: true },
        { name: "ripening_group", type: "INTEGER", nullable: true },
        { name: "ripening_window", type: "VARCHAR(100)", nullable: true },
        { name: "ripening_start_doy", type: "INTEGER", nullable: true },
        { name: "ripening_end_doy", type: "INTEGER", nullable: true },
        { name: "harvest_window_days", type: "INTEGER", nullable: true },
        { name: "days_after_bloom", type: "INTEGER", nullable: true },
        { name: "is_heritage", type: "BOOLEAN", nullable: false, default: "FALSE" },
        { name: "origin", type: "VARCHAR(200)", nullable: true },
        { name: "year_introduced", type: "INTEGER", nullable: true },
        { name: "notes", type: "TEXT", nullable: true },
        { name: "is_active", type: "BOOLEAN", nullable: false, default: "TRUE" },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_varieties_species_id", columns: ["species_id"] },
        { name: "idx_varieties_is_rootstock", columns: ["is_rootstock"] },
        { name: "idx_varieties_name", columns: ["variety_name"] },
        { name: "idx_varieties_code", columns: ["code"] },
        { name: "idx_varieties_active", columns: ["is_active"], where: "is_active = TRUE" },
        { name: "idx_varieties_ripening", columns: ["ripening_start_doy"], where: "is_rootstock = FALSE" },
        { name: "idx_varieties_vigor_category", columns: ["vigor_category"], where: "is_rootstock = TRUE" }
      ]
    },
    {
      key: "table_orchard_blocks",
      type: "table",
      name: "orchard_blocks",
      domain: "Location",
      description: "Subdivisions within a location. Example: 'South Orchard' has 'Northeast Block', 'Southwest Block'.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "location_id", type: "UUID", nullable: false, fk: { table: "locations", column: "id", onDelete: "CASCADE" } },
        { name: "name", type: "VARCHAR(100)", nullable: false },
        { name: "code", type: "VARCHAR(20)", nullable: true },
        { name: "description", type: "TEXT", nullable: true },
        { name: "total_rows", type: "INTEGER", nullable: true },
        { name: "positions_per_row", type: "INTEGER", nullable: true },
        { name: "row_orientation", type: "VARCHAR(20)", nullable: true },
        { name: "row_spacing_ft", type: "NUMERIC(5,2)", nullable: true },
        { name: "tree_spacing_ft", type: "NUMERIC(5,2)", nullable: true },
        { name: "primary_planted_year", type: "INTEGER", nullable: true },
        { name: "primary_species_id", type: "UUID", nullable: true, fk: { table: "fruit_species", column: "id" } },
        { name: "boundary", type: "geometry(Polygon,4326)", nullable: true },
        { name: "centroid", type: "geometry(Point,4326)", nullable: true },
        { name: "sort_order", type: "INTEGER", nullable: true, default: "0" },
        { name: "color_code", type: "VARCHAR(7)", nullable: true },
        { name: "is_active", type: "BOOLEAN", nullable: false, default: "TRUE" },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_orchard_blocks_location", columns: ["location_id"] },
        { name: "idx_orchard_blocks_species", columns: ["primary_species_id"] },
        { name: "idx_orchard_blocks_boundary", columns: ["boundary"], type: "GIST" },
        { name: "idx_orchard_blocks_active", columns: ["is_active"], where: "is_active = TRUE" }
      ]
    },
    {
      key: "table_nursery_orders",
      type: "table",
      name: "nursery_orders",
      domain: "Nursery",
      description: "Client orders for nursery trees. Tracks sales from quote through delivery with pricing and deposits.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "order_number", type: "VARCHAR(50)", nullable: false, unique: true },
        { name: "client_id", type: "UUID", nullable: false, fk: { table: "clients", column: "id" } },
        { name: "order_date", type: "DATE", nullable: false, default: "CURRENT_DATE" },
        { name: "requested_date", type: "DATE", nullable: true },
        { name: "estimated_ready_date", type: "DATE", nullable: true },
        { name: "actual_ready_date", type: "DATE", nullable: true },
        { name: "status", type: "nursery_order_status", nullable: false, default: "'PENDING'" },
        { name: "subtotal", type: "NUMERIC(12,2)", nullable: false, default: "0" },
        { name: "tax_rate", type: "NUMERIC(5,4)", nullable: true, default: "0" },
        { name: "tax_amount", type: "NUMERIC(12,2)", nullable: false, default: "0" },
        { name: "discount_amount", type: "NUMERIC(12,2)", nullable: false, default: "0" },
        { name: "total_amount", type: "NUMERIC(12,2)", nullable: false, default: "0" },
        { name: "deposit_amount", type: "NUMERIC(12,2)", nullable: false, default: "0" },
        { name: "deposit_paid", type: "BOOLEAN", nullable: false, default: "FALSE" },
        { name: "delivery_method", type: "VARCHAR(100)", nullable: true },
        { name: "delivery_address", type: "TEXT", nullable: true },
        { name: "delivery_notes", type: "TEXT", nullable: true },
        { name: "notes", type: "TEXT", nullable: true },
        { name: "internal_notes", type: "TEXT", nullable: true },
        { name: "created_by", type: "UUID", nullable: true, fk: { table: "users", column: "id" } },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_nursery_orders_client_id", columns: ["client_id"] },
        { name: "idx_nursery_orders_status", columns: ["status"] },
        { name: "idx_nursery_orders_order_date", columns: ["order_date"] }
      ]
    },
    {
      key: "table_nursery_order_items",
      type: "table",
      name: "nursery_order_items",
      domain: "Nursery",
      description: "Line items on nursery orders specifying variety, quantity, and pricing.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "order_id", type: "UUID", nullable: false, fk: { table: "nursery_orders", column: "id", onDelete: "CASCADE" } },
        { name: "scion_variety_id", type: "UUID", nullable: false, fk: { table: "varieties", column: "id" } },
        { name: "rootstock_variety_id", type: "UUID", nullable: true, fk: { table: "varieties", column: "id" } },
        { name: "quantity_ordered", type: "INTEGER", nullable: false },
        { name: "quantity_produced", type: "INTEGER", nullable: false, default: "0" },
        { name: "quantity_delivered", type: "INTEGER", nullable: false, default: "0" },
        { name: "unit_price", type: "NUMERIC(10,2)", nullable: false },
        { name: "total_price", type: "NUMERIC(12,2)", nullable: false },
        { name: "nursery_batch_id", type: "UUID", nullable: true, fk: { table: "nursery_batches", column: "id" } },
        { name: "destination_location_id", type: "UUID", nullable: true, fk: { table: "locations", column: "id" } },
        { name: "notes", type: "TEXT", nullable: true },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_nursery_order_items_order_id", columns: ["order_id"] },
        { name: "idx_nursery_order_items_scion", columns: ["scion_variety_id"] }
      ]
    },
    {
      key: "table_nursery_batches",
      type: "table",
      name: "nursery_batches",
      domain: "Nursery",
      description: "Grafting/propagation batches tracking planned vs actual quantities through lifecycle stages.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "location_id", type: "UUID", nullable: false, fk: { table: "locations", column: "id" } },
        { name: "batch_number", type: "VARCHAR(50)", nullable: false, unique: true },
        { name: "scion_variety_id", type: "UUID", nullable: false, fk: { table: "varieties", column: "id" } },
        { name: "rootstock_variety_id", type: "UUID", nullable: true, fk: { table: "varieties", column: "id" } },
        { name: "client_id", type: "UUID", nullable: true, fk: { table: "clients", column: "id" } },
        { name: "nursery_order_id", type: "UUID", nullable: true, fk: { table: "nursery_orders", column: "id" } },
        { name: "nursery_order_item_id", type: "UUID", nullable: true, fk: { table: "nursery_order_items", column: "id" } },
        { name: "graft_year", type: "SMALLINT", nullable: false },
        { name: "graft_date", type: "DATE", nullable: true },
        { name: "graft_method", type: "VARCHAR(100)", nullable: true },
        { name: "planned_quantity", type: "INTEGER", nullable: false, default: "0" },
        { name: "grafted_quantity", type: "INTEGER", nullable: false, default: "0" },
        { name: "status", type: "nursery_batch_status", nullable: false, default: "'PLANNED'" },
        { name: "nursery_block", type: "VARCHAR(50)", nullable: true },
        { name: "nursery_row", type: "VARCHAR(50)", nullable: true },
        { name: "notes", type: "TEXT", nullable: true },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_nursery_batches_location_id", columns: ["location_id"] },
        { name: "idx_nursery_batches_scion_variety_id", columns: ["scion_variety_id"] },
        { name: "idx_nursery_batches_rootstock_variety_id", columns: ["rootstock_variety_id"] },
        { name: "idx_nursery_batches_client_id", columns: ["client_id"] },
        { name: "idx_nursery_batches_order_id", columns: ["nursery_order_id"] },
        { name: "idx_nursery_batches_graft_year", columns: ["graft_year"] },
        { name: "idx_nursery_batches_status", columns: ["status"] }
      ]
    },
    {
      key: "table_trees",
      type: "table",
      name: "trees",
      domain: "Tree",
      description: "Unified tree entity for nursery and orchard trees. Full lifecycle from grafting through maturity or removal.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "tree_number", type: "VARCHAR(50)", nullable: false, unique: true },
        { name: "location_id", type: "UUID", nullable: false, fk: { table: "locations", column: "id" } },
        { name: "orchard_block_id", type: "UUID", nullable: true, fk: { table: "orchard_blocks", column: "id" } },
        { name: "source_batch_id", type: "UUID", nullable: true, fk: { table: "nursery_batches", column: "id" } },
        { name: "scion_variety_id", type: "UUID", nullable: true, fk: { table: "varieties", column: "id" } },
        { name: "rootstock_variety_id", type: "UUID", nullable: true, fk: { table: "varieties", column: "id" } },
        { name: "is_historical_import", type: "BOOLEAN", nullable: false, default: "FALSE" },
        { name: "stage", type: "tree_stage", nullable: false, default: "'NURSERY_FIELD'" },
        { name: "health_status", type: "health_status", nullable: false, default: "'HEALTHY'" },
        { name: "reserved_for_client_id", type: "UUID", nullable: true, fk: { table: "clients", column: "id" } },
        { name: "reserved_date", type: "DATE", nullable: true },
        { name: "nursery_order_item_id", type: "UUID", nullable: true, fk: { table: "nursery_order_items", column: "id" } },
        { name: "sold_to_client_id", type: "UUID", nullable: true, fk: { table: "clients", column: "id" } },
        { name: "sold_date", type: "DATE", nullable: true },
        { name: "sale_price", type: "NUMERIC(10,2)", nullable: true },
        { name: "block", type: "VARCHAR(50)", nullable: true },
        { name: "row", type: "VARCHAR(50)", nullable: true },
        { name: "position_in_row", type: "INTEGER", nullable: true },
        { name: "coordinates", type: "geometry(Point,4326)", nullable: true },
        { name: "planting_date", type: "DATE", nullable: true },
        { name: "planted_year", type: "INTEGER", nullable: true },
        { name: "planted_by", type: "UUID", nullable: true, fk: { table: "users", column: "id" } },
        { name: "first_harvest_year", type: "INTEGER", nullable: true },
        { name: "expected_production_start", type: "INTEGER", nullable: true },
        { name: "last_inspection_date", type: "DATE", nullable: true },
        { name: "last_inspection_notes", type: "TEXT", nullable: true },
        { name: "display_label", type: "VARCHAR(100)", nullable: true },
        { name: "notes", type: "TEXT", nullable: true },
        { name: "is_active", type: "BOOLEAN", nullable: false, default: "TRUE" },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "created_by", type: "UUID", nullable: true, fk: { table: "users", column: "id" } },
        { name: "updated_by", type: "UUID", nullable: true, fk: { table: "users", column: "id" } }
      ],
      indexes: [
        { name: "idx_trees_tree_number", columns: ["tree_number"] },
        { name: "idx_trees_location_id", columns: ["location_id"] },
        { name: "idx_trees_orchard_block_id", columns: ["orchard_block_id"] },
        { name: "idx_trees_source_batch_id", columns: ["source_batch_id"] },
        { name: "idx_trees_scion_variety_id", columns: ["scion_variety_id"] },
        { name: "idx_trees_rootstock_variety_id", columns: ["rootstock_variety_id"] },
        { name: "idx_trees_stage", columns: ["stage"] },
        { name: "idx_trees_health_status", columns: ["health_status"] },
        { name: "idx_trees_reserved_for_client_id", columns: ["reserved_for_client_id"] },
        { name: "idx_trees_sold_to_client_id", columns: ["sold_to_client_id"] },
        { name: "idx_trees_block_row", columns: ["location_id", "block", "row"] },
        { name: "idx_trees_coordinates", columns: ["coordinates"], type: "GIST" },
        { name: "idx_trees_active", columns: ["is_active"] },
        { name: "idx_trees_planted_year", columns: ["planted_year"] },
        { name: "idx_trees_active_health", columns: ["location_id", "health_status"], where: "is_active = TRUE" }
      ]
    },
    {
      key: "table_work_order_categories",
      type: "table",
      name: "work_order_categories",
      domain: "Work Orders",
      description: "Top-level categories for organizing work types (7 categories: Cultural, Planting, Pest, etc.).",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "name", type: "VARCHAR(100)", nullable: false, unique: true },
        { name: "description", type: "TEXT", nullable: true },
        { name: "color", type: "VARCHAR(20)", nullable: true },
        { name: "icon", type: "VARCHAR(50)", nullable: true },
        { name: "is_active", type: "BOOLEAN", nullable: false, default: "TRUE" },
        { name: "sort_order", type: "INTEGER", nullable: false, default: "0" },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_work_order_categories_active", columns: ["is_active"] },
        { name: "idx_work_order_categories_sort", columns: ["sort_order"] }
      ]
    },
    {
      key: "table_work_order_types",
      type: "table",
      name: "work_order_types",
      domain: "Work Orders",
      description: "User-manageable work order types within categories (42+ types like Pruning, Spraying, Harvesting).",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "category_id", type: "UUID", nullable: true, fk: { table: "work_order_categories", column: "id" } },
        { name: "name", type: "VARCHAR(100)", nullable: false },
        { name: "description", type: "TEXT", nullable: true },
        { name: "color", type: "VARCHAR(20)", nullable: true },
        { name: "icon", type: "VARCHAR(50)", nullable: true },
        { name: "default_hourly_rate", type: "NUMERIC(10,2)", nullable: true },
        { name: "is_active", type: "BOOLEAN", nullable: false, default: "TRUE" },
        { name: "sort_order", type: "INTEGER", nullable: false, default: "0" },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_work_order_types_category", columns: ["category_id"] },
        { name: "idx_work_order_types_active", columns: ["is_active"] },
        { name: "idx_work_order_types_sort", columns: ["sort_order"] }
      ]
    },
    {
      key: "table_work_orders",
      type: "table",
      name: "work_orders",
      domain: "Work Orders",
      description: "Work to be performed at locations, optionally on specific trees. Full approval workflow and time tracking.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "work_order_number", type: "VARCHAR(50)", nullable: false, unique: true },
        { name: "client_id", type: "UUID", nullable: false, fk: { table: "clients", column: "id" } },
        { name: "location_id", type: "UUID", nullable: false, fk: { table: "locations", column: "id" } },
        { name: "work_order_type_id", type: "UUID", nullable: true, fk: { table: "work_order_types", column: "id" } },
        { name: "nursery_order_id", type: "UUID", nullable: true, fk: { table: "nursery_orders", column: "id" } },
        { name: "nursery_batch_id", type: "UUID", nullable: true, fk: { table: "nursery_batches", column: "id" } },
        { name: "tree_ids", type: "UUID[]", nullable: true },
        { name: "title", type: "VARCHAR(200)", nullable: false },
        { name: "description", type: "TEXT", nullable: true },
        { name: "status", type: "work_order_status", nullable: false, default: "'DRAFT'" },
        { name: "priority", type: "work_priority", nullable: false, default: "'NORMAL'" },
        { name: "proposed_by_id", type: "UUID", nullable: true, fk: { table: "users", column: "id" } },
        { name: "proposed_at", type: "TIMESTAMPTZ", nullable: true },
        { name: "approved_by_id", type: "UUID", nullable: true, fk: { table: "users", column: "id" } },
        { name: "approved_at", type: "TIMESTAMPTZ", nullable: true },
        { name: "denied_by_id", type: "UUID", nullable: true, fk: { table: "users", column: "id" } },
        { name: "denied_at", type: "TIMESTAMPTZ", nullable: true },
        { name: "denial_reason", type: "TEXT", nullable: true },
        { name: "scheduled_start", type: "TIMESTAMPTZ", nullable: true },
        { name: "scheduled_end", type: "TIMESTAMPTZ", nullable: true },
        { name: "actual_start", type: "TIMESTAMPTZ", nullable: true },
        { name: "actual_end", type: "TIMESTAMPTZ", nullable: true },
        { name: "assigned_to_id", type: "UUID", nullable: true, fk: { table: "users", column: "id" } },
        { name: "estimated_hours", type: "NUMERIC(8,2)", nullable: true },
        { name: "estimated_cost", type: "NUMERIC(12,2)", nullable: true },
        { name: "actual_hours", type: "NUMERIC(8,2)", nullable: true },
        { name: "actual_labor_cost", type: "NUMERIC(12,2)", nullable: true },
        { name: "actual_billable", type: "NUMERIC(12,2)", nullable: true },
        { name: "completed_by_id", type: "UUID", nullable: true, fk: { table: "users", column: "id" } },
        { name: "completed_at", type: "TIMESTAMPTZ", nullable: true },
        { name: "completion_notes", type: "TEXT", nullable: true },
        { name: "verified_by_id", type: "UUID", nullable: true, fk: { table: "users", column: "id" } },
        { name: "verified_at", type: "TIMESTAMPTZ", nullable: true },
        { name: "notes", type: "TEXT", nullable: true },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "created_by", type: "UUID", nullable: true, fk: { table: "users", column: "id" } },
        { name: "updated_by", type: "UUID", nullable: true, fk: { table: "users", column: "id" } }
      ],
      indexes: [
        { name: "idx_work_orders_client_id", columns: ["client_id"] },
        { name: "idx_work_orders_location_id", columns: ["location_id"] },
        { name: "idx_work_orders_type_id", columns: ["work_order_type_id"] },
        { name: "idx_work_orders_nursery_order", columns: ["nursery_order_id"] },
        { name: "idx_work_orders_status", columns: ["status"] },
        { name: "idx_work_orders_priority", columns: ["priority"] },
        { name: "idx_work_orders_assigned_to", columns: ["assigned_to_id"] },
        { name: "idx_work_orders_scheduled_start", columns: ["scheduled_start"] },
        { name: "idx_work_orders_tree_ids", columns: ["tree_ids"], type: "GIN" }
      ]
    },
    {
      key: "table_time_entries",
      type: "table",
      name: "time_entries",
      domain: "Work Orders",
      description: "Time tracking for work orders with labor cost calculation. Supports PWA offline sync.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "work_order_id", type: "UUID", nullable: false, fk: { table: "work_orders", column: "id", onDelete: "CASCADE" } },
        { name: "user_id", type: "UUID", nullable: false, fk: { table: "users", column: "id" } },
        { name: "start_time", type: "TIMESTAMPTZ", nullable: false },
        { name: "end_time", type: "TIMESTAMPTZ", nullable: true },
        { name: "duration_minutes", type: "INTEGER", nullable: true },
        { name: "break_minutes", type: "INTEGER", nullable: true, default: "0" },
        { name: "hourly_rate", type: "NUMERIC(10,2)", nullable: true },
        { name: "billable_rate", type: "NUMERIC(10,2)", nullable: true },
        { name: "labor_cost", type: "NUMERIC(10,2)", nullable: true },
        { name: "billable_amount", type: "NUMERIC(10,2)", nullable: true },
        { name: "activity_type", type: "VARCHAR(100)", nullable: true },
        { name: "notes", type: "TEXT", nullable: true },
        { name: "device_id", type: "VARCHAR(255)", nullable: true },
        { name: "is_synced", type: "BOOLEAN", nullable: false, default: "TRUE" },
        { name: "sync_timestamp", type: "TIMESTAMPTZ", nullable: true },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_time_entries_work_order_id", columns: ["work_order_id"] },
        { name: "idx_time_entries_user_id", columns: ["user_id"] },
        { name: "idx_time_entries_start_time", columns: ["start_time"] },
        { name: "idx_time_entries_synced", columns: ["is_synced"], where: "is_synced = FALSE" }
      ]
    },
    {
      key: "table_invoices",
      type: "table",
      name: "invoices",
      domain: "Billing",
      description: "Client invoices with payment tracking. Due dates auto-calculated from client payment terms.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "invoice_number", type: "VARCHAR(50)", nullable: false, unique: true },
        { name: "client_id", type: "UUID", nullable: false, fk: { table: "clients", column: "id" } },
        { name: "location_id", type: "UUID", nullable: true, fk: { table: "locations", column: "id" } },
        { name: "invoice_date", type: "DATE", nullable: false },
        { name: "due_date", type: "DATE", nullable: true },
        { name: "status", type: "invoice_status", nullable: false, default: "'DRAFT'" },
        { name: "subtotal", type: "NUMERIC(12,2)", nullable: false, default: "0" },
        { name: "tax_rate", type: "NUMERIC(5,4)", nullable: true, default: "0" },
        { name: "tax_amount", type: "NUMERIC(12,2)", nullable: false, default: "0" },
        { name: "discount_amount", type: "NUMERIC(12,2)", nullable: false, default: "0" },
        { name: "total_amount", type: "NUMERIC(12,2)", nullable: false, default: "0" },
        { name: "paid_amount", type: "NUMERIC(12,2)", nullable: false, default: "0" },
        { name: "balance_due", type: "NUMERIC(12,2)", nullable: false, default: "0" },
        { name: "notes", type: "TEXT", nullable: true },
        { name: "internal_notes", type: "TEXT", nullable: true },
        { name: "terms", type: "TEXT", nullable: true },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "created_by", type: "UUID", nullable: true, fk: { table: "users", column: "id" } },
        { name: "sent_at", type: "TIMESTAMPTZ", nullable: true },
        { name: "sent_by", type: "UUID", nullable: true, fk: { table: "users", column: "id" } }
      ],
      indexes: [
        { name: "idx_invoices_client_id", columns: ["client_id"] },
        { name: "idx_invoices_location_id", columns: ["location_id"] },
        { name: "idx_invoices_status", columns: ["status"] },
        { name: "idx_invoices_invoice_date", columns: ["invoice_date"] },
        { name: "idx_invoices_due_date", columns: ["due_date"] }
      ]
    },
    {
      key: "table_invoice_line_items",
      type: "table",
      name: "invoice_line_items",
      domain: "Billing",
      description: "Individual line items on invoices. Can link to work orders or nursery order items.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "invoice_id", type: "UUID", nullable: false, fk: { table: "invoices", column: "id", onDelete: "CASCADE" } },
        { name: "work_order_id", type: "UUID", nullable: true, fk: { table: "work_orders", column: "id" } },
        { name: "nursery_order_item_id", type: "UUID", nullable: true, fk: { table: "nursery_order_items", column: "id" } },
        { name: "description", type: "TEXT", nullable: false },
        { name: "quantity", type: "NUMERIC(10,2)", nullable: false, default: "1" },
        { name: "unit_price", type: "NUMERIC(12,2)", nullable: false, default: "0" },
        { name: "total_amount", type: "NUMERIC(12,2)", nullable: false, default: "0" },
        { name: "sort_order", type: "INTEGER", nullable: false, default: "0" },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_invoice_line_items_invoice_id", columns: ["invoice_id"] },
        { name: "idx_invoice_line_items_work_order_id", columns: ["work_order_id"] }
      ]
    },
    {
      key: "table_payments",
      type: "table",
      name: "payments",
      domain: "Billing",
      description: "Individual payment records supporting check, ACH, credit card, and cash payments.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "invoice_id", type: "UUID", nullable: false, fk: { table: "invoices", column: "id" } },
        { name: "payment_date", type: "DATE", nullable: false },
        { name: "amount", type: "NUMERIC(12,2)", nullable: false },
        { name: "payment_method", type: "payment_method", nullable: false },
        { name: "check_number", type: "VARCHAR(50)", nullable: true },
        { name: "check_date", type: "DATE", nullable: true },
        { name: "bank_name", type: "VARCHAR(200)", nullable: true },
        { name: "transaction_id", type: "VARCHAR(255)", nullable: true },
        { name: "last_four", type: "VARCHAR(4)", nullable: true },
        { name: "reference_number", type: "VARCHAR(100)", nullable: true },
        { name: "notes", type: "TEXT", nullable: true },
        { name: "received_by", type: "UUID", nullable: true, fk: { table: "users", column: "id" } },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_payments_invoice_id", columns: ["invoice_id"] },
        { name: "idx_payments_payment_date", columns: ["payment_date"] },
        { name: "idx_payments_method", columns: ["payment_method"] }
      ]
    },
    {
      key: "table_inventory_items",
      type: "table",
      name: "inventory_items",
      domain: "Inventory",
      description: "Chemicals, fertilizers, tools, equipment, and supplies with cost and price tracking.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "name", type: "VARCHAR(200)", nullable: false },
        { name: "description", type: "TEXT", nullable: true },
        { name: "category", type: "inventory_category", nullable: false },
        { name: "sku", type: "VARCHAR(100)", nullable: true },
        { name: "quantity", type: "NUMERIC(12,2)", nullable: false, default: "0" },
        { name: "unit", type: "VARCHAR(50)", nullable: false },
        { name: "min_stock_level", type: "NUMERIC(12,2)", nullable: true, default: "0" },
        { name: "cost_per_unit", type: "NUMERIC(12,2)", nullable: true },
        { name: "price_per_unit", type: "NUMERIC(12,2)", nullable: true },
        { name: "markup_percentage", type: "NUMERIC(5,2)", nullable: true },
        { name: "storage_location_id", type: "UUID", nullable: true, fk: { table: "locations", column: "id" } },
        { name: "storage_notes", type: "TEXT", nullable: true },
        { name: "stock_status", type: "stock_status", nullable: false, default: "'IN_STOCK'" },
        { name: "is_equipment", type: "BOOLEAN", nullable: false, default: "FALSE" },
        { name: "last_maintenance_date", type: "DATE", nullable: true },
        { name: "next_maintenance_date", type: "DATE", nullable: true },
        { name: "is_active", type: "BOOLEAN", nullable: false, default: "TRUE" },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_inventory_items_category", columns: ["category"] },
        { name: "idx_inventory_items_stock_status", columns: ["stock_status"] },
        { name: "idx_inventory_items_storage_location", columns: ["storage_location_id"] },
        { name: "idx_inventory_items_active", columns: ["is_active"] },
        { name: "idx_inventory_items_low_stock", columns: ["stock_status"], where: "stock_status IN ('LOW_STOCK', 'OUT_OF_STOCK')" }
      ]
    },
    {
      key: "table_inventory_transactions",
      type: "table",
      name: "inventory_transactions",
      domain: "Inventory",
      description: "Track all inventory movements—purchases, usage, adjustments, transfers, disposals.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "inventory_item_id", type: "UUID", nullable: false, fk: { table: "inventory_items", column: "id" } },
        { name: "transaction_type", type: "inventory_transaction_type", nullable: false },
        { name: "quantity_change", type: "NUMERIC(12,2)", nullable: false },
        { name: "quantity_before", type: "NUMERIC(12,2)", nullable: false },
        { name: "quantity_after", type: "NUMERIC(12,2)", nullable: false },
        { name: "unit_cost", type: "NUMERIC(12,2)", nullable: true },
        { name: "total_cost", type: "NUMERIC(12,2)", nullable: true },
        { name: "work_order_id", type: "UUID", nullable: true, fk: { table: "work_orders", column: "id" } },
        { name: "from_location_id", type: "UUID", nullable: true, fk: { table: "locations", column: "id" } },
        { name: "to_location_id", type: "UUID", nullable: true, fk: { table: "locations", column: "id" } },
        { name: "notes", type: "TEXT", nullable: true },
        { name: "reference_number", type: "VARCHAR(100)", nullable: true },
        { name: "created_by", type: "UUID", nullable: true, fk: { table: "users", column: "id" } },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_inventory_transactions_item_id", columns: ["inventory_item_id"] },
        { name: "idx_inventory_transactions_type", columns: ["transaction_type"] },
        { name: "idx_inventory_transactions_work_order", columns: ["work_order_id"] },
        { name: "idx_inventory_transactions_created_at", columns: ["created_at"] }
      ]
    },
    {
      key: "table_tree_health_records",
      type: "table",
      name: "tree_health_records",
      domain: "Health",
      description: "Individual health observations for specific trees over time with detailed ratings and issues.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "tree_id", type: "UUID", nullable: false, fk: { table: "trees", column: "id", onDelete: "CASCADE" } },
        { name: "observation_date", type: "DATE", nullable: false, default: "CURRENT_DATE" },
        { name: "health_status", type: "health_status", nullable: false },
        { name: "previous_status", type: "health_status", nullable: true },
        { name: "vigor_rating", type: "INTEGER", nullable: true },
        { name: "leaf_condition", type: "INTEGER", nullable: true },
        { name: "fruit_quality", type: "INTEGER", nullable: true },
        { name: "pest_damage_level", type: "INTEGER", nullable: true },
        { name: "disease_severity", type: "INTEGER", nullable: true },
        { name: "issues_observed", type: "TEXT[]", nullable: true },
        { name: "symptoms_description", type: "TEXT", nullable: true },
        { name: "treatment_applied", type: "TEXT", nullable: true },
        { name: "treatment_date", type: "DATE", nullable: true },
        { name: "follow_up_required", type: "BOOLEAN", nullable: false, default: "FALSE" },
        { name: "follow_up_date", type: "DATE", nullable: true },
        { name: "photo_count", type: "INTEGER", nullable: false, default: "0" },
        { name: "work_order_id", type: "UUID", nullable: true, fk: { table: "work_orders", column: "id" } },
        { name: "notes", type: "TEXT", nullable: true },
        { name: "temperature_f", type: "INTEGER", nullable: true },
        { name: "weather_conditions", type: "VARCHAR(100)", nullable: true },
        { name: "recorded_by", type: "UUID", nullable: true, fk: { table: "users", column: "id" } },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_tree_health_records_tree_id", columns: ["tree_id"] },
        { name: "idx_tree_health_records_date", columns: ["observation_date"] },
        { name: "idx_tree_health_records_status", columns: ["health_status"] },
        { name: "idx_tree_health_records_issues", columns: ["issues_observed"], type: "GIN" },
        { name: "idx_tree_health_records_follow_up", columns: ["follow_up_date"], where: "follow_up_required = TRUE" }
      ]
    },
    {
      key: "table_tree_health_alert_rules",
      type: "table",
      name: "tree_health_alert_rules",
      domain: "Health",
      description: "Configurable rules for when to generate health alerts—status changes, thresholds, patterns.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "name", type: "VARCHAR(200)", nullable: false },
        { name: "description", type: "TEXT", nullable: true },
        { name: "is_active", type: "BOOLEAN", nullable: false, default: "TRUE" },
        { name: "location_id", type: "UUID", nullable: true, fk: { table: "locations", column: "id" } },
        { name: "trigger_type", type: "VARCHAR(50)", nullable: false },
        { name: "from_status", type: "health_status", nullable: true },
        { name: "to_status", type: "health_status", nullable: true },
        { name: "threshold_metric", type: "VARCHAR(50)", nullable: true },
        { name: "threshold_operator", type: "VARCHAR(10)", nullable: true },
        { name: "threshold_value", type: "NUMERIC(10,2)", nullable: true },
        { name: "pattern_description", type: "TEXT", nullable: true },
        { name: "min_occurrences", type: "INTEGER", nullable: true },
        { name: "time_window_days", type: "INTEGER", nullable: true },
        { name: "proximity_meters", type: "INTEGER", nullable: true },
        { name: "alert_priority", type: "notification_priority", nullable: false, default: "'NORMAL'" },
        { name: "alert_title_template", type: "VARCHAR(200)", nullable: true },
        { name: "alert_message_template", type: "TEXT", nullable: true },
        { name: "notify_roles", type: "user_role[]", nullable: true },
        { name: "notify_user_ids", type: "UUID[]", nullable: true },
        { name: "notify_client", type: "BOOLEAN", nullable: false, default: "FALSE" },
        { name: "delivery_method", type: "notification_delivery", nullable: false, default: "'BOTH'" },
        { name: "cooldown_hours", type: "INTEGER", nullable: true, default: "24" },
        { name: "created_by", type: "UUID", nullable: true, fk: { table: "users", column: "id" } },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "updated_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_tree_health_alert_rules_active", columns: ["is_active"], where: "is_active = TRUE" },
        { name: "idx_tree_health_alert_rules_location", columns: ["location_id"] }
      ]
    },
    {
      key: "table_tree_health_alerts",
      type: "table",
      name: "tree_health_alerts",
      domain: "Health",
      description: "Generated alerts based on alert rules. Tracks acknowledgment and resolution workflow.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "alert_rule_id", type: "UUID", nullable: true, fk: { table: "tree_health_alert_rules", column: "id" } },
        { name: "tree_id", type: "UUID", nullable: true, fk: { table: "trees", column: "id" } },
        { name: "tree_health_record_id", type: "UUID", nullable: true, fk: { table: "tree_health_records", column: "id" } },
        { name: "location_id", type: "UUID", nullable: true, fk: { table: "locations", column: "id" } },
        { name: "alert_priority", type: "notification_priority", nullable: false },
        { name: "title", type: "VARCHAR(200)", nullable: false },
        { name: "message", type: "TEXT", nullable: false },
        { name: "trigger_data", type: "JSONB", nullable: true },
        { name: "status", type: "VARCHAR(50)", nullable: false, default: "'OPEN'" },
        { name: "acknowledged_by", type: "UUID", nullable: true, fk: { table: "users", column: "id" } },
        { name: "acknowledged_at", type: "TIMESTAMPTZ", nullable: true },
        { name: "acknowledgment_notes", type: "TEXT", nullable: true },
        { name: "resolved_by", type: "UUID", nullable: true, fk: { table: "users", column: "id" } },
        { name: "resolved_at", type: "TIMESTAMPTZ", nullable: true },
        { name: "resolution_notes", type: "TEXT", nullable: true },
        { name: "resolution_work_order_id", type: "UUID", nullable: true, fk: { table: "work_orders", column: "id" } },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_tree_health_alerts_tree_id", columns: ["tree_id"] },
        { name: "idx_tree_health_alerts_location_id", columns: ["location_id"] },
        { name: "idx_tree_health_alerts_status", columns: ["status"] },
        { name: "idx_tree_health_alerts_priority", columns: ["alert_priority"] },
        { name: "idx_tree_health_alerts_open", columns: ["status"], where: "status = 'OPEN'" },
        { name: "idx_tree_health_alerts_created", columns: ["created_at"] }
      ]
    },
    {
      key: "table_tree_health_snapshots",
      type: "table",
      name: "tree_health_snapshots",
      domain: "Health",
      description: "Periodic snapshots of tree health for trend reporting. Supports historical data imports.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "snapshot_date", type: "DATE", nullable: false },
        { name: "location_id", type: "UUID", nullable: true, fk: { table: "locations", column: "id" } },
        { name: "healthy_count", type: "INTEGER", nullable: false, default: "0" },
        { name: "attention_count", type: "INTEGER", nullable: false, default: "0" },
        { name: "diseased_count", type: "INTEGER", nullable: false, default: "0" },
        { name: "dead_count", type: "INTEGER", nullable: false, default: "0" },
        { name: "removed_count", type: "INTEGER", nullable: false, default: "0" },
        { name: "total_count", type: "INTEGER", nullable: false, default: "0" },
        { name: "health_score", type: "NUMERIC(5,2)", nullable: true },
        { name: "is_historical", type: "BOOLEAN", nullable: false, default: "FALSE" },
        { name: "source_notes", type: "TEXT", nullable: true },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" },
        { name: "created_by", type: "UUID", nullable: true, fk: { table: "users", column: "id" } }
      ],
      indexes: [
        { name: "idx_tree_health_snapshots_date", columns: ["snapshot_date"] },
        { name: "idx_tree_health_snapshots_location", columns: ["location_id"] }
      ]
    },
    {
      key: "table_notifications",
      type: "table",
      name: "notifications",
      domain: "System",
      description: "System notifications with in-app and email delivery. Tracks read status and delivery errors.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "user_id", type: "UUID", nullable: false, fk: { table: "users", column: "id", onDelete: "CASCADE" } },
        { name: "notification_type", type: "notification_type", nullable: false },
        { name: "priority", type: "notification_priority", nullable: false, default: "'NORMAL'" },
        { name: "title", type: "VARCHAR(200)", nullable: false },
        { name: "message", type: "TEXT", nullable: false },
        { name: "entity_type", type: "VARCHAR(50)", nullable: true },
        { name: "entity_id", type: "UUID", nullable: true },
        { name: "delivery_method", type: "notification_delivery", nullable: false, default: "'BOTH'" },
        { name: "is_read", type: "BOOLEAN", nullable: false, default: "FALSE" },
        { name: "read_at", type: "TIMESTAMPTZ", nullable: true },
        { name: "email_sent", type: "BOOLEAN", nullable: false, default: "FALSE" },
        { name: "email_sent_at", type: "TIMESTAMPTZ", nullable: true },
        { name: "email_error", type: "TEXT", nullable: true },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_notifications_user_id", columns: ["user_id"] },
        { name: "idx_notifications_unread", columns: ["user_id", "is_read"], where: "is_read = FALSE" },
        { name: "idx_notifications_type", columns: ["notification_type"] },
        { name: "idx_notifications_created_at", columns: ["created_at"] },
        { name: "idx_notifications_email_pending", columns: ["email_sent"], where: "email_sent = FALSE AND delivery_method IN ('EMAIL', 'BOTH')" }
      ]
    },
    {
      key: "table_photos",
      type: "table",
      name: "photos",
      domain: "System",
      description: "Photos attached to any entity (tree, location, work order, etc.) with client-side compression tracking.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "context_type", type: "photo_context", nullable: false },
        { name: "context_id", type: "UUID", nullable: false },
        { name: "file_path", type: "TEXT", nullable: false },
        { name: "file_name", type: "VARCHAR(255)", nullable: true },
        { name: "mime_type", type: "VARCHAR(100)", nullable: true },
        { name: "original_size", type: "BIGINT", nullable: true },
        { name: "compressed_size", type: "BIGINT", nullable: true },
        { name: "caption", type: "TEXT", nullable: true },
        { name: "taken_at", type: "TIMESTAMPTZ", nullable: true },
        { name: "latitude", type: "NUMERIC(10,7)", nullable: true },
        { name: "longitude", type: "NUMERIC(10,7)", nullable: true },
        { name: "created_by", type: "UUID", nullable: true, fk: { table: "users", column: "id" } },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_photos_context", columns: ["context_type", "context_id"] },
        { name: "idx_photos_created_by", columns: ["created_by"] }
      ]
    },
    {
      key: "table_audit_log",
      type: "table",
      name: "audit_log",
      domain: "System",
      description: "Complete audit trail of every change to every entity. Stores before/after snapshots as JSONB.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "entity_type", type: "VARCHAR(50)", nullable: false },
        { name: "entity_id", type: "UUID", nullable: false },
        { name: "user_id", type: "UUID", nullable: true, fk: { table: "users", column: "id" } },
        { name: "action", type: "VARCHAR(50)", nullable: false },
        { name: "old_values", type: "JSONB", nullable: true },
        { name: "new_values", type: "JSONB", nullable: true },
        { name: "changed_fields", type: "TEXT[]", nullable: true },
        { name: "ip_address", type: "INET", nullable: true },
        { name: "user_agent", type: "TEXT", nullable: true },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_audit_log_entity", columns: ["entity_type", "entity_id"] },
        { name: "idx_audit_log_user_id", columns: ["user_id"] },
        { name: "idx_audit_log_created_at", columns: ["created_at"] },
        { name: "idx_audit_log_action", columns: ["action"] },
        { name: "idx_audit_log_changed_fields", columns: ["changed_fields"], type: "GIN" }
      ]
    },
    {
      key: "table_refresh_tokens",
      type: "table",
      name: "refresh_tokens",
      domain: "System",
      description: "JWT refresh token storage for authentication. Supports revocation and device tracking.",
      columns: [
        { name: "id", type: "UUID", nullable: false, default: "uuid_generate_v4()", pk: true },
        { name: "user_id", type: "UUID", nullable: false, fk: { table: "users", column: "id", onDelete: "CASCADE" } },
        { name: "token", type: "TEXT", nullable: false },
        { name: "expires_at", type: "TIMESTAMPTZ", nullable: false },
        { name: "is_revoked", type: "BOOLEAN", nullable: false, default: "FALSE" },
        { name: "revoked_at", type: "TIMESTAMPTZ", nullable: true },
        { name: "revoked_by", type: "UUID", nullable: true, fk: { table: "users", column: "id" } },
        { name: "device_info", type: "TEXT", nullable: true },
        { name: "ip_address", type: "INET", nullable: true },
        { name: "created_at", type: "TIMESTAMPTZ", nullable: false, default: "NOW()" }
      ],
      indexes: [
        { name: "idx_refresh_tokens_user_id", columns: ["user_id"] },
        { name: "idx_refresh_tokens_token", columns: ["token"] },
        { name: "idx_refresh_tokens_expires_at", columns: ["expires_at"] }
      ]
    },

    // =========================================================================
    // ENUMS (17)
    // =========================================================================
    {
      key: "enum_user_role",
      type: "enum",
      name: "user_role",
      domain: "Core",
      description: "User roles with hierarchical permissions from admin to client portal users.",
      values: ["ADMIN", "MANAGER", "WORKER", "CLIENT"]
    },
    {
      key: "enum_location_type",
      type: "enum",
      name: "location_type",
      domain: "Location",
      description: "Types of physical locations in the system.",
      values: ["ORCHARD", "NURSERY", "FARM", "GREENHOUSE", "STORAGE", "OTHER"]
    },
    {
      key: "enum_nursery_batch_status",
      type: "enum",
      name: "nursery_batch_status",
      domain: "Nursery",
      description: "Nursery batch lifecycle from planning through completion.",
      values: ["PLANNED", "GRAFTED", "HEALING", "LINED_OUT", "READY_TO_DIG", "COMPLETED", "CANCELLED"]
    },
    {
      key: "enum_nursery_order_status",
      type: "enum",
      name: "nursery_order_status",
      domain: "Nursery",
      description: "Nursery order status from quote through delivery.",
      values: ["QUOTE", "PENDING", "CONFIRMED", "IN_PROGRESS", "READY", "PARTIALLY_SHIPPED", "COMPLETED", "CANCELLED"]
    },
    {
      key: "enum_tree_stage",
      type: "enum",
      name: "tree_stage",
      domain: "Tree",
      description: "Tree lifecycle stages from nursery through orchard maturity or removal.",
      values: ["NURSERY_FIELD", "RESERVED", "READY_TO_SHIP", "ORCHARD_PLANTED", "ORCHARD_MATURE", "REMOVED", "DEAD", "SOLD_OFFSITE"]
    },
    {
      key: "enum_health_status",
      type: "enum",
      name: "health_status",
      domain: "Health",
      description: "Tree health status for map display and monitoring.",
      values: ["HEALTHY", "ATTENTION", "DISEASED", "DEAD", "REMOVED"]
    },
    {
      key: "enum_work_order_status",
      type: "enum",
      name: "work_order_status",
      domain: "Work Orders",
      description: "Work order lifecycle with approval workflow.",
      values: ["DRAFT", "PROPOSED", "CLIENT_REVIEW", "APPROVED", "DENIED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "VERIFIED", "INVOICED", "CANCELLED"]
    },
    {
      key: "enum_work_priority",
      type: "enum",
      name: "work_priority",
      domain: "Work Orders",
      description: "Work order priority levels.",
      values: ["LOW", "NORMAL", "HIGH", "URGENT"]
    },
    {
      key: "enum_invoice_status",
      type: "enum",
      name: "invoice_status",
      domain: "Billing",
      description: "Invoice status for payment tracking.",
      values: ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "VOID"]
    },
    {
      key: "enum_payment_method",
      type: "enum",
      name: "payment_method",
      domain: "Billing",
      description: "Supported payment methods.",
      values: ["CHECK", "ACH", "CREDIT_CARD", "CASH", "WIRE", "OTHER"]
    },
    {
      key: "enum_photo_context",
      type: "enum",
      name: "photo_context",
      domain: "System",
      description: "Entity types that can have photos attached.",
      values: ["TREE", "LOCATION", "WORK_ORDER", "NURSERY_BATCH", "CLIENT", "INVENTORY_ITEM"]
    },
    {
      key: "enum_inventory_category",
      type: "enum",
      name: "inventory_category",
      domain: "Inventory",
      description: "Categories for inventory items.",
      values: ["CHEMICAL", "FERTILIZER", "TOOL", "EQUIPMENT", "SUPPLY", "OTHER"]
    },
    {
      key: "enum_stock_status",
      type: "enum",
      name: "stock_status",
      domain: "Inventory",
      description: "Inventory stock levels auto-calculated from quantity vs min_stock_level.",
      values: ["IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]
    },
    {
      key: "enum_inventory_transaction_type",
      type: "enum",
      name: "inventory_transaction_type",
      domain: "Inventory",
      description: "Types of inventory movements.",
      values: ["PURCHASE", "USAGE", "ADJUSTMENT", "TRANSFER", "DISPOSAL"]
    },
    {
      key: "enum_notification_type",
      type: "enum",
      name: "notification_type",
      domain: "System",
      description: "Types of system notifications.",
      values: ["WORK_ORDER_CREATED", "WORK_ORDER_APPROVED", "WORK_ORDER_COMPLETED", "WORK_ORDER_ASSIGNED", "NURSERY_ORDER_CREATED", "NURSERY_ORDER_READY", "LOW_STOCK_ALERT", "TREE_HEALTH_ALERT", "INVOICE_CREATED", "INVOICE_OVERDUE", "PAYMENT_RECEIVED", "SYSTEM"]
    },
    {
      key: "enum_notification_priority",
      type: "enum",
      name: "notification_priority",
      domain: "System",
      description: "Notification priority levels.",
      values: ["LOW", "NORMAL", "HIGH", "URGENT"]
    },
    {
      key: "enum_notification_delivery",
      type: "enum",
      name: "notification_delivery",
      domain: "System",
      description: "Notification delivery methods.",
      values: ["IN_APP", "EMAIL", "BOTH"]
    },

    // =========================================================================
    // VIEWS (15)
    // =========================================================================
    {
      key: "view_v_nursery_batch_summary",
      type: "view",
      name: "v_nursery_batch_summary",
      domain: "Nursery",
      description: "Nursery batch summary with computed successful_quantity from tree counts.",
      baseTables: ["nursery_batches", "varieties", "clients", "trees"]
    },
    {
      key: "view_v_location_tree_counts",
      type: "view",
      name: "v_location_tree_counts",
      domain: "Location",
      description: "Tree count by location with health breakdown and health score percentage.",
      baseTables: ["locations", "clients", "trees"]
    },
    {
      key: "view_v_inventory_low_stock",
      type: "view",
      name: "v_inventory_low_stock",
      domain: "Inventory",
      description: "Active inventory items at or below minimum stock level.",
      baseTables: ["inventory_items", "locations"]
    },
    {
      key: "view_v_inventory_summary",
      type: "view",
      name: "v_inventory_summary",
      domain: "Inventory",
      description: "Inventory summary by category with counts, values, and stock status breakdown.",
      baseTables: ["inventory_items"]
    },
    {
      key: "view_v_work_order_metrics",
      type: "view",
      name: "v_work_order_metrics",
      domain: "Work Orders",
      description: "Work order metrics aggregated by week—created, completed, overdue, labor costs.",
      baseTables: ["work_orders"]
    },
    {
      key: "view_v_monthly_labor_costs",
      type: "view",
      name: "v_monthly_labor_costs",
      domain: "Work Orders",
      description: "Monthly labor cost analysis by client with hours, costs, and gross margin.",
      baseTables: ["time_entries", "work_orders", "clients"]
    },
    {
      key: "view_v_nursery_order_summary",
      type: "view",
      name: "v_nursery_order_summary",
      domain: "Nursery",
      description: "Nursery order summary with client info and tree quantity totals.",
      baseTables: ["nursery_orders", "clients", "nursery_order_items"]
    },
    {
      key: "view_v_payroll_weekly",
      type: "view",
      name: "v_payroll_weekly",
      domain: "Work Orders",
      description: "Weekly payroll summary with hours, pay rates, tax estimates (Missouri 2025), and net pay.",
      baseTables: ["users", "time_entries"]
    },
    {
      key: "view_v_payroll_biweekly",
      type: "view",
      name: "v_payroll_biweekly",
      domain: "Work Orders",
      description: "Biweekly payroll summary with 80-hour regular time and overtime calculations.",
      baseTables: ["users", "time_entries"]
    },
    {
      key: "view_v_payroll_daily_detail",
      type: "view",
      name: "v_payroll_daily_detail",
      domain: "Work Orders",
      description: "Daily payroll breakdown showing clock times, hours, and jobs worked.",
      baseTables: ["users", "time_entries", "work_orders"]
    },
    {
      key: "view_v_nursery_pipeline",
      type: "view",
      name: "v_nursery_pipeline",
      domain: "Nursery",
      description: "Nursery pipeline tracking orders through production with tree counts by stage.",
      baseTables: ["nursery_orders", "clients", "nursery_order_items", "varieties", "locations", "nursery_batches", "trees"]
    },
    {
      key: "view_v_tree_health_history",
      type: "view",
      name: "v_tree_health_history",
      domain: "Health",
      description: "Complete observation history per tree with variety info and status change flags.",
      baseTables: ["tree_health_records", "trees", "locations", "varieties", "fruit_species", "users"]
    },
    {
      key: "view_v_trees_requiring_followup",
      type: "view",
      name: "v_trees_requiring_followup",
      domain: "Health",
      description: "Trees with follow-up dates due, sorted by urgency (overdue, today, this week, upcoming).",
      baseTables: ["trees", "locations", "clients", "tree_health_records"]
    },
    {
      key: "view_v_open_health_alerts",
      type: "view",
      name: "v_open_health_alerts",
      domain: "Health",
      description: "Dashboard of unresolved health alerts with priority and hours open.",
      baseTables: ["tree_health_alerts", "trees", "locations", "clients", "tree_health_alert_rules"]
    },
    {
      key: "view_v_health_trends_weekly",
      type: "view",
      name: "v_health_trends_weekly",
      domain: "Health",
      description: "Weekly health trends by location with status breakdown and average ratings.",
      baseTables: ["tree_health_records", "trees", "locations"]
    },

    // =========================================================================
    // FUNCTIONS (9)
    // =========================================================================
    {
      key: "function_update_updated_at",
      type: "function",
      name: "update_updated_at",
      domain: "System",
      description: "Trigger function that auto-updates the updated_at timestamp on row modification.",
      returnType: "TRIGGER",
      language: "plpgsql"
    },
    {
      key: "function_calculate_time_entry",
      type: "function",
      name: "calculate_time_entry",
      domain: "Work Orders",
      description: "Calculates duration_minutes, labor_cost, and billable_amount from time entry data.",
      returnType: "TRIGGER",
      language: "plpgsql"
    },
    {
      key: "function_update_inventory_stock_status",
      type: "function",
      name: "update_inventory_stock_status",
      domain: "Inventory",
      description: "Auto-updates stock_status based on quantity vs min_stock_level.",
      returnType: "TRIGGER",
      language: "plpgsql"
    },
    {
      key: "function_update_invoice_balance",
      type: "function",
      name: "update_invoice_balance",
      domain: "Billing",
      description: "Computes balance_due as total_amount minus paid_amount.",
      returnType: "TRIGGER",
      language: "plpgsql"
    },
    {
      key: "function_set_invoice_due_date",
      type: "function",
      name: "set_invoice_due_date",
      domain: "Billing",
      description: "Auto-sets invoice due_date from client payment_terms on insert.",
      returnType: "TRIGGER",
      language: "plpgsql"
    },
    {
      key: "function_sync_tree_health_from_record",
      type: "function",
      name: "sync_tree_health_from_record",
      domain: "Health",
      description: "Syncs tree health_status and inspection date when health record is created. Captures previous_status.",
      returnType: "TRIGGER",
      language: "plpgsql"
    },
    {
      key: "function_check_health_alert_rules",
      type: "function",
      name: "check_health_alert_rules",
      domain: "Health",
      description: "Evaluates alert rules after health record insert, creates alerts if conditions met.",
      returnType: "TRIGGER",
      language: "plpgsql"
    },
    {
      key: "function_generate_tree_number",
      type: "function",
      name: "generate_tree_number",
      domain: "Tree",
      description: "Generates unique tree numbers in format A-HON-0001 (species-variety-sequence).",
      returnType: "VARCHAR(50)",
      language: "plpgsql"
    },
    {
      key: "function_generate_document_number",
      type: "function",
      name: "generate_document_number",
      domain: "System",
      description: "Generates document numbers like WO-2025-0001, INV-2025-0001 using sequences.",
      returnType: "VARCHAR(50)",
      language: "plpgsql"
    },

    // =========================================================================
    // TRIGGERS (23)
    // =========================================================================
    {
      key: "trigger_trg_clients_updated_at",
      type: "trigger",
      name: "trg_clients_updated_at",
      domain: "Core",
      description: "Updates clients.updated_at on modification.",
      table: "clients",
      function: "update_updated_at",
      timing: "BEFORE UPDATE"
    },
    {
      key: "trigger_trg_users_updated_at",
      type: "trigger",
      name: "trg_users_updated_at",
      domain: "Core",
      description: "Updates users.updated_at on modification.",
      table: "users",
      function: "update_updated_at",
      timing: "BEFORE UPDATE"
    },
    {
      key: "trigger_trg_locations_updated_at",
      type: "trigger",
      name: "trg_locations_updated_at",
      domain: "Location",
      description: "Updates locations.updated_at on modification.",
      table: "locations",
      function: "update_updated_at",
      timing: "BEFORE UPDATE"
    },
    {
      key: "trigger_trg_fruit_species_updated_at",
      type: "trigger",
      name: "trg_fruit_species_updated_at",
      domain: "Variety",
      description: "Updates fruit_species.updated_at on modification.",
      table: "fruit_species",
      function: "update_updated_at",
      timing: "BEFORE UPDATE"
    },
    {
      key: "trigger_trg_varieties_updated_at",
      type: "trigger",
      name: "trg_varieties_updated_at",
      domain: "Variety",
      description: "Updates varieties.updated_at on modification.",
      table: "varieties",
      function: "update_updated_at",
      timing: "BEFORE UPDATE"
    },
    {
      key: "trigger_trg_nursery_orders_updated_at",
      type: "trigger",
      name: "trg_nursery_orders_updated_at",
      domain: "Nursery",
      description: "Updates nursery_orders.updated_at on modification.",
      table: "nursery_orders",
      function: "update_updated_at",
      timing: "BEFORE UPDATE"
    },
    {
      key: "trigger_trg_nursery_batches_updated_at",
      type: "trigger",
      name: "trg_nursery_batches_updated_at",
      domain: "Nursery",
      description: "Updates nursery_batches.updated_at on modification.",
      table: "nursery_batches",
      function: "update_updated_at",
      timing: "BEFORE UPDATE"
    },
    {
      key: "trigger_trg_trees_updated_at",
      type: "trigger",
      name: "trg_trees_updated_at",
      domain: "Tree",
      description: "Updates trees.updated_at on modification.",
      table: "trees",
      function: "update_updated_at",
      timing: "BEFORE UPDATE"
    },
    {
      key: "trigger_trg_work_order_categories_updated_at",
      type: "trigger",
      name: "trg_work_order_categories_updated_at",
      domain: "Work Orders",
      description: "Updates work_order_categories.updated_at on modification.",
      table: "work_order_categories",
      function: "update_updated_at",
      timing: "BEFORE UPDATE"
    },
    {
      key: "trigger_trg_work_order_types_updated_at",
      type: "trigger",
      name: "trg_work_order_types_updated_at",
      domain: "Work Orders",
      description: "Updates work_order_types.updated_at on modification.",
      table: "work_order_types",
      function: "update_updated_at",
      timing: "BEFORE UPDATE"
    },
    {
      key: "trigger_trg_work_orders_updated_at",
      type: "trigger",
      name: "trg_work_orders_updated_at",
      domain: "Work Orders",
      description: "Updates work_orders.updated_at on modification.",
      table: "work_orders",
      function: "update_updated_at",
      timing: "BEFORE UPDATE"
    },
    {
      key: "trigger_trg_time_entries_updated_at",
      type: "trigger",
      name: "trg_time_entries_updated_at",
      domain: "Work Orders",
      description: "Updates time_entries.updated_at on modification.",
      table: "time_entries",
      function: "update_updated_at",
      timing: "BEFORE UPDATE"
    },
    {
      key: "trigger_trg_invoices_updated_at",
      type: "trigger",
      name: "trg_invoices_updated_at",
      domain: "Billing",
      description: "Updates invoices.updated_at on modification.",
      table: "invoices",
      function: "update_updated_at",
      timing: "BEFORE UPDATE"
    },
    {
      key: "trigger_trg_payments_updated_at",
      type: "trigger",
      name: "trg_payments_updated_at",
      domain: "Billing",
      description: "Updates payments.updated_at on modification.",
      table: "payments",
      function: "update_updated_at",
      timing: "BEFORE UPDATE"
    },
    {
      key: "trigger_trg_inventory_items_updated_at",
      type: "trigger",
      name: "trg_inventory_items_updated_at",
      domain: "Inventory",
      description: "Updates inventory_items.updated_at on modification.",
      table: "inventory_items",
      function: "update_updated_at",
      timing: "BEFORE UPDATE"
    },
    {
      key: "trigger_trg_time_entries_calculate",
      type: "trigger",
      name: "trg_time_entries_calculate",
      domain: "Work Orders",
      description: "Calculates duration, labor_cost, and billable_amount on time entry insert/update.",
      table: "time_entries",
      function: "calculate_time_entry",
      timing: "BEFORE INSERT OR UPDATE"
    },
    {
      key: "trigger_trg_inventory_stock_status",
      type: "trigger",
      name: "trg_inventory_stock_status",
      domain: "Inventory",
      description: "Auto-updates stock_status based on quantity vs min_stock_level.",
      table: "inventory_items",
      function: "update_inventory_stock_status",
      timing: "BEFORE INSERT OR UPDATE"
    },
    {
      key: "trigger_trg_invoice_balance",
      type: "trigger",
      name: "trg_invoice_balance",
      domain: "Billing",
      description: "Computes balance_due on invoice changes.",
      table: "invoices",
      function: "update_invoice_balance",
      timing: "BEFORE INSERT OR UPDATE"
    },
    {
      key: "trigger_trg_invoice_due_date",
      type: "trigger",
      name: "trg_invoice_due_date",
      domain: "Billing",
      description: "Sets due_date from client payment_terms on new invoices.",
      table: "invoices",
      function: "set_invoice_due_date",
      timing: "BEFORE INSERT"
    },
    {
      key: "trigger_trg_tree_health_records_updated_at",
      type: "trigger",
      name: "trg_tree_health_records_updated_at",
      domain: "Health",
      description: "Updates tree_health_records.updated_at on modification.",
      table: "tree_health_records",
      function: "update_updated_at",
      timing: "BEFORE UPDATE"
    },
    {
      key: "trigger_trg_tree_health_alert_rules_updated_at",
      type: "trigger",
      name: "trg_tree_health_alert_rules_updated_at",
      domain: "Health",
      description: "Updates tree_health_alert_rules.updated_at on modification.",
      table: "tree_health_alert_rules",
      function: "update_updated_at",
      timing: "BEFORE UPDATE"
    },
    {
      key: "trigger_trg_tree_health_sync",
      type: "trigger",
      name: "trg_tree_health_sync",
      domain: "Health",
      description: "Syncs tree health_status when health record created. Captures previous_status.",
      table: "tree_health_records",
      function: "sync_tree_health_from_record",
      timing: "BEFORE INSERT"
    },
    {
      key: "trigger_trg_tree_health_check_alerts",
      type: "trigger",
      name: "trg_tree_health_check_alerts",
      domain: "Health",
      description: "Evaluates alert rules after health record insert, creates alerts if triggered.",
      table: "tree_health_records",
      function: "check_health_alert_rules",
      timing: "AFTER INSERT"
    }
  ]
};
