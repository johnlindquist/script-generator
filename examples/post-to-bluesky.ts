/*
# Post to Bluesky

- Posts a message to Bluesky
*/
// Name: Post to Bluesky
// Description: Post a message to Bluesky
// Author: John Lindquist

import "@johnlindquist/kit";

import { AtpAgent } from "@atproto/api";

const agent = new AtpAgent({
  service: "https://bsky.social",
});

await agent.login({
  identifier: await env("BLUESKY_USERNAME"),
  password: await env("BLUESKY_PASSWORD"),
});

const text = await editor();

await agent.post({
  text,
  createdAt: new Date().toISOString(),
});
