/**
 * classifyTags.ts - Classifies a user's question against the semantic taxonomy
 * to determine relevant tags for GraphRAG traversal.
 */
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { TAXONOMY, VALID_TAGS } from "../../semantic/taxonomy";
import { geminiRateLimiter } from "../../lib/rateLimiter";

const model = new ChatGoogleGenerativeAI({
  model: "gemini-flash-latest",
  temperature: 0.1,
});

export async function classifyQuestionTags(question: string): Promise<string[]> {
  const taxonomyText = Object.entries(TAXONOMY)
    .map(([tag, desc]) => `- ${tag}: ${desc}`)
    .join("\n");

  const prompt = `You are a query classifier for a code repository Q&A system.
Given the user's question, determine which code tags (0 to 3 max) are most relevant to answering the question.
Return ONLY a JSON array of strings containing the tags. Do not include markdown fences, prose, or conversational text.

Taxonomy:
${taxonomyText}

Question: "${question}"`;

  let rawContent: any;
  try {
    const response = await geminiRateLimiter.schedule(() => model.invoke(prompt));
    rawContent = response.content;

    // Defensively convert content to string regardless of response shape
    let content = typeof rawContent === "string" ? rawContent
      : (rawContent && typeof rawContent === "object" && "text" in rawContent)
          ? String((rawContent as any).text)
          : String(rawContent);

    // Extract the JSON array from the first '[' to the last ']'
    const match = content.match(/\[[\s\S]*\]/);
    if (match) content = match[0];

    // Strip markdown fences defensively
    content = content.trim();
    if (content.startsWith("```")) {
      const lines = content.split("\n");
      if (lines[0].startsWith("```")) lines.shift();
      if (lines[lines.length - 1].startsWith("```")) lines.pop();
      content = lines.join("\n").trim();
    }

    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) {
      throw new Error("Parsed result is not an array");
    }

    // Validate against taxonomy and limit to 3
    const validTags = parsed.filter((t: unknown) => typeof t === "string" && VALID_TAGS.has(t as string));
    return validTags.slice(0, 3) as string[];
  } catch (err) {
    console.error("[GraphRAG] Failed to classify tags for question:", err);
    if (rawContent !== undefined) {
      console.error("[GraphRAG] Raw response (truncated):", String(rawContent).substring(0, 200));
    }
    // Graceful degradation: return empty array so it falls back to vector-only
    return [];
  }
}
