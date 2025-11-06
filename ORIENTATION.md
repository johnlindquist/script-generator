# Orientation Guide: Script Generator

Welcome to the Script Generator project! This guide provides a high-level overview of the application's architecture, features, and data flow.

## 1. High-Level Architecture

The application is a full-stack Next.js project that leverages server-side rendering, API routes, and a PostgreSQL database via Prisma. For AI-powered script generation, it integrates with an external AI model through the Vercel AI Gateway.

![Architecture Diagram](orientation-diagrams/1-architecture.png)

-   **Next.js Frontend**: The user-facing application built with React and TypeScript.
-   **Next.js Backend API**: Handles business logic, database interactions, and communication with external services.
-   **Prisma ORM**: Facilitates database access and management.
-   **PostgreSQL Database**: The primary data store for users, scripts, and related information.
-   **Vercel AI Gateway**: Manages and proxies requests to the AI model for script generation.
-   **External AI Model**: The AI service that generates scripts based on user prompts.

---

## 2. User Authentication

Authentication is handled by NextAuth.js, using GitHub as the primary OAuth provider. This allows users to sign in with their GitHub accounts securely.

![Authentication Flow](orientation-diagrams/2-auth-flow.png)

The flow is as follows:
1.  The user initiates the sign-in process.
2.  The application redirects the user to GitHub for authorization.
3.  Upon successful login and authorization, GitHub redirects the user back to the application.
4.  NextAuth.js completes the authentication process, creating a user session and storing user data in the database.

---

## 3. AI Script Generation

The core feature of the application is its ability to generate TypeScript scripts from natural language prompts. This process is managed by the AI Gateway API endpoint.

![Script Generation Flow](orientation-diagrams/3-generation-flow.png)

The process unfolds as follows:
1.  A user submits a prompt through the client-side interface.
2.  A request is sent to the `/api/generate-ai-gateway` endpoint.
3.  The API checks and updates the user's daily usage limit.
4.  The prompt is forwarded to the Vercel AI Gateway, which streams the response from the AI model.
5.  The response is streamed back to the client, providing a real-time display of the generated script.

---

## 4. Database Schema

The application's data is modeled using Prisma. The schema defines the structure and relationships between users, scripts, and their interactions.

![Database Schema](orientation-diagrams/4-database-schema.png)

Key models include:
-   **User**: Stores user profile information.
-   **Script**: Contains the generated script content, title, and owner.
-   **Favorite**, **Verification**, **Install**: Track user interactions with scripts.
-   **GithubSponsor**: Represents a user's sponsorship status.

---

## 5. API Routes

The backend is built around a set of RESTful API routes that handle various functionalities, from data retrieval to script management.

![API Routes](orientation-diagrams/5-api-routes.png)

This diagram illustrates the primary API endpoints and their roles within the application.

---

This guide should provide a solid foundation for understanding the project. For more in-depth information, you can explore the codebase, starting with the `app/` and `lib/` directories.
