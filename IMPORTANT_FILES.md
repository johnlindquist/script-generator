### Key Files for Understanding the Application

This is not an exhaustive list, but understanding these files will give you a strong foundation for the project's architecture and logic.

| File Path | Description |
| :--- | :--- |
| **Core Application** | |
| `app/layout.tsx` | The root layout for the entire application. It sets up the main HTML structure, includes global styles, and wraps the content with the NextAuth.js session provider. |
| `app/page.tsx` | The homepage of the application. It's responsible for rendering the main script generation interface (`ScriptGenerationClient`) and the grid of existing scripts. |
| **Authentication** | |
| `app/api/auth/[...nextauth]/route.ts` | The heart of the authentication system. It configures NextAuth.js, including the GitHub provider, callbacks for sign-in, JWT, and session management. |
| `components/NextAuthProvider.tsx` | A client-side component that makes the NextAuth.js session available throughout the React component tree. |
| **Script Generation** | |
| `app/api/generate-ai-gateway/route.ts` | The backend API endpoint that handles AI script generation. It receives prompts, interacts with the Vercel AI Gateway, and streams responses back to the client. |
| `components/ScriptGenerationClient.tsx` | The primary client-side component for the script generation feature. It manages the user prompt, sends requests to the AI gateway, and handles the streaming response. |
| **Script Management (API)** | |
| `app/api/scripts/route.ts` | The API endpoint for creating new scripts (`POST`) and fetching a list of all scripts (`GET`). |
| `app/api/[username]/[scriptId]/route.ts` | The API endpoint for operations on a single script, including retrieving (`GET`), updating (`PATCH`), and deleting (`DELETE`) a script. |
| **Script Management (UI)** | |
| `app/[username]/[scriptId]/page.tsx` | The page that displays a single, specific script. It fetches the script's data from the database. |
| `app/[username]/[scriptId]/edit/page.tsx` | The server component for the script editing page. It performs authorization checks to ensure the current user is the owner of the script. |
| `components/EditScriptClient.tsx` | The client component that provides the script editing interface, including the Monaco editor and the save functionality. |
| `components/ScriptCard.tsx` | The reusable component used to display a script in a grid or list format. It shows the script's content, owner, and interaction buttons. |
| **Database** | |
| `prisma/schema.prisma` | The definitive source of truth for the database schema. It defines all the models (tables), their fields, and the relationships between them. |
| `lib/prisma.ts` | Initializes and exports a singleton instance of the Prisma client, which is used throughout the application to interact with the database. |

### Core User Event Flows

Understanding these user flows will help you trace how data and user interactions move through the application.

#### 1. New User Authentication

This flow describes how a new user signs in for the first time.

1.  **Initiation**: The user clicks a "Sign In" button (`components/SignInButton.tsx`).
2.  **Redirect to Provider**: The app redirects the user to GitHub for authentication.
3.  **Authorization**: The user authorizes the application on GitHub.
4.  **Callback to NextAuth**: GitHub redirects back to the application, hitting the `app/api/auth/[...nextauth]/route.ts` endpoint.
5.  **Session Creation**: The `signIn` callback in the NextAuth configuration is executed. It finds or creates a `User` record in the database via Prisma.
6.  **Session Management**: A session is established, and the user's session data is made available to the client-side through the `useSession` hook and the `NextAuthProvider`.

#### 2. AI Script Generation

This flow covers the process of a user generating a new script using AI.

1.  **User Input**: The user types a prompt into the input field on the homepage (`components/ScriptGenerationClient.tsx`).
2.  **API Request**: On submission, the client sends a `POST` request to `/api/generate-ai-gateway`.
3.  **Backend Processing**:
    *   The `app/api/generate-ai-gateway/route.ts` file receives the request.
    *   It authenticates the user and checks their usage limits.
    *   It creates a preliminary `Script` record in the database.
    *   It sends the prompt to the Vercel AI Gateway.
4.  **Streaming Response**:
    *   The AI model begins generating the script, and the response is streamed back through the Vercel AI Gateway.
    *   The backend API pipes this stream directly to the client.
5.  **Real-time Display**: The `ScriptGenerationClient` reads the stream and updates the user interface in real-time, displaying the script as it is being generated.
6.  **Saving the Script**: Once generation is complete, the user can save the script, which involves updating the `Script` record in the database with the full content.

#### 3. Editing an Existing Script

This flow outlines how a user edits a script they own.

1.  **Navigation**: The user navigates to a script they own and clicks the "Edit" button.
2.  **Page Load**: The user is directed to `/[username]/[scriptId]/edit`.
3.  **Authorization**: The `app/[username]/[scriptId]/edit/page.tsx` server component fetches the script and verifies that the logged-in user is the owner.
4.  **Editor Interface**: The `components/EditScriptClient.tsx` component is rendered, which includes the Monaco editor populated with the script's content.
5.  **User Modifications**: The user makes changes to the script's title or content within the editor.
6.  **Save Action**: The user clicks the "Save" button.
7.  **API Update**: A `PATCH` request containing the updated content is sent to `/api/[username]/[scriptId]`.
8.  **Database Update**: The `updateScript` function in `app/api/[username]/[scriptId]/route.ts` updates the corresponding `Script` record in the database.
9.  **Redirect**: The user is redirected back to the script's main view page to see their changes.