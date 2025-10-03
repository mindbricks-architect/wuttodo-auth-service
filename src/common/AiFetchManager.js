class BaseAiFetchManager {
  constructor(userPrompt, systemPrompt, options) {
    this.userPrompt = userPrompt;

    this.systemPrompt = systemPrompt ?? null;

    this.isArray = options.isArray ?? false;
    this.maxTokens = options.maxTokens ?? null;
    this.responseFormat = options.responseFormat ?? "text";
  }

  getApiEndpoint() {
    throw new Error("getApiEndpoint must be implemented by child class");
  }

  getRequestHeaders() {
    throw new Error("getRequestHeaders must be implemented by child class");
  }

  formatRequestBody(messages) {
    throw new Error("formatRequestBody must be implemented by child class");
  }

  extractResponseContent(data) {
    throw new Error(
      "extractResponseContent must be implemented by child class",
    );
  }

  formatMessages(prompt) {
    throw new Error("formatMessages must be implemented by child class");
  }

  async makeRequest(prompt) {
    if (!this.apiKey) {
      throw new Error("API key is required");
    }

    const messages = this.formatMessages(prompt);

    const response = await fetch(this.getApiEndpoint(), {
      method: "POST",
      headers: this.getRequestHeaders(),
      body: JSON.stringify(this.formatRequestBody(messages)),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return this.extractResponseContent(data);
  }

  processResponse(response) {
    if (!response) {
      throw new Error("Empty response from AI service");
    }

    if (this.responseFormat === "json") {
      try {
        const jsonResponse =
          typeof response === "string" ? JSON.parse(response) : response;
        return this.isArray
          ? Array.isArray(jsonResponse)
            ? jsonResponse
            : [jsonResponse]
          : jsonResponse;
      } catch (error) {
        throw new Error("Failed to parse JSON response: " + error.message);
      }
    }

    return this.isArray ? [response] : response;
  }

  async execute(owner) {
    try {
      if (!this.apiKey) {
        throw new Error(`API key not found`);
      }
      const response = await this.executeAiFetch();
      return this.processResponse(response);
    } catch (error) {
      console.error("AiFetch error..", error);
      throw error;
    }
  }
}

class OpenAiFetchManager extends BaseAiFetchManager {
  constructor(userPrompt, systemPrompt, options) {
    super(userPrompt, systemPrompt, options);
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = "gpt-4-turbo-preview";
  }

  getApiEndpoint() {
    return "https://api.openai.com/v1/chat/completions";
  }

  getRequestHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };
  }

  formatMessages(prompt) {
    const messages = [];
    if (prompt.systemPrompt) {
      messages.push({
        role: "system",
        content: prompt.systemPrompt,
      });
    }
    messages.push({
      role: "user",
      content: prompt.userPrompt,
    });
    return messages;
  }

  formatRequestBody(messages) {
    return {
      model: this.model,
      messages: messages,
    };
  }

  extractResponseContent(data) {
    return data.choices[0].message.content;
  }

  async executeAiFetch() {
    return await this.makeRequest({
      systemPrompt: this.systemPrompt,
      userPrompt: this.userPrompt,
    });
  }
}

class AnthropicFetchManager extends BaseAiFetchManager {
  constructor(userPrompt, systemPrompt, options) {
    super(userPrompt, systemPrompt, options);
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.model = "claude-3-opus-20240229";
  }

  getApiEndpoint() {
    return "https://api.anthropic.com/v1/messages";
  }

  getRequestHeaders() {
    return {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
      "anthropic-version": "2023-06-01",
    };
  }

  formatMessages(prompt) {
    const messages = [];
    if (prompt.systemPrompt) {
      messages.push({
        role: "system",
        content: prompt.systemPrompt,
      });
    }
    messages.push({
      role: "user",
      content: prompt.userPrompt,
    });
    return messages;
  }

  formatRequestBody(messages) {
    return {
      model: this.model,
      messages: messages,
      max_tokens: this.maxTokens,
      system: messages.find((m) => m.role === "system")?.content || "",
    };
  }

  extractResponseContent(data) {
    return data.content[0].text;
  }

  async executeAiFetch() {
    return await this.makeRequest({
      systemPrompt: this.systemPrompt,
      userPrompt: this.userPrompt,
    });
  }
}

module.exports = {
  OpenAiFetchManager,
  AnthropicFetchManager,
};
