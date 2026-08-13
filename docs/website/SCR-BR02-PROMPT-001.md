# SCR-BR02-PROMPT-001 — Remodel Studio Governed Image-Edit Prompt Compiler v1.0

**Record ID:** SCR-BR02-PROMPT-001  
**Version:** 1.0  
**Status:** ADOPTED FOR CONTROLLED PROOF  
**Effective date:** 2026-08-12  
**Dependencies:** SCR-META-000, SCR-AIVIS-001, SCR-BR01-001 v1.0, SCR-BR02-001  

## Principle

The source photograph is the visual source of truth. The model is asked to create a **concept visualization**, not redesign the physical facts of the room without authorization.

## Input Contract

The compiler accepts only governed structured inputs:

- project type;
- source-space truth / known constraints;
- Preserve items;
- Change items;
- Must-Have items;
- design direction;
- written customer vision;
- accessibility goals;
- concept ordinal/direction.

No customer name, email, phone, street address, financial-account data or unrelated PII belongs in an image-generation prompt.

## Compilation Order

1. **Task:** Create one photorealistic residential remodel concept from the supplied source image.
2. **Source-truth law:** Preserve the camera viewpoint, room proportions, visible openings, windows, doors, ceiling/floor relationships and fixed architectural facts unless the customer's governed Change instructions explicitly authorize a change.
3. **Preserve law:** Elements marked Preserve should remain visually stable as closely as practical.
4. **Change law:** Alter only the specified or reasonably implied finish/fixture/design elements.
5. **Must-Have law:** Incorporate requested must-have features where visually plausible without pretending feasibility is proven.
6. **Accessibility law:** Accessibility features are conceptual visual ideas only; never imply ADA/code certification.
7. **Direction:** Apply the selected design direction and concept-specific variation.
8. **Restraint:** Do not invent extra windows, doorways, walls, plumbing relocations, room dimensions, structural changes or space that is not supported by the source unless explicitly authorized.
9. **Presentation:** Photorealistic, coherent residential finish quality; no text, measurements, labels, logos, watermarks, architectural callouts or construction-document graphics.
10. **Authority disclosure:** Output is inspiration for contractor review, not a construction drawing, engineering decision, code approval, material guarantee or quote.

## Canonical Prompt Template

```text
Create ONE photorealistic remodel concept by editing the supplied source-space photograph.

PROJECT TYPE
{{project_type}}

SOURCE-SPACE TRUTH / KNOWN CONSTRAINTS
{{source_truth}}

PRESERVE
{{preserve_items}}

CHANGE
{{change_items}}

MUST-HAVE
{{must_have_items}}

ACCESSIBILITY GOALS
{{accessibility_requirements}}

DESIGN DIRECTION
{{design_direction}}

CUSTOMER VISION
{{vision_notes}}

CONCEPT DIRECTION
{{concept_direction}}

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
This is a CONCEPT VISUALIZATION for homeowner discussion and Shell & Co human review. It is NOT a construction drawing, engineering drawing, code or permit approval, final dimension, material guarantee, or construction quote.
```

## Concept Variation Law

A project may generate no more than four controlled concepts. Each call generates one concept. The concept direction must create meaningful aesthetic variation without changing protected source-space facts.

Default founder-approved direction labels:

- Concept A — Clean Modern
- Concept B — Warm Transitional
- Concept C — Spa / Natural
- Concept D — Custom Direction

## Provenance

The system stores:

- compiler record/version;
- SHA-256 hash of the final compiled prompt;
- structured customer selections separately;
- model, quality and size;
- concept ordinal and direction;
- upstream request ID when available;
- generation state/error code.

**Raw compiled prompt text is not retained in the production database by default.** This minimizes sensitive context retention while preserving deterministic provenance through version + structured inputs + prompt hash.

## Human Review Boundary

The prompt may never ask the model to certify GREEN/YELLOW/RED buildability. Those statuses belong only to an authorized human Shell & Co reviewer.

## Next Best Action

Implement this compiler as a pure server-side function used by `generate-concept` and verify its hash/output using synthetic project inputs before any OpenAI request is enabled.
