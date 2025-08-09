import OpenAI from "openai";

export const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "getPortfolio",
      description: "获取用户链上资产信息",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string" },
          chainId: { type: "string" }
        },
        required: ["address", "chainId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getTokenInfo",
      description: "获取指定链上代币信息",
      parameters: {
        type: "object",
        properties: {
          chainId: { type: "string" },
          tokenSymbol: { type: "string" }
        },
        required: ["chainId", "tokenSymbol"]
      }
    }
  }
];


export const getTokenInfoTool: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "getTokenInfo",
      description: "获取指定链上代币信息",
      parameters: {
        type: "object",
        properties: {
          chainId: { type: "string" },
          tokenSymbol: { type: "string" }
        },
        required: ["chainId", "tokenSymbol"]
      }
    }
  }
];
