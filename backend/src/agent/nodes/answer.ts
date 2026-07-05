import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { AgentState, Source } from "../state";

// ─── LLM Factory ─────────────────────────────────────────────────────────────

function getLLM(): ChatGroq {
  if (!process.env.GROQ_API_KEY) {
    throw new Error(
      "[Answer] GROQ_API_KEY is not set. Cannot initialise Groq."
    );
  }
  return new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "openai/gpt-oss-120b",
    temperature: 0.2, // slight creativity for natural prose, still grounded
    maxRetries: 0, // Custom retry logic handles this
  });
}

// ─── Helper ───────────────────────────────────────────────────────────────────

async function invokeWithRetry(llm: ChatGroq, messages: any[], nodeName: string) {
  try {
    return await llm.invoke(messages);
  } catch (err: any) {
    if (err?.status === 429 || err?.message?.includes("429")) {
      console.warn(`[${nodeName}] Groq 429 Rate Limit hit. Retrying in 2 seconds...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return await llm.invoke(messages);
    }
    throw err;
  }
}

// ─── Node ─────────────────────────────────────────────────────────────────────

/**
 * Answer node: synthesises a grounded response from the final retrieved chunks.
 *
 * Key constraints enforced via the system prompt:
 *  1. Answer ONLY from the provided context — no external knowledge.
 *  2. Inline citations in the form [filename:chunkIndex] must be included.
 *  3. If the context is empty or irrelevant, return the standard fallback
 *     message rather than hallucinating an answer.
 */
export async function answerNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  if (state.retrievedChunks.length === 0) {
    // No chunks survived retrieval — skip the LLM call entirely.
    return {
      answer:
        "I couldn't find relevant information in this repo to answer your question.",
      sources: [],
    };
  }

  const llm = getLLM();

  // Build a labelled context block so the model can construct accurate citations.
  const contextBlock = state.retrievedChunks
    .map(
      (c) =>
        `[${c.filename}:${c.chunkIndex}]\nFile: ${c.filepath}\n\`\`\`\n${c.content}\n\`\`\``
    )
    .join("\n\n");

  const answerPrompt = `You are a code-level Q&A assistant for the RepoMind system. Answer the developer's question STRICTLY using the context below.

Rules:
1. Every factual claim must be followed by an inline citation in the form [filename:chunkIndex].
2. Do NOT use any knowledge outside the provided context.
3. If the context does not contain enough information to answer, respond with exactly:
   "I couldn't find relevant information in this repo to answer your question."
4. Be concise and technically precise. Prefer code snippets over prose when relevant.

---

CONTEXT:
${contextBlock}

---

QUESTION: ${state.question}`;

  let rawAnswer: string;
  try {
    const response = await invokeWithRetry(llm, [
      new SystemMessage(
        "You are a grounded code assistant. Never hallucinate. Always cite sources."
      ),
      new HumanMessage(answerPrompt),
    ], "Answer");
    rawAnswer = String(response.content).trim();
  } catch (err: any) {
    throw new Error(
      `[Answer] Groq generation failed: ${err?.message ?? err}`
    );
  }

  // Build the sources list from chunks that were actually available.
  // We include all retrieved chunks as potential sources — the citations in the
  // answer text indicate which were actually used.
  const sources: Source[] = state.retrievedChunks.map((c) => ({
    filename: c.filename,
    filepath: c.filepath,
    chunkIndex: c.chunkIndex,
  }));

  console.log(
    `[Answer] Generated answer (${rawAnswer.length} chars) with ${sources.length} source(s).`
  );

  return { answer: rawAnswer, sources };
}
