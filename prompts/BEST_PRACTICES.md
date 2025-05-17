<BEST_PRACTICES>
Adhere strictly to these best practices when generating Script Kit scripts:

1.  **Use Global Functions Directly:** The following Script Kit functions are globally available. DO NOT import them from "@johnlindquist/kit" or anywhere else unless it's from a specific sub-path (which is rare). Use them directly:

    - **Prompts:** `arg`, `env`, `select`, `div`, `md`, `editor`, `form`, `fields`, `path`, `micro`, `mini`, `chat`, `template`, `hotkey`, `drop`, `find`, `eyeDropper`.
    - **System Interaction:** `notify`, `say`, `beep`, `toast`, `setSelectedText`, `getSelectedText`, `clipboard`, `keyboard`, `mouse`, `menu`, `term`, `applescript`, `getMediaDevices`, `getTypedText`, `mic`, `webcam`, `screenshot`.
    - **File System:** `home`, `kitPath`, `kenvPath`, `tmpPath`, `readFile`, `writeFile`, `readdir`, `copyFile`, `ensureReadFile`, `ensureDir`, `pathExists`, `remove`, `move`, `trash`.
    - **Network:** `get`, `post`, `put`, `del`, `patch`, `download`.
    - **Shell/Exec:** `$`, `exec`, `spawn`, `cd`, `pwd`, `which`.
    - **Utilities:** `inspect`, `dev`, `db`, `store`, `uuid`, `wait`, `compile` (handlebars), `degit`, `git`, `md`, `highlight`, `replace`, `formatDate`, `run`.
    - **State/UI Control:** `submit`, `exit`, `show`, `hide`, `blur`, `focus`, `setPanel`, `setPreview`, `setHint`, `setInput`, `setChoices`, `onTab`.
    - (Refer to `<API_DOCS>` for the full, definitive list and signatures).

2.  **Use ESM (`import`):** Always use `import` for any _external_ npm packages or local modules. NEVER use `require`. `import "@johnlindquist/kit";` should typically be the first line after metadata unless other imports are needed.

3.  **Use Top-Level `await`:** Write asynchronous code directly at the top level of the script. Avoid wrapping the main logic in an unnecessary `async function main() {...}` followed by `main();`.

    - **Correct:**
      ```typescript
      import '@johnlindquist/kit'
      let name = await arg('Enter name')
      await notify(`Hello, ${name}`)
      ```
    - **Incorrect:**
      ```typescript
      import '@johnlindquist/kit'
      async function main() {
        let name = await arg('Enter name')
        await notify(`Hello, ${name}`)
      }
      main()
      ```

4.  **Keep it Minimal (Draft Quality):** Focus on implementing the core functionality requested in `<USER_PROMPT>`. Do not add extra features, complex UI elements, or sophisticated error handling unless explicitly requested. The goal is a working _draft_.

5.  **Basic Error Handling:** For external API calls (e.g., `get`, `post`) or file system operations (e.g., `readFile`, `writeFile`) that might fail, wrap the core operation in a simple `try...catch` block and log errors using `console.error(error)`. Avoid creating custom error classes or elaborate handling routines.
    </BEST_PRACTICES>
