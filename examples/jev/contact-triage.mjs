/**
 * examples/jev/contact-triage.mjs
 *
 * EXAMPLE ONLY — not wired into any page or build step.
 *
 * This repo is currently a fully static GitHub Pages site (see index.html /
 * _config.yml): there is no server, no contact form, and no backend request
 * handler to hang a real integration off of. This file exists so that if/when
 * a server-side handler (e.g. a contact form submission endpoint, a
 * serverless function, etc.) is added, wiring in a fast typed decision via
 * Jev (TypeSafe AI, https://typesafe.ai) is a copy-paste away instead of a
 * from-scratch integration.
 *
 * What it demonstrates: given a hypothetical contact-form submission, ask
 * three typed questions about it in one call to `system_one`:
 *   - choice: which category does this message fall into?
 *   - score:  how urgent is it, on an ordered rubric?
 *   - noul:   yes/no — does this look like spam?
 *
 * Design notes (per this project's integration conventions):
 *   - The `@typesafe-ai/sdk` package is imported lazily (inside the
 *     function), not at module load time, so simply importing this file
 *     never fails just because the dependency isn't installed.
 *   - The API key is read ONLY from the TYPESAFE_API_KEY environment
 *     variable. It is never hardcoded and never has a fallback literal.
 *   - Failure modes (missing package, missing key, API error) are turned
 *     into a clear, typed error rather than a crash/stack trace, and the
 *     caller decides what to do (e.g. skip classification and fall back to
 *     default routing).
 *
 * Real package: `@typesafe-ai/sdk` on npm (MIT, published by typesafe.ai).
 * NOTE: the unscoped `typesafe-sdk` npm package is an unrelated, squatted
 * package — do not install or import that one.
 */

/**
 * Thin, isolated wrapper around Jev's `system_one` typed-decision call.
 *
 * @param {{ subject?: string, body: string, fromEmail?: string }} submission
 *   The contact-form submission to triage.
 * @returns {Promise<{
 *   category: string,
 *   categoryConfidence: number,
 *   urgency: string,
 *   urgencyScore: number,
 *   isSpam: boolean,
 *   isSpamProbability: number,
 * }>}
 * @throws {Error} with a clear, actionable message if the `@typesafe-ai/sdk`
 *   package isn't installed, if TYPESAFE_API_KEY isn't set, or if the Jev
 *   API call itself fails. Never throws a raw/opaque exception.
 */
export async function triageContactMessage(submission) {
  if (!submission || typeof submission.body !== "string" || !submission.body.trim()) {
    throw new Error("triageContactMessage: submission.body is required");
  }

  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Jev is not configured: the TYPESAFE_API_KEY environment variable is not set. " +
        "Set it (e.g. in your deployment environment's secrets) to enable contact-form " +
        "triage, or catch this error and fall back to unclassified handling."
    );
  }

  // Lazy import: importing this module never fails just because the
  // optional dependency isn't installed. Only calling triageContactMessage
  // does, and it fails with a clear message instead of crashing the caller.
  let sdk;
  try {
    sdk = await import("@typesafe-ai/sdk");
  } catch (err) {
    throw new Error(
      "Jev is not available: the '@typesafe-ai/sdk' package is not installed. " +
        "Run `npm install @typesafe-ai/sdk` in this directory to enable contact-form " +
        `triage. Original error: ${err && err.message ? err.message : err}`
    );
  }

  const { TypeSafeClient, choice, score, noul } = sdk;

  const client = new TypeSafeClient({ apiKey });

  const state = {
    subject: submission.subject ?? "",
    body: submission.body,
    fromEmail: submission.fromEmail ?? "",
  };

  let result;
  try {
    result = await client.system_one(state, {
      category: choice({
        prompt: "What is this contact-form message primarily about?",
        options: ["general", "collaboration", "job_opportunity", "bug_report", "spam_or_abuse"],
      }),
      urgency: score({
        prompt: "How urgent is a reply to this message?",
        rubric: ["low", "normal", "high", "critical"],
      }),
      isSpam: noul({
        prompt: "Is this message spam, a scam, or unsolicited marketing?",
      }),
    });
  } catch (err) {
    throw new Error(
      `Jev request failed: ${err && err.message ? err.message : err}. ` +
        "Falling back to unclassified/manual handling is recommended."
    );
  }

  return {
    category: result.category.value,
    categoryConfidence: result.category.confidence,
    urgency: result.urgency.value,
    urgencyScore: result.urgency.score,
    isSpam: result.isSpam.value,
    isSpamProbability: result.isSpam.probability,
  };
}

// Allow running this file directly for a quick manual smoke test:
//   TYPESAFE_API_KEY=sk-... node examples/jev/contact-triage.mjs
if (import.meta.url === `file://${process.argv[1]}`) {
  const sample = {
    subject: "Interested in working together",
    body: "Hi! I loved your portfolio and would love to collaborate on a project. Are you available for freelance work?",
    fromEmail: "someone@example.com",
  };

  triageContactMessage(sample)
    .then((decision) => {
      console.log("Jev triage result:", decision);
    })
    .catch((err) => {
      console.error(err.message);
      process.exitCode = 1;
    });
}
