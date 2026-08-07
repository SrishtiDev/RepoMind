import { AgentState, Source } from "../state";

// ─── Helper ───────────────────────────────────────────────────────────────────

async function invokeWithRetry(messages: { role: string; content: string }[], nodeName: string): Promise<string> {
  if (!process.env.AGENTROUTER_API_KEY) {
    throw new Error(`[${nodeName}] AGENTROUTER_API_KEY is not set. Cannot initialise Agent Router.`);
  }

  try {
    const response = await fetch("https://co.agentrouter.org/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.AGENTROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-5.6-sol",
        temperature: 0.2,
        messages: messages,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn(`[${nodeName}] Agent Router 429 Rate Limit hit. Retrying in 2 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return await invokeWithRetry(messages, nodeName);
      }
      throw new Error(`Agent Router API error: ${response.statusText}`);
    }

    const data = (await response.json()) as any;
    return data.choices[0].message.content;
  } catch (err: any) {
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
    const responseText = await invokeWithRetry([
      { role: "system", content: "You are a grounded code assistant. Never hallucinate. Always cite sources." },
      { role: "user", content: answerPrompt },
    ], "Answer");
    rawAnswer = String(responseText).trim();
  } catch (err: any) {
    throw new Error(
      `[Answer] Agent Router generation failed: ${err?.message ?? err}`
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
