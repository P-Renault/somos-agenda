# Agenda Ya UI Framework v1.0 — Integration Layer

Base: cumulative functional project at commit c716a0e...

This package is an OVERLAY, not a replacement project.

Files:
- agenda-ya-ui.css
- agenda-ya-ui.js
- agenda-ya-logo.svg
- README

Integration into the cumulative project:
1. Keep existing index.html, app.js, config.js, styles.css and all current modules.
2. Add:
   <link rel="stylesheet" href="agenda-ya-ui.css">
   before </head>.
3. Add:
   <script src="agenda-ya-ui.js"></script>
   after app.js.
4. Keep agenda-ya-logo.svg in the repository root.
5. Do not remove existing Supabase/app files.

The layer waits for dashboardView to become visible, so the login/onboarding flow remains under the existing application controller.

Current integration scope:
- Global Agenda Ya header
- Desktop navigation
- Sidebar
- Mobile navigation rail
- Responsive dashboard
- Navigation between existing module sections without replacing the dashboard shell
- Public profile navigation hook
- Settings event hook
- agendaYa:view-change event

No Supabase queries, CRUD, auth, RLS, or business rules are changed.
