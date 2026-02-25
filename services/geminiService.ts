import { GoogleGenAI, Type } from "@google/genai";
import { ExtractedData } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Helper to call the API with exponential backoff specifically for 429 errors.
 */
async function callWithRetry(fn: () => Promise<any>, maxRetries = 3): Promise<any> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorMessage = error?.message || "";
      const isQuotaError = errorMessage.includes("429") || 
                          errorMessage.includes("RESOURCE_EXHAUSTED") || 
                          errorMessage.includes("quota");

      if (isQuotaError && i < maxRetries - 1) {
        // Exponential backoff: 5s, 10s, 20s... with a bit of jitter
        const waitTime = Math.pow(2, i) * 5000 + Math.random() * 1000;
        console.warn(`Quota exceeded. Retrying in ${Math.round(waitTime/1000)}s... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function parseBoreholeLog(input: { base64?: string, html?: string }): Promise<ExtractedData[]> {
  const modelId = "gemini-3-pro-preview"; 

  const prompt = `
    ACT AS A SENIOR GEOTECHNICAL DATA SPECIALIST.
    Task: Extract ALL borehole data from the provided source.
    
    ### IMPORTANT: One page/image may contain MULTIPLE boreholes (e.g., Borehole 1, 2, 3, 4).
    Analyze each vertical section independently.

    ### PARAMETERS TO EXTRACT (Daya Engineering Format):
    1. **Borehole ID (מס' קידוח)**: e.g., "1", "2". Look for coordinates below the number.
    2. **Stratigraphy (שכבות)**:
       - Columns (Right to Left): Borehole ID, Depth (עומק), Description (תיאור), Fine % (דקים %), Plasticity (פלסטיות), Swelling (פוטנציאל תפיחה), Color (צבע).
       - EXTRACT EVERY COLUMN PRECISELY.
    3. **SPT (בדיקות SPT)**:
       - Columns (Right to Left): Borehole ID, Depth (עומק), Blows/N (מס' חבטות).
       - If format is "Total (b1,b2,b3)", extract the Total. If Total is missing, sum the last two numbers.
    4. **Water Table (מי תהום)**: Look for text like "מים נמצאו בעומק X מ'".

    ### RULES:
    - Output an array of borehole objects.
    - If a row is merged, apply its value to all sub-rows.
    - If data is missing or a dash '-', use null or empty string.
    - Infer USCS from Description (e.g., "חרסית שמנה" -> CH, "חול נקי" -> SP).
  `;

  try {
    const contents: any = {
      parts: [
        input.base64 ? { inlineData: { mimeType: "image/jpeg", data: input.base64 } } : null,
        input.html ? { text: `HTML CONTENT:\n${input.html}` } : null,
        { text: prompt },
      ].filter(Boolean),
    };

    const response = await callWithRetry(() => genAI.models.generateContent({
      model: modelId,
      contents,
      config: {
        thinkingConfig: { thinkingBudget: 16000 },
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              header: {
                type: Type.OBJECT,
                properties: {
                  projectName: { type: Type.STRING },
                  boreholeName: { type: Type.STRING },
                  date: { type: Type.STRING },
                  elevation: { type: Type.STRING },
                  coordinates: { type: Type.STRING },
                  waterTable: { type: Type.STRING },
                },
                required: ["boreholeName"],
              },
              layers: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    depthFrom: { type: Type.NUMBER },
                    depthTo: { type: Type.NUMBER },
                    description: { type: Type.STRING },
                    finePercent: { type: Type.STRING },
                    plasticity: { type: Type.STRING },
                    swelling: { type: Type.STRING },
                    colorText: { type: Type.STRING },
                    uscs: { type: Type.STRING },
                  },
                  required: ["depthFrom", "depthTo", "description"],
                },
              },
              spt: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    depth: { type: Type.NUMBER },
                    value: { type: Type.NUMBER },
                    notes: { type: Type.STRING },
                  },
                  required: ["depth", "value"],
                },
              },
            },
          },
        },
      },
    }));

    const text = response.text;
    if (!text) throw new Error("No data");

    const cleanText = text.replace(/```json\n?|```/g, '').trim();
    const rawDataArray = JSON.parse(cleanText);

    return rawDataArray.map((rawData: any) => {
      const internalId = generateId();
      return {
        internalId,
        header: {
          projectName: rawData.header?.projectName || "",
          boreholeName: rawData.header?.boreholeName || "?",
          date: rawData.header?.date || "",
          elevation: rawData.header?.elevation || "0.00",
          coordinates: rawData.header?.coordinates || "",
          client: "",
          waterTable: rawData.header?.waterTable || "-",
        },
        layers: (rawData.layers || []).map((l: any, index: number) => {
          const uscs = l.uscs || inferUSCS(l.description);
          return {
            ...l,
            id: `${internalId}-layer-${index}`,
            uscs,
            pattern: mapUSCSToPattern(uscs),
            color: mapUSCSToColor(uscs),
          };
        }),
        spt: (rawData.spt || []).map((s: any, index: number) => ({
          ...s,
          id: `${internalId}-spt-${index}`,
          notes: s.notes || '',
        })),
      };
    });
  } catch (error) {
    console.error("Parse error:", error);
    throw error;
  }
}

function inferUSCS(desc: string): string {
  if (!desc) return "CL";
  const d = desc.toLowerCase();
  if (d.includes("חול") && (d.includes("כורכר") || d.includes("נקי"))) return "SP";
  if (d.includes("חול") && d.includes("חרסיתי")) return "SC";
  if (d.includes("חרסית") && d.includes("שמנה")) return "CH";
  if (d.includes("חרסית")) return "CL";
  if (d.includes("מילוי")) return "Fill";
  return "CL";
}

function mapUSCSToPattern(uscs: string): string {
  const code = uscs ? uscs.toUpperCase() : '';
  if (code.includes('S') && !code.includes('C') && !code.includes('M')) return 'dots';
  if (code.includes('C') || code.includes('CLAY')) return 'diagonal';
  if (code.includes('G') || code.includes('GRAVEL')) return 'circles';
  if (code.includes('FILL')) return 'solid';
  return 'diagonal';
}

function mapUSCSToColor(uscs: string): string {
  const code = uscs ? uscs.toUpperCase() : '';
  if (code.includes('SAND') || code === 'SP') return '#FEF9C3';
  if (code.includes('CLAY') || code === 'CH') return '#D7CCC8';
  if (code.includes('FILL')) return '#DCFCE7';
  return '#FFFFFF';
}