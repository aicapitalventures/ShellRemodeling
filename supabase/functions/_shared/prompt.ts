import { sanitizeText, sha256Hex, stringArray } from "./core.ts";

export const PROMPT_VERSION = "SCR-BR02-PROMPT-001-v1.0";

export type PromptInput = {
  projectType: string;
  sourceTruth?: string;
  preserve?: unknown;
  change?: unknown;
  mustHave?: unknown;
  designDirection?: string;
  visionNotes?: string;
  accessibilityRequirements?: string;
  conceptDirection?: string;
};

function bullets(items: string[]): string {
  return items.length ? items.map((x) => `- ${x}`).join("\n") : "- None specified";
}

export async function compileRemodelPrompt(input: PromptInput): Promise<{ prompt: string; hash: string; version: string }> {
  const projectType = sanitizeText(input.projectType, 120) || "Residential remodel";
  const sourceTruth = sanitizeText(input.sourceTruth, 2000) || "Use the supplied photograph as the controlling source-space truth.";
  const preserve = stringArray(input.preserve);
  const change = stringArray(input.change);
  const mustHave = stringArray(input.mustHave);
  const designDirection = sanitizeText(input.designDirection, 120) || "Clean Modern";
  const visionNotes = sanitizeText(input.visionNotes, 2000) || "No additional written vision supplied.";
  const accessibility = sanitizeText(input.accessibilityRequirements, 1000) || "No additional accessibility requirements supplied.";
  const conceptDirection = sanitizeText(input.conceptDirection, 160) || designDirection;

  const prompt = `Create ONE photorealistic remodel concept by editing the supplied source-space photograph.

PROJECT TYPE
${projectType}

SOURCE-SPACE TRUTH / KNOWN CONSTRAINTS
${sourceTruth}

PRESERVE
${bullets(preserve)}

CHANGE
${bullets(change)}

MUST-HAVE
${bullets(mustHave)}

ACCESSIBILITY GOALS
${accessibility}

DESIGN DIRECTION
${designDirection}

CUSTOMER VISION
${visionNotes}

CONCEPT DIRECTION
${conceptDirection}

SOURCE TRUTH RULES
- Treat the source photograph as the controlling visual geometry.
- Keep the camera viewpoint and overall room geometry as close to the source as practical.
- Preserve visible windows, doors, openings, floor/ceiling relationships, and fixed architectural facts unless a governed CHANGE instruction explicitly authorizes changing them.
- Do not invent extra square footage, hidden rooms, extra windows/doors, structural openings, plumbing moves, or dimensional changes merely to make the design easier.
- If a requested feature conflicts with a PRESERVE instruction or source-space fact, favor the PRESERVE/source-space fact and produce a restrained concept.

VISUAL OBJECTIVE
- Show a believable finished remodel direction with coherent materials, fixtures, tile, lighting and finishes appropriate to the selected design direction.
- No text, labels, measurements, pricing, logos, watermarks, permit notes, engineering notes, or construction-document graphics.

IMPORTANT
This is a CONCEPT VISUALIZATION for homeowner discussion and Shell & Co human review. It is NOT a construction drawing, engineering drawing, code or permit approval, final dimension, material guarantee, or construction quote.`;

  return { prompt, hash: await sha256Hex(prompt), version: PROMPT_VERSION };
}
