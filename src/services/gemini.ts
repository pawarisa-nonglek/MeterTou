import { GoogleGenAI, Type } from "@google/genai";


export interface TOUReading {
  reg111: number | null;
  reg010: number | null;
  reg020: number | null;
  reg030: number | null;
  reg015: number | null;
  reg015_printed: number | null;
  reg015_handwritten: number | null;
  reg016: number | null;
  reg016_printed: number | null;
  reg016_handwritten: number | null;
  reg017: number | null;
  reg017_printed: number | null;
  reg017_handwritten: number | null;
  reg118: number | null;
  reg118_printed: number | null;
  reg118_handwritten: number | null;
  reg050: number | null;
  reg060: number | null;
  reg070: number | null;
  reg280: number | null;
  peaMeterId: string | null;
  customerId: string | null;
  customerName: string | null;
  timestamp: string | null;
  confidence: number;
}

export async function analyzeMeterImage(base64Data: string, mimeType: string = "image/jpeg"): Promise<TOUReading> {
  const apiKey = process.env.GEMINI_API_KEY || (window as any).process?.env?.API_KEY || "";
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-3.1-pro-preview";
  
  const prompt = `Analyze this image or document of a TOU (Time of Use) electricity meter or a related document/sticker. 
  
  CRITICAL ACCURACY RULES:
  1. Register 111 (Total Energy) MUST be the mathematical sum of 010 (On-Peak) + 020 (Off-Peak) + 030 (Holiday). 
     Calculation: reg111 = reg010 + reg020 + reg030.
  
  2. Verification Rules (Handwritten - Printed):
     - Register 050 Verification: reg050 = reg015_handwritten - reg015_printed
     - Register 060 Verification: reg060 = reg016_handwritten - reg016_printed
     - Register 070 Verification: reg070 = reg017_handwritten - reg017_printed
     - Register 280 Verification: reg280 = reg118_handwritten - reg118_printed
     
     For each of 015, 016, 017, and 118, extract both the printed (ตัวอักษรพิมพ์) and handwritten (ลายมือเขียน) values if available.
  
  3. Register Codes (รหัส):
     - 111: Total Energy / Cumulative (kWh)
     - 010: On-Peak Energy (kWh)
     - 020: Off-Peak Energy (kWh)
     - 030: Holiday Energy (kWh)
     - 015: On-Peak Demand (kW)
     - 016: Off-Peak Demand (kW)
     - 017: Holiday Demand (kW)
     - 118: Power Factor or other cumulative data
     - 050, 060, 070, 280: Specific verification registers
  
  4. PEA specific info: Look for PEA Meter ID (หมายเลขมิเตอร์), Customer ID (หมายเลขผู้ใช้ไฟฟ้า), and Customer Name (ชื่อผู้ใช้ไฟฟ้า).
  
  Return the data in the following JSON format:
  {
    "reg111": number | null,
    "reg010": number | null,
    "reg020": number | null,
    "reg030": number | null,
    "reg015": number | null,
    "reg015_printed": number | null,
    "reg015_handwritten": number | null,
    "reg016": number | null,
    "reg016_printed": number | null,
    "reg016_handwritten": number | null,
    "reg017": number | null,
    "reg017_printed": number | null,
    "reg017_handwritten": number | null,
    "reg118": number | null,
    "reg118_printed": number | null,
    "reg118_handwritten": number | null,
    "reg050": number | null,
    "reg060": number | null,
    "reg070": number | null,
    "reg280": number | null,
    "peaMeterId": string | null,
    "customerId": string | null,
    "customerName": string | null,
    "timestamp": string | null,
    "confidence": number
  }`;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data.split(",")[1] || base64Data,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reg111: { type: Type.NUMBER, nullable: true },
          reg010: { type: Type.NUMBER, nullable: true },
          reg020: { type: Type.NUMBER, nullable: true },
          reg030: { type: Type.NUMBER, nullable: true },
          reg015: { type: Type.NUMBER, nullable: true },
          reg015_printed: { type: Type.NUMBER, nullable: true },
          reg015_handwritten: { type: Type.NUMBER, nullable: true },
          reg016: { type: Type.NUMBER, nullable: true },
          reg016_printed: { type: Type.NUMBER, nullable: true },
          reg016_handwritten: { type: Type.NUMBER, nullable: true },
          reg017: { type: Type.NUMBER, nullable: true },
          reg017_printed: { type: Type.NUMBER, nullable: true },
          reg017_handwritten: { type: Type.NUMBER, nullable: true },
          reg118: { type: Type.NUMBER, nullable: true },
          reg118_printed: { type: Type.NUMBER, nullable: true },
          reg118_handwritten: { type: Type.NUMBER, nullable: true },
          reg050: { type: Type.NUMBER, nullable: true },
          reg060: { type: Type.NUMBER, nullable: true },
          reg070: { type: Type.NUMBER, nullable: true },
          reg280: { type: Type.NUMBER, nullable: true },
          peaMeterId: { type: Type.STRING, nullable: true },
          customerId: { type: Type.STRING, nullable: true },
          customerName: { type: Type.STRING, nullable: true },
          timestamp: { type: Type.STRING, nullable: true },
          confidence: { type: Type.NUMBER },
        },
        required: ["confidence"],
      },
    },
  });

  try {
    return JSON.parse(response.text || "{}") as TOUReading;
  } catch (error) {
    console.error("Failed to parse Gemini response:", error);
    throw new Error("ไม่สามารถประมวลผลข้อมูลจากรูปภาพได้");
  }
}
