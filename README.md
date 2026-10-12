# Frontend

This folder contains the application's Thymeleaf templates and static styles:

- `src/main/resources/templates/` — server-rendered pages and shared layouts.
- `src/main/resources/static/` — stylesheets and other browser assets.

The UI is rendered by the Spring Boot backend and is not a standalone application. The backend repository includes a copy of these templates and assets so it can run independently; keep the two copies in sync when changing the UI.
