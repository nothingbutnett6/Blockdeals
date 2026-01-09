import { GoogleGenAI, Type } from "@google/genai";
import { BlockDeal } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API_KEY not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const fetchRealtimeDeals = async (): Promise<BlockDeal[]> => {
  const ai = getClient();
  if (!ai) return [];

  const prompt = `
    Act as a financial data extraction engine. Search for the latest 'block deals' and 'bulk deals' data in the Indian Stock Market (NSE/BSE) from the last 7 days.
    
    Target:
    - Identify 5-8 MAJOR transactions (High value, famous companies, or significant stake changes).
    - Prioritize reporting from reliable sources like Moneycontrol, Economic Times, NSE/BSE Bulk Deal data, or LiveMint.
    
    Extraction Rules (Crucial):
    1. **Quantity**: Must be the EXACT number of shares traded. (e.g., if news says "20 Lakh shares", return 2000000).
    2. **Price**: The execution price per share in INR.
    3. **Deal Type**: Classify strictly based on the entities:
       - 'promoter-exit' (Promoter/Founder group selling)
       - 'fii-entry' (Foreign funds buying new stake)
       - 'insider-buy' (Promoters/CXOs increasing stake)
       - 'stake-sale' (Large investor exiting/reducing)
       - 'block-transfer' (Fund-to-fund transfer with no major price impact)
       - 'ipo-anchor' (Anchor investors selling after lock-in)
    4. **Description**: Write a "Web3 Is Going Great" style commentary. Be cynical, witty, and observant. Mention if the deal was at a discount or premium.
    
    Return the data strictly as a JSON array matching the schema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date: { type: Type.STRING, description: "YYYY-MM-DD format" },
              title: { type: Type.STRING, description: "Sensationalist, catchy headline" },
              symbol: { type: Type.STRING, description: "NSE/BSE Ticker Symbol (e.g. ZOMATO)" },
              companyName: { type: Type.STRING },
              amountCr: { type: Type.NUMBER, description: "Total Deal Value in Crores (Float)" },
              quantity: { type: Type.NUMBER, description: "Exact number of shares (Integer)" },
              price: { type: Type.NUMBER, description: "Price per share in INR (Float)" },
              dealType: { type: Type.STRING, description: "one of: fii-entry, promoter-exit, insider-buy, block-transfer, stake-sale" },
              direction: { type: Type.STRING, enum: ["buy", "sell", "transfer"] },
              buyer: { type: Type.STRING, description: "Name of buying entity" },
              seller: { type: Type.STRING, description: "Name of selling entity" },
              description: { type: Type.STRING, description: "Witty commentary, 2-3 sentences" },
              sourceUrl: { type: Type.STRING, description: "URL of the specific news report" }
            },
            required: ["date", "symbol", "amountCr", "title", "quantity", "price"]
          }
        }
      }
    });

    const data = JSON.parse(response.text || "[]");
    
    // Get grounding metadata for sources if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const webSources = groundingChunks
      .map((c: any) => c.web?.uri)
      .filter((uri: string) => uri);

    return data.map((item: any, index: number) => ({
      id: `live-${item.symbol}-${index}-${Date.now()}`,
      date: item.date,
      title: item.title,
      stock: { symbol: item.symbol, name: item.companyName },
      amount: Math.round((item.amountCr || 0) * 10000000 * 100), // Convert Cr to Paise
      amountDisplay: `₹${item.amountCr} Cr`,
      quantity: item.quantity,
      price: item.price,
      dealType: (item.dealType || 'block-transfer').toLowerCase().replace(/\s+/g, '-'),
      direction: item.direction || 'transfer',
      discount: 0, 
      body: item.description,
      buyer: item.buyer || 'Unknown',
      seller: item.seller || 'Unknown',
      tags: ["Live Data", item.symbol, item.dealType],
      sources: item.sourceUrl 
        ? [{ name: "Source", url: item.sourceUrl }] 
        : webSources.length > 0 
          ? [{ name: "News Source", url: webSources[0] }]
          : [{ name: "NSE/BSE", url: "#" }]
    }));

  } catch (error) {
    console.error("Failed to fetch real-time deals:", error);
    return [];
  }
};

export const analyzeDeal = async (deal: BlockDeal): Promise<string> => {
  const ai = getClient();
  if (!ai) return "API Key missing. Cannot generate analysis.";

  const prompt = `
    You are a cynical financial satirist. Analyze this Indian stock market block deal.
    
    Deal: ${deal.title}
    Company: ${deal.stock.name} (${deal.stock.symbol})
    Type: ${deal.dealType}
    Value: ${deal.amountDisplay}
    Price: ₹${deal.price} per share
    Quantity: ${deal.quantity} shares
    Buyer: ${deal.buyer}
    Seller: ${deal.seller}
    Context: ${deal.body}
    
    Task:
    Provide a "Hot Take" (max 80 words).
    - Focus on the *motive*. Is the promoter cashing out to buy a yacht? Are FIIs panic selling? Is this just a tax harvest?
    - Be witty and slightly snarky.
    - If the price is unavailable, speculate based on the type.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });
    return response.text || "No analysis generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to analyze deal. Please try again later.";
  }
};

export const getMarketSentiment = async (deals: BlockDeal[]): Promise<string> => {
  const ai = getClient();
  if (!ai) return "API Key missing.";

  // Summarize the last 5 deals for context
  const recentDeals = deals.slice(0, 5).map(d => 
    `- ${d.stock.symbol}: ${d.dealType} of ${d.amountDisplay}`
  ).join('\n');

  const prompt = `
    Based on these recent major block deals in India, provide a 1-sentence sarcastic or insightful market sentiment summary.
    Are big hands buying or fleeing?
    
    Recent Deals:
    ${recentDeals}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Market is confused.";
  } catch (error) {
    return "Sentiment unavailable.";
  }
};