const { OpenAI } = require("openai");
const { AzureOpenAiLLM } = require("../../../AiProviders/azureOpenAi");
const Provider = require("./ai-provider.js");
const { tooledStream, tooledComplete } = require("./helpers/tooled.js");
const { RetryError } = require("../error.js");

/**
 * The agent provider for the Azure OpenAI API.
 * Uses the shared native tool calling helper for OpenAI-compatible tool calling.
 */
class AzureOpenAiProvider extends Provider {
  model;

  constructor(config = { model: null }) {
    const client = new OpenAI({
      apiKey: config.apiKey ?? process.env.AZURE_OPENAI_KEY,
      baseURL: AzureOpenAiLLM.formatBaseUrl(process.env.AZURE_OPENAI_ENDPOINT),
    });
    super(client);
    this.model =
      config.model ||
      process.env.AZURE_OPENAI_MODEL_PREF ||
      process.env.OPEN_MODEL_PREF;
    this.verbose = true;
  }

  get supportsAgentStreaming() {
    return true;
  }

  /**
   * Convert legacy function definitions to the tools format.
   * @param {Array} functions - Legacy function definitions
   * @returns {Array} Tools in the new format
   */
  #formatFunctionsToTools(functions) {
    if (!Array.isArray(functions) || functions.length === 0) return [];
    return functions.map((func) => ({
      type: "function",
      function: {
        name: func.name,
        description: func.description,
        parameters: func.parameters,
      },
    }));
  }

  /**
   * Format attachments for OpenAI's API
   * @param {Array} attachments - Array of attachment objects
   * @returns {Array} Formatted attachment content blocks
   */
  #formatAttachments(attachments = []) {
    if (!attachments || !attachments.length) return [];
    
    return attachments.map((attachment) => ({
      type: "image_url",
      image_url: {
        url: attachment.contentString,
        detail: "high",
      },
    }));
  }

  /**
   * Format messages to use tool calling format instead of legacy function format.
   * Converts role: "function" messages to role: "tool" messages.
   * @param {Array} messages - Messages array that may contain legacy function messages
   * @returns {Array} Messages formatted for tool calling
   */
  #formatMessagesForTools(messages) {
    const formattedMessages = [];

    for (const message of messages) {
      if (message.role === "function") {
        // Convert legacy function result to tool result format
        // We need the tool_call_id from the originalFunctionCall
        if (message.originalFunctionCall?.id) {
          // First, add the assistant message with the tool_call if not already present
          // Check if previous message already has this tool call
          const prevMsg = formattedMessages[formattedMessages.length - 1];
          if (!prevMsg || prevMsg.role !== "assistant" || !prevMsg.tool_calls) {
            formattedMessages.push({
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: message.originalFunctionCall.id,
                  type: "function",
                  function: {
                    name: message.originalFunctionCall.name,
                    arguments:
                      typeof message.originalFunctionCall.arguments === "string"
                        ? message.originalFunctionCall.arguments
                        : JSON.stringify(
                            message.originalFunctionCall.arguments
                          ),
                  },
                },
              ],
            });
          }
          // Add the tool result
          formattedMessages.push({
            role: "tool",
            tool_call_id: message.originalFunctionCall.id,
            content:
              typeof message.content === "string"
                ? message.content
                : JSON.stringify(message.content),
          });
        } else {
          // Fallback: generate a tool_call_id if not present
          const toolCallId = `call_${v4()}`;
          formattedMessages.push({
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: toolCallId,
                type: "function",
                function: {
                  name: message.name,
                  arguments: "{}",
                },
              },
            ],
          });
          formattedMessages.push({
            role: "tool",
            tool_call_id: toolCallId,
            content:
              typeof message.content === "string"
                ? message.content
                : JSON.stringify(message.content),
          });
        }
      } else {
        // Handle attachments for regular messages
        if (message.attachments && message.attachments.length > 0) {
          const contentArray = Array.isArray(message.content)
            ? message.content
            : [{ type: "text", text: message.content }];
          contentArray.push(...this.#formatAttachments(message.attachments));
          const { attachments, ...messageWithoutAttachments } = message;
          formattedMessages.push({ ...messageWithoutAttachments, content: contentArray });
        } else {
          formattedMessages.push(message);
        }
      }
    }

    return formattedMessages;
  }

  /**
   * Stream a chat completion from Azure OpenAI with tool calling.
   *
   * @param {any[]} messages
   * @param {any[]} functions
   * @param {function} eventHandler
   * @returns {Promise<{ functionCall: any, textResponse: string, uuid: string }>}
   */
  async stream(messages, functions = [], eventHandler = null) {
    this.providerLog("Provider.stream - will process this chat completion.");

    try {
      return await tooledStream(
        this.client,
        this.model,
        messages,
        functions,
        eventHandler,
        { provider: this }
      );
    } catch (error) {
      console.error(error.message, error);
      if (error instanceof OpenAI.AuthenticationError) throw error;
      if (
        error instanceof OpenAI.RateLimitError ||
        error instanceof OpenAI.InternalServerError ||
        error instanceof OpenAI.APIError
      ) {
        throw new RetryError(error.message);
      }
      throw error;
    }
  }

  /**
   * Create a completion based on the received messages with tool calling.
   *
   * @param {any[]} messages
   * @param {any[]} functions
   * @returns The completion.
   */
  async complete(messages, functions = []) {
    try {
      const result = await tooledComplete(
        this.client,
        this.model,
        messages,
        functions,
        this.getCost.bind(this),
        { provider: this }
      );

      if (result.retryWithError) {
        return this.complete([...messages, result.retryWithError], functions);
      }

      return result;
    } catch (error) {
      if (error instanceof OpenAI.AuthenticationError) throw error;
      if (
        error instanceof OpenAI.RateLimitError ||
        error instanceof OpenAI.InternalServerError ||
        error instanceof OpenAI.APIError
      ) {
        throw new RetryError(error.message);
      }
      throw error;
    }
  }

  /**
   * Get the cost of the completion.
   * Stubbed since Azure OpenAI has no public cost basis.
   *
   * @param _usage The completion to get the cost for.
   * @returns The cost of the completion.
   */
  getCost(_usage) {
    return 0;
  }
}

module.exports = AzureOpenAiProvider;
