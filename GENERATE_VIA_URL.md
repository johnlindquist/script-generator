# Auto-Generating Scripts via URL

You can automatically trigger the script generator by providing a prompt in the URL. This is useful for integrating with other applications, suchs as the Script Kit desktop app, to seamlessly transition into the web-based generator.

## How it Works

The homepage can accept a special query parameter, `prompt_b64`, which contains a Base64-encoded version of your desired prompt.

When the page loads:

1. It checks for the `prompt_b64` parameter.
2. If found, it decodes the prompt from Base64.
3. If you are already signed in, it will immediately submit the prompt to the script generator.
4. If you are not signed in, it will display the sign-in modal. After you successfully sign in, it will automatically submit the prompt.

To prevent accidental re-submissions, the query parameter is removed from the URL after it has been processed.

## Using the `prompt_b64` Parameter

To ensure that complex prompts with special characters, code snippets, or emoji are handled correctly, you must encode your prompt string in Base64.

### Example Workflow

1.  **Start with your prompt string.**

    For example: `Create a script that resizes all .png images in a folder to 50% of their original size. It should ask the user for the folder path. 📁`

2.  **Encode the prompt in Base64.**

    You can use an online tool or a command-line utility:

    ```bash
    echo "Create a script that resizes all .png images in a folder to 50% of their original size. It should ask the user for the folder path. 📁" | base64
    ```

    This will produce the following Base64 string:
    `Q3JlYXRlIGEgc2NyaXB0IHRoYXQgcmVzaXplcyBhbGwgLnBuZyBpbWFnZXMgaW4gYSBmb2xkZXIgdG8gNTAlIG9mIHRoZWlyIG9yaWdpbmFsIHNpemUuIEl0IHNob3VsZCBhc2sgdGhlIHVzZXIgZm9yIHRoZSBmb2xkZXIgcGF0aC4g📁Cg==`

3.  **Construct the URL.**

    Take the Base64 string and append it to the home page URL as the `prompt_b64` query parameter.

    ```
    https://script-generator.com/?prompt_b64=Q3JlYXRlIGEgc2NyaXB0IHRoYXQgcmVzaXplcyBhbGwgLnBuZyBpbWFnZXMgaW4gYSBmb2xkZXIgdG8gNTAlIG9mIHRoZWlyIG9yaWdpbmFsIHNpemUuIEl0IHNob3VsZCBhc2sgdGhlIHVzZXIgZm9yIHRoZSBmb2xkZXIgcGF0aC4g📁Cg==
    ```

### Another Example (with special characters)

- **Prompt**: `// Get the user's name\nconst name = await arg("What is your name?");`
- **Base64**: `Ly8gR2V0IHRoZSB1c2VyJ3MgbmFtZQpuYW1lID0gYXdhaXQgYXJnKCJXaGF0IGlzIHlvdXIgbmFtZT8iKTs=`
- **URL**: `https://script-generator.com/?prompt_b64=Ly8gR2V0IHRoZSB1c2VyJ3MgbmFtZQpuYW1lID0gYXdhaXQgYXJnKCJXaGF0IGlzIHlvdXIgbmFtZT8iKTs=`

This process ensures that any text, no matter how complex, can be reliably passed to the generator.
