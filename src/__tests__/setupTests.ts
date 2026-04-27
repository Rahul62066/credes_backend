jest.mock("openai", () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  twitter: {
                    content: "Mocked twitter post with #tag1 #tag2",
                    hashtags: ["#tag1", "#tag2"],
                    characterCount: 38,
                  },
                }),
              },
            },
          ],
        }),
      },
    },
  }));
});

jest.mock("@anthropic-ai/sdk", () => {
  return jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [
          {
            type: "text",
            text: JSON.stringify({
              twitter: {
                content: "Mocked anthropic twitter post with #tag1 #tag2",
                hashtags: ["#tag1", "#tag2"],
                characterCount: 48,
              },
            }),
          },
        ],
      }),
    },
  }));
});

jest.mock("grammy", () => {
  class InlineKeyboard {
    text(): InlineKeyboard {
      return this;
    }
    row(): InlineKeyboard {
      return this;
    }
  }

  class Bot {
    public api = {
      setMyCommands: jest.fn().mockResolvedValue(undefined),
      setWebhook: jest.fn().mockResolvedValue(undefined),
    };

    command(): void {}
    on(): void {}
    catch(): void {}
  }

  const webhookCallback = jest.fn().mockImplementation(() => {
    return (_req: unknown, _res: unknown, next: () => void) => next();
  });

  return {
    Bot,
    InlineKeyboard,
    webhookCallback,
  };
});
