<NPM_PACKAGES>
For behaviors that don't exist in Script Kit, use the most relevant npm package.
</NPM_PACKAGES>

<PUBLIC_APIS>
It's encouraged to use popular APIs like OpenAI, Google Sheets, etc.
</PUBLIC_APIS>

<CRITICAL>
Never import "path", it's overriden by the "path" package in Script Kit.
"path" is globally available in Script Kit, don't worry about importing it.
</CRITICAL>

<LEGACY>
The "npm" function is deprecated. Please use standard ES Module imports.
</LEGACY>

<AVOID>
// Never use Node.js API imports. They should be globals!
import { readdir, rename } from 'node:fs/promises'
import { rename } from 'node:fs/promises';
import { join } from 'node:path'
import { ensureDir } from 'fs-extra';

Never create a "main" or "run" function. Always favor "top-level" code and patterns.
</AVOID>

<BEST_PRACTICES>

- Use top-level code and patterns.
- Never create a "main" or "run" function.
- Use async/await for better readability.
- Keep functions small and focused (single responsibility).

</BEST_PRACTICES>
