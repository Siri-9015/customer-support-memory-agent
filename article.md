# I Gave My Support Agent a Memory. Here's What Changed.

The first time I watched our AI support agent ask a returning customer "What operating system are you using?" — the same customer who'd answered that question three conversations ago — I knew the stateless chatbot model was fundamentally broken.

The conversation history was right there in the database. The customer's environment, their router model, the two things we'd already tried — all of it had been collected and then discarded at session close. Every new conversation started from scratch. That's not a support agent. That's an expensive autocomplete.

So I rebuilt it with a memory layer using [Hindsight](https://hindsight.vectorize.io/), and the difference in quality is immediately visible the second a returning customer types their first message.

---

## What RecallDesk Does

RecallDesk is an AI customer support agent where persistent memory is the core design constraint, not an afterthought. The goal: a customer should never have to answer the same question twice.

The architecture is a five-step loop per conversation turn:

1. **Recall** — Before generating any response, query Hindsight for memories relevant to this customer and this message
2. **Prompt** — Inject those recalled memories into the system prompt as explicit context
3. **Generate** — Send the enriched prompt to Groq (llama-3.3-70b-versatile) and get a response
4. **Extract** — Run a second lightweight LLM call to pull durable facts out of the conversation turn
5. **Retain** — Store those extracted facts back into Hindsight for future recall

The stack is a FastAPI backend, a React + Vite + Tailwind frontend, Groq for inference, and [Hindsight](https://github.com/vectorize-io/hindsight) as the persistent memory layer. Each customer gets a completely isolated memory bank — `recalldesk-{customer_id}` — so there's zero cross-customer data leakage.

---

## The Memory Loop in Detail

### Recall before you speak

The most important design decision was making memory retrieval the *first* thing that happens on every `/chat` request, before the LLM is invoked at all:

```python
# Step 1: Recall relevant memories
recalled = await memory.recall(customer_id=customer_id, query=user_message)

# Step 2 & 3: Generate with those memories injected
response_text = await llm.generate_response(
    customer_message=user_message,
    memories=recalled,
)
```

This forces the system to always ask "what do we already know about this customer?" before generating a response. The recalled memories get formatted into the system prompt:

```python
MEMORY_INJECTION_TEMPLATE = """
=== CUSTOMER MEMORY (retrieved from persistent store) ===
The following information was recalled from this customer's history.
Use it to personalise your response. Do NOT ask the customer to re-explain these facts.

{memories}

=== END OF CUSTOMER MEMORY ===
"""
```

The instruction "Do NOT ask the customer to re-explain these facts" is load-bearing. Without it, the LLM will still ask clarifying questions even when the answer is sitting right there in the context. LLMs have a strong prior toward asking questions — you have to explicitly override it.

### Extracting facts after every turn

After the agent responds, a second Groq call runs to extract durable facts from the conversation:

```python
EXTRACTION_SYSTEM_PROMPT = """You are a memory extraction assistant for a customer support system.

Extract facts in these categories:
- ENVIRONMENT: OS, hardware, software versions, device types, router models, etc.
- ISSUE: The specific problem the customer reported
- SOLUTION: Steps that were tried or recommended
- PREFERENCE: Customer preferences or constraints
- OUTCOME: Whether the issue was resolved or not

Rules:
- Extract only factual, specific information (not opinions or pleasantries)
- Each fact must be a single, self-contained sentence
- Maximum 8 facts per conversation turn
"""
```

Temperature is set to 0.2 for this call — you want consistent, deterministic extraction, not creativity. The output is a flat list of sentences, each tagged with a context category, then each one gets retained into Hindsight:

```python
for fact in facts:
    await memory.retain(
        customer_id=customer_id,
        content=fact["content"],
        context=fact.get("context"),
    )
```

The separation of concerns here matters: the *response LLM call* is optimized for helpfulness and tone, the *extraction LLM call* is optimized for structured fact capture. Using one call for both produces mediocre results at both tasks.

### The async fix that actually matters

One issue I hit immediately: the Hindsight Python SDK's sync convenience methods (`recall()`, `retain()`, `reflect()`) internally call `asyncio.run_until_complete()`. That works fine in a script, but inside a FastAPI app there's already a running event loop — and you can't nest `run_until_complete` inside a running loop.

The fix is to use the SDK's native async methods (`arecall`, `aretain`, `areflect`) and make your wrapper methods async throughout. If you're building on FastAPI or any other async Python framework, reach for the `a`-prefixed methods from the start. The [Hindsight docs](https://hindsight.vectorize.io/) are explicit about this — the sync wrappers exist for scripts and REPLs only.

---

## The Before and After

The clearest way to show what memory changes is a concrete interaction.

**Without memory — first conversation:**

> Customer: "My Wi-Fi keeps disconnecting."
> Agent: "I'm sorry to hear that. What operating system are you using? What router model do you have?"

**Without memory — next week, same customer:**

> Customer: "The Wi-Fi problem is back."
> Agent: "I'm sorry to hear that. What operating system are you using? What router model do you have?"

The agent has no idea this is a returning customer. It starts from zero every time.

**With Hindsight memory — returning customer:**

> Customer: "The Wi-Fi problem is back."
> Agent: "I can see from your history that you're on Windows 11 with a TP-Link Archer AX73, and we previously tried updating the Wi-Fi adapter driver which gave temporary relief. Since that didn't hold, let's look at the power management settings next — Windows sometimes aggressively powers down the adapter..."

The recalled memories visible in the UI at that moment:

- *"Customer Alice uses Windows 11 on a Dell XPS 15 laptop."* [environment]
- *"Alice's router is a TP-Link Archer AX73 connected via 5GHz band."* [environment]
- *"Previously tried: updating the Wi-Fi adapter driver — provided temporary relief but issue returned."* [solution]

Three facts, retrieved by semantic similarity to the query "The Wi-Fi problem is back", each stored from a prior session. The agent didn't ask for any of it.

---

## Hindsight's Role in the Stack

[Hindsight](https://vectorize.io/what-is-agent-memory) handles what I'd call the "memory infrastructure" problem — the part that sounds simple until you build it yourself. Each customer's memory bank is semantically indexed, so recall isn't a keyword search or a database `WHERE` clause, it's a vector similarity query against the customer's full history. You ask "Wi-Fi disconnection issue" and it surfaces the stored facts most relevant to that query, even if the stored facts don't contain those exact words.

The `retain` / `recall` / `reflect` API surface is deliberately minimal:

- `retain` — store a fact with optional context tag and timestamp
- `recall` — retrieve the most relevant facts for a query
- `reflect` — ask Hindsight to synthesise an answer from stored memories directly

For RecallDesk I'm using `retain` and `recall` in the live chat loop, with `reflect` available for deeper summarisation. The bank isolation model (`recalldesk-{customer_id}`) means you get per-customer vector stores without managing infrastructure — each bank is independently queryable.

---

## Lessons Learned

**1. Retrieval before generation is non-negotiable.**
If you recall memories *after* generating a response, you've already produced a generic answer. The memory has to arrive in the context window before the LLM constructs its response. This sounds obvious but it's easy to bolt memory on as a post-processing step and wonder why the agent doesn't use it.

**2. Separate the response call from the extraction call.**
Using a single LLM call to both respond to the customer and extract facts produces a worse response and worse extraction. Two focused calls with different temperature settings and different prompts is the right pattern.

**3. Explicit prompting beats implicit context.**
Just injecting memories into the context isn't enough. You need to explicitly instruct the model to use them and to *not* ask questions it already has answers to. LLMs have a strong clarifying-question habit that needs to be overridden.

**4. Async-first if you're on FastAPI.**
The sync SDK wrappers will blow up inside an async framework. Start with the `a`-prefixed async methods from day one.

**5. The fallback is load-bearing.**
I built an in-memory fallback store that activates automatically when Hindsight is unreachable. This means the app always works — memory just doesn't persist across restarts. For development and demos where you don't want to spin up Docker, this is essential. Don't skip the fallback path.

---

## What's Next

The current implementation stores facts extracted from individual turns. The natural next step is storing multi-turn conversation summaries — so the agent has a higher-level view of each support engagement, not just a bag of extracted sentences.

After that: using Hindsight's `reflect` operation for proactive suggestions. Instead of waiting for the customer to describe a problem, query the memory bank before the conversation starts — "what patterns does this customer's history suggest?" — and have the agent open with personalised context.

The core insight is that support quality correlates directly with memory quality. The agent doesn't need to be smarter, it needs to remember more and forget less.
