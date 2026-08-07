import { AgentState, MAX_RETRY_COUNT } from "../state";

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
        temperature: 0,
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
 * Assess node: sends the retrieved chunks + original question to Gemini and
 * asks it to decide whether the context is sufficient.
 *
 * Decision logic:
 *  - YES → mark isSufficient=true, flow proceeds to answer node.
 *  - NO + retryCount < MAX_RETRY_COUNT → generate a refined query, increment
 *    retryCount, isSufficient=false (triggers retrieve retry via graph edge).
 *  - NO + retryCount >= MAX_RETRY_COUNT → force isSufficient=true so we answer
 *    with whatever we have rather than looping forever.
 */
export async function assessNode(
  state: AgentState
): Promise<Partial<AgentState>> {
  // Build a compact context string from the retrieved chunks.
  const contextText = state.retrievedChunks
    .map(
      (c, i) =>
        `[${i + 1}] File: ${c.filename} (chunk ${c.chunkIndex})\n${c.content}`
    )
    .join("\n\n---\n\n");

  // ── Sufficiency check ──────────────────────────────────────────────────────

  const sufficiencyPrompt = `You are evaluating whether a set of code snippets contains enough information to answer a developer's question.

Question: ${state.question}

Retrieved Context:
${contextText}

Reply with exactly one of:
  YES: <one-line reason>
  NO: <one-line reason>

Do not add anything else.`;

  let judgement: string;
  try {
    const responseText = await invokeWithRetry([
      { role: "system", content: "You are a strict technical relevance judge. Be concise." },
      { role: "user", content: sufficiencyPrompt },
    ], "Assess");
    judgement = String(responseText).trim().toUpperCase();
  } catch (err: any) {
    throw new Error(
      `[Assess] Agent Router sufficiency check failed: ${err?.message ?? err}`
    );
  }

  const isSufficient = judgement.startsWith("YES");

  console.log(
    `[Assess] Sufficiency verdict (retry ${state.retryCount}/${MAX_RETRY_COUNT}): ${judgement.slice(0, 80)}`
  );

  // ── YES path ───────────────────────────────────────────────────────────────

  if (isSufficient) {
    return { isSufficient: true };
  }

  // ── NO path — retry limit reached, force answer with current context ───────

  if (state.retryCount >= MAX_RETRY_COUNT) {
    console.warn(
      `[Assess] Retry cap (${MAX_RETRY_COUNT}) reached. Forcing answer with available context.`
    );
    return { isSufficient: true }; // break the loop; answer node will caveat
  }

  // ── NO path — generate a refined query for the next retrieval pass ─────────

  const refinePrompt = `The retrieved context was insufficient to answer this question:

Question: ${state.question}

Suggest a single, improved search query (no more than 15 words) that is more likely to retrieve the relevant code. Reply with only the query text.`;

  let refinedQuery: string;
  try {
    const responseText = await invokeWithRetry([
      { role: "user", content: refinePrompt },
    ], "Assess");
    refinedQuery = String(responseText).trim();
  } catch (err: any) {
    throw new Error(
      `[Assess] Agent Router query refinement failed: ${err?.message ?? err}`
    );
  }

  console.log(
    `[Assess] Refined query for retry ${state.retryCount + 1}: "${refinedQuery}"`
  );

  return {
    isSufficient: false,
    refinedQuery,
    retryCount: state.retryCount + 1,
  };
}
