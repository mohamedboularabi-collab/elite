import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";

const app = express();
app.use(express.json({ limit: "10mb" }));

const PORT = 3000;

function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("مفتاح API الخاص بـ Gemini غير معرف في البيئة (GEMINI_API_KEY).");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Helper to sleep
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper for generating text with automatic retry and model fallback
async function generateTextWithRetry(
  ai: GoogleGenAI,
  models: string[],
  contents: any,
  systemInstruction?: string
) {
  let lastError: any = null;

  for (const modelName of models) {
    // Retry up to 2 times per model for transient errors like 503/429
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`Attempting generateContent with model: ${modelName} (attempt ${attempt})`);
        const response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: systemInstruction ? { systemInstruction } : undefined,
        });
        if (response.text) {
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || "";
        const isTransient =
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("high demand") ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("Overloaded");

        console.warn(`Error on model ${modelName} (attempt ${attempt}): ${errMsg}`);

        if (isTransient && attempt < 2) {
          await sleep(1500 * attempt);
          continue;
        }
        // If not transient or reached attempt limit, break to next model in fallback list
        break;
      }
    }
  }

  throw lastError;
}

// Text Generation Endpoint
app.post("/api/generate-content", async (req, res) => {
  try {
    const { model, contents, systemInstruction } = req.body;
    const ai = getAiClient();
    
    // Priority order of models for fast and reliable response
    const requestedModel = model || "gemini-3.7-flash";
    const modelsToTry = Array.from(
      new Set([requestedModel, "gemini-3.7-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"])
    );

    const generatedText = await generateTextWithRetry(ai, modelsToTry, contents, systemInstruction);
    return res.json({ text: generatedText });
  } catch (error: any) {
    console.error("Error in /api/generate-content:", error);
    let userMsg = "حدث خطأ أثناء توليد النص. يرجى المحاولة مرة أخرى.";
    if (error?.message?.includes("503") || error?.message?.includes("UNAVAILABLE") || error?.message?.includes("high demand")) {
      userMsg = "الخادم يواجه ضغطاً مؤقتاً في الطلبات، جاري تخفيف الحمل. يرجى إعادة المحاولة بعد ثوانٍ قليلة.";
    } else if (error?.message?.includes("429") || error?.message?.includes("RESOURCE_EXHAUSTED")) {
      userMsg = "تم بلوغ الحد المؤقت للطلبات، يرجى الانتظار لحظات وإعادة المحاولة.";
    }
    res.status(500).json({ error: userMsg, raw: error?.message });
  }
});

// TTS Speech Generation Endpoint with retries
app.post("/api/generate-tts", async (req, res) => {
  try {
    const { text, voiceName, promptStyle } = req.body;
    if (!text) {
      return res.status(400).json({ error: "النص مطلوب لتوليد الصوت." });
    }

    const ai = getAiClient();
    const fullPrompt = promptStyle ? `${promptStyle}:\n\n${text}` : text;

    let ttsResponse: any = null;
    let lastErr: any = null;

    // Retry up to 3 times for TTS transient spikes
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        ttsResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: fullPrompt }] }],
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voiceName || "Puck" },
              },
            },
          },
        });
        break;
      } catch (err: any) {
        lastErr = err;
        console.warn(`TTS attempt ${attempt} error:`, err?.message);
        if (attempt < 3) {
          await sleep(1200 * attempt);
        }
      }
    }

    if (!ttsResponse) {
      throw lastErr;
    }

    const parts = ttsResponse.candidates?.[0]?.content?.parts;
    let base64Audio = "";
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          base64Audio += part.inlineData.data;
        }
      }
    }

    res.json({ base64Audio });
  } catch (error: any) {
    console.error("Error in /api/generate-tts:", error);
    let userMsg = "حدث خطأ أثناء توليد القراءة الصوتية.";
    if (error?.message?.includes("503") || error?.message?.includes("high demand")) {
      userMsg = "محرك الصوت يواجه طلباً مرتفعاً مؤقتاً، يرجى المحاولة مرة أخرى بعد لحظات.";
    }
    res.status(500).json({ error: userMsg, raw: error?.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
