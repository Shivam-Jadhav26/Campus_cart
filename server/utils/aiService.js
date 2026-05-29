import axios from "axios";

/**
 * AI Service for NVIDIA NIM API (OpenAI-compatible)
 * Features: Retry logic (503), timeout handling, and validation
 */
const AI_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";
const DATA_MODEL = "meta/llama-3.1-8b-instruct";

export const generateAIResponse = async (prompt, retries = 3) => {
  const apiKey = process.env.HF_API_KEY;

  // Pre-flight Validation
  if (!apiKey || apiKey.includes("your_hf_api_key") || apiKey === "") {
    console.error("AI Service Error: HF_API_KEY is missing or invalid.");
    throw new Error("AI service is currently unavailable (config error)");
  }

  const payload = {
    model: DATA_MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 512,
  };

  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.post(AI_ENDPOINT, payload, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000, // 15s timeout
      });

      const content = response.data?.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error("Empty or malformed response from AI provider");
      }

      return content.trim();

    } catch (error) {
      const is503 = error.response?.status === 503;
      const isLastRetry = i === retries - 1;

      if (is503 && !isLastRetry) {
        if (process.env.NODE_ENV !== "production") {
          console.warn(`HF model loading (503). Retrying... (${i + 1}/${retries})`);
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }

      // Handle Timeout specifically
      if (error.code === "ECONNABORTED") {
        throw new Error("AI Assistant request timed out.");
      }

      // 🛡️ SECURITY: Prevent external API 401/403 from leaking as session errors
      // If Hugging Face returns 401, the server should return 502/500 to the client, 
      // not 401, otherwise the client will think ITS session has expired.
      if (error.response?.status === 401 || error.response?.status === 403) {
        const wrapError = new Error("AI Service configuration error or invalid API key");
        wrapError.statusCode = 502; // Bad Gateway / Service Error
        throw wrapError;
      }

      // Propagate other critical errors
      throw error;
    }
  }

  throw new Error("AI Service failed after multiple retries.");
};
