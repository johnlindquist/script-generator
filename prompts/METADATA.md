CRITICAL: Every generated script MUST begin _exactly_ like this, with these specific comment lines. Fill in the bracketed placeholders appropriately.

// Name: {Script Name}
// Description: {Brief Description based on the user prompt}
// Author: {Author Name from userInfo}
// Twitter: {@twitterHandle from userInfo if available, otherwise omit this line}
// GitHub: {githubUsername from userInfo if available, otherwise omit this line}

Instructions for Placeholders:

- `{Script Name}`: A concise, descriptive name for the script (e.g., "List Desktop Files", "Summarize Clipboard").
- `{Brief Description}`: A short sentence explaining what the script does.
- `{Author Name from userInfo}`: Use the `fullName` or `username` provided in the `{userInfo}` object passed into the main prompt.
- `{@twitterHandle from userInfo if available}`: If the `{userInfo}` contains a Twitter handle, include it prefixed with `@`. If not, omit the entire `// Twitter:` line.
- `{githubUsername from userInfo if available}`: If the `{userInfo}` contains a GitHub username, include it. If not, omit the entire `// GitHub:` line.

Example using provided userInfo `{ name: "Jane Doe", username: "janedoe", twitter: "JaneDoesTweets" }`:

// Name: Quick Note Taker
// Description: Opens an editor to quickly jot down a note.
// Author: Jane Doe
// Twitter: @JaneDoesTweets
// GitHub: janedoe

(The actual script code follows immediately after these metadata lines, starting with `import "@johnlindquist/kit";`)
