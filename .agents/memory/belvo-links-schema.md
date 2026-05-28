---
name: belvo_links table schema
description: How the belvo_links table is structured and how to insert/query
---

Columns (as of May 28 2026):
- `id` INTEGER PK
- `user_id` INTEGER FK → users.id  (**not** telefono — always look up user_id first)
- `link_id` TEXT (Belvo's link UUID)
- `institution` TEXT
- `institution_name` TEXT (added May 28; DEFAULT '')
- `account_verified` BOOLEAN
- `kyc_verified` BOOLEAN
- `kyc_name` TEXT
- `kyc_document_id` TEXT
- `created_at` TIMESTAMP
- `deleted_at` TIMESTAMP (soft-delete pattern — NULL = active)

**Why:** The table was built alongside BankLink.tsx (the DD enrollment flow) which resolves users by ID, not phone. The Belvo Connect routes must do `SELECT id FROM users WHERE telefono = $1` before any insert or query.

**How to apply:** Any new route touching belvo_links must call `getUserId(telefono)` first. Use `deleted_at IS NULL` to filter active links. Soft-delete old links before inserting a new one (one active link per user).
