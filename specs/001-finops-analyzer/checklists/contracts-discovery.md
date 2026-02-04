# Contracts Discovery Checklist

Use this checklist to identify what patterns/contracts your project needs.
For each item, ask: "Do I know exactly how to handle this? If not, research → contract."

## 1. External API Interactions

For EACH external API you call:

- [ ] **Authentication** - How do you authenticate? Token refresh? Expiry handling?
- [ ] **Rate Limiting** - What are the limits? How do you handle 429s? Retry strategy?
- [ ] **Error Responses** - What errors can occur? How do you parse them? User-friendly messages?
- [ ] **Pagination** - Does it paginate? How do you fetch all pages?
- [ ] **Timeouts** - What's a reasonable timeout? What happens on timeout?
- [ ] **Retries** - Which errors are retryable? How many times? Backoff strategy?

### For This Project:
- [ ] GitHub REST API (billing endpoints)
- [ ] Azure DevOps REST API (user entitlements, pipelines, agents)

---

## 2. Agent/LLM Orchestration

- [ ] **Session Lifecycle** - How do you create/destroy sessions? Cleanup on error?
- [ ] **Tool Registration** - How do you define tools? Parameter validation?
- [ ] **Prompt Engineering** - What's the system message structure? Context format?
- [ ] **Streaming** - How do you handle streaming responses? Events?
- [ ] **Timeouts** - What if LLM takes too long? How do you cancel?
- [ ] **Error Handling** - What if session fails? Tool throws? LLM hallucinates?

### For This Project:
- [ ] Copilot SDK session management
- [ ] Tool definition patterns
- [ ] Multi-agent coordination

---

## 3. Error Handling

- [ ] **Error Types** - What categories of errors exist? (network, auth, validation, business logic)
- [ ] **Error Propagation** - Do errors bubble up? Get wrapped? Get logged?
- [ ] **User Messages** - How do you convert technical errors to user-friendly messages?
- [ ] **Partial Failure** - What if one API fails but others succeed? Continue or abort?
- [ ] **Recovery** - Can you recover from errors? Retry? Fallback?

---

## 4. Configuration

- [ ] **Sources** - Env vars? Config files? CLI args? Priority order?
- [ ] **Validation** - How do you validate config? What happens on invalid config?
- [ ] **Secrets** - How do you handle secrets? Never log them?
- [ ] **Defaults** - What are sensible defaults? Are they documented?

---

## 5. Testing

- [ ] **Unit Tests** - How do you structure them? What's the naming convention?
- [ ] **Mocking** - How do you mock external APIs? LLM sessions?
- [ ] **Integration Tests** - Do you hit real APIs? How do you handle credentials?
- [ ] **Test Data** - Where do fixtures come from? How do you maintain them?

---

## 6. Output/Reporting

- [ ] **Formats** - What output formats? JSON schema? Markdown structure?
- [ ] **Validation** - How do you validate output matches schema?
- [ ] **Streaming** - Do you stream output or batch it?

---

## 7. Logging & Observability

- [ ] **Log Levels** - What gets logged at each level? (debug, info, warn, error)
- [ ] **Structured Logging** - JSON logs? What fields are included?
- [ ] **Sensitive Data** - How do you redact secrets from logs?

---

## 8. CLI/User Interface

- [ ] **Argument Parsing** - How do you parse and validate args?
- [ ] **Help Text** - What does --help show?
- [ ] **Progress Indication** - How do you show progress for long operations?
- [ ] **Exit Codes** - What exit codes for success/failure?

---

## Quick Assessment for FinOps Agent

| Area | Have Contract? | Need Research? |
|------|----------------|----------------|
| Copilot SDK patterns | ✅ agent-pattern.reference.ts | No |
| Test patterns | ✅ test-pattern.reference.ts | No |
| GitHub rate limiting | ✅ rate-limiting.reference.ts | No |
| Azure DevOps API | ❌ | **YES** |
| Error handling | ❌ | **YES** |
| Configuration | ❌ | Maybe |
| Logging | ❌ | Maybe |
| CLI patterns | ❌ | Maybe |

---

## How To Use This

1. Go through each section
2. For items you're unsure about → Research → Create contract
3. For items you know well → Write contract directly (or skip if trivial)
4. Update spec.md to reference contracts
5. Run speckit.tasks → tasks will follow contracts
