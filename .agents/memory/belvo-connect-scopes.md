---
name: Belvo Connect widget token scopes
description: Valid scopes for POST /api/token/ when issuing a Connect widget access token
---

Valid scopes for the Belvo widget-token endpoint (`POST /api/token/`):
```
read_institutions,write_links,read_links
```

**Why:** `read_accounts` looks like a sensible scope but returns HTTP 400 `{"code":"invalid"}` from both sandbox and production. Belvo does not expose `read_accounts` as a widget-token scope — account data is fetched server-side after the link is created.

**How to apply:** Any time the widget-token endpoint is updated, keep scopes to these three only.
