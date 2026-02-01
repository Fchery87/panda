import { describe, expect, it } from "bun:test";
import {
  buildMessageWithPlanDraft,
  deriveNextPlanDraft,
  pickLatestDiscussAssistantPlan,
} from "./planDraft";

describe("planDraft helpers", () => {
  it("buildMessageWithPlanDraft prefixes plan once", () => {
    const plan = "1) Step one\n2) Step two";
    const user = "Implement the plan";

    const first = buildMessageWithPlanDraft(plan, user);
    expect(first).toContain("Plan draft:");
    expect(first).toContain(plan);
    expect(first).toContain("User request:");
    expect(first).toContain(user);

    const second = buildMessageWithPlanDraft(plan, first);
    expect(second).toBe(first);
  });

  it("buildMessageWithPlanDraft does not re-prefix if user content already includes a plan block", () => {
    const plan = "1) Step one\n2) Step two";
    const user = "We are switching from Discuss (Plan Mode) to Build (Execute Mode).\n\nPlan draft:\nfoo\n\nOriginal request:\nbar";

    const result = buildMessageWithPlanDraft(plan, user);
    expect(result).toBe(user);
  });

  it("pickLatestDiscussAssistantPlan returns latest discuss assistant content", () => {
    const messages = [
      { role: "user" as const, mode: "discuss" as const, content: "q1" },
      { role: "assistant" as const, mode: "discuss" as const, content: "plan v1" },
      { role: "user" as const, mode: "build" as const, content: "do it" },
      { role: "assistant" as const, mode: "build" as const, content: "code" },
      { role: "assistant" as const, mode: "discuss" as const, content: "plan v2" },
    ];

    expect(pickLatestDiscussAssistantPlan(messages)).toBe("plan v2");
  });

  it("deriveNextPlanDraft only updates on discuss completion and non-empty plan", () => {
    const messages = [
      { role: "user" as const, mode: "discuss" as const, content: "q1" },
      { role: "assistant" as const, mode: "discuss" as const, content: "plan v1" },
    ];

    expect(
      deriveNextPlanDraft({
        mode: "discuss",
        agentStatus: "complete",
        currentPlanDraft: "",
        messages,
      })
    ).toBe("plan v1");

    expect(
      deriveNextPlanDraft({
        mode: "build",
        agentStatus: "complete",
        currentPlanDraft: "",
        messages,
      })
    ).toBeNull();

    expect(
      deriveNextPlanDraft({
        mode: "discuss",
        agentStatus: "streaming",
        currentPlanDraft: "",
        messages,
      })
    ).toBeNull();

    expect(
      deriveNextPlanDraft({
        mode: "discuss",
        agentStatus: "complete",
        currentPlanDraft: "plan v1",
        messages,
      })
    ).toBeNull();
  });
});
