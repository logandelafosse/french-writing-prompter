import OpenAI from "openai";

export interface ChatCompletionParams {
  model: string;
  messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }>;
  response_format?: { type: "json_object" };
}

export class OpenAiClient {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? "sk-placeholder",
      maxRetries: 2,
      timeout: 30000,
    });
  }

  async chatCompletion(params: ChatCompletionParams): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: params.model,
        messages:
          params.messages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        ...(params.response_format && {
          response_format: params.response_format,
        }),
      });

      return response.choices[0]?.message?.content ?? "";
    } catch {
      throw new Error("AI service error");
    }
  }

  async chatCompletionJSON<T = Record<string, unknown>>(
    params: Omit<ChatCompletionParams, "response_format">,
  ): Promise<T> {
    const text = await this.chatCompletion({
      ...params,
      response_format: { type: "json_object" },
    });

    return JSON.parse(text) as T;
  }
}
