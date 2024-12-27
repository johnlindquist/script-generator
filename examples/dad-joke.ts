/*
# Speak Text Requested from an API

- Requests a joke from [https://icanhazdadjoke.com](https://icanhazdadjoke.com)
- Speaks the joke
- Tap `y` to speak another joke
*/

// Name: Dad Joke
// Description: Dad Joke from icanhazdadjoke.com
// Author: John Lindquist
// Twitter: @johnlindquist

import "@johnlindquist/kit";

interface JokeResponse {
  data: string;
}

const getJoke = async (): Promise<string> => {
  let response: JokeResponse = await get(`https://icanhazdadjoke.com/`, {
    headers: {
      Accept: "text/plain",
      "User-Agent": "axios 0.21.1",
    },
  });
  say(response.data);
  return `<div class="text-center text-4xl p-10 font-semibold">${response.data}</div>`;
};

while (true) {
  const yesOrNo: string = await div({
    html: await getJoke(),
    enter: ``,
    footerClassName: "", // By default, footerClassName is "hidden". We clear it to see the shortcut buttons
    shortcuts: [
      {
        name: "Another",
        key: `Y`,
        onPress: () => submit("y"),
        bar: "right",
      },
      {
        name: "Please, make it stop!",
        key: `N`,
        onPress: () => submit("n"),
        bar: "right",
      },
    ],
  });

  if (yesOrNo === "n") {
    process.exit(0); //forcefully exit any script
  }
}
