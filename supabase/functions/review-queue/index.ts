import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { json, preflight, requireUser } from "../_shared/core.ts";

const REVIEWER_ROLES = new Set(["reviewer", "admin"]);
const QUEUE_LIMIT = 40;

Deno.serve(async (req: Request) => {
  const options = preflight(req); if (options) return options;
  if (req.method !== "POST") return json(req, 405, { error: "METHOD_NOT_ALLOWED" });

  try {
    const { userId, service } = await requireUser(req);
    const { data: reviewer, error: reviewerError } = await service.auth.admin.getUserById(userId);
    const role = String(reviewer?.user?.app_metadata?.shell_role || "");
    if (reviewerError || !reviewer?.user || !REVIEWER_ROLES.has(role)) {
      return json(req, 403, { error: "NOT_AUTHORIZED" });
    }

    const { data: projects, error: projectsError } = await service
      .from("remodel_projects")
      .select("id,project_type,planning_budget,timing,property_status,source_truth,preserve_items,change_items,must_have_items,design_direction,vision_notes,accessibility_requirements,status,selected_concept_id,retention_expires_at,created_at,updated_at")
      .in("status", ["selected", "reviewed"])
      .not("selected_concept_id", "is", null)
      .gt("retention_expires_at", new Date().toISOString())
      .order("updated_at", { ascending: false })
      .limit(QUEUE_LIMIT);
    if (projectsError) throw projectsError;
    if (!projects?.length) return json(req, 200, { queue: [], count: 0 });

    const conceptIds = projects.map((project) => project.selected_concept_id).filter(Boolean);
    const { data: concepts, error: conceptsError } = await service
      .from("remodel_concepts")
      .select("id,project_id,result_asset_id,ordinal,concept_direction,model,quality,image_size,status,created_at")
      .in("id", conceptIds)
      .eq("status", "completed");
    if (conceptsError) throw conceptsError;

    const completed = concepts || [];
    const assetIds = completed.map((concept) => concept.result_asset_id).filter(Boolean);
    const { data: assets, error: assetsError } = assetIds.length
      ? await service.from("remodel_assets")
        .select("id,bucket,object_path,mime_type,size_bytes,validation_status")
        .in("id", assetIds)
        .eq("kind", "concept")
        .eq("validation_status", "ready")
      : { data: [], error: null };
    if (assetsError) throw assetsError;

    const { data: reviews, error: reviewsError } = completed.length
      ? await service.from("buildability_reviews")
        .select("id,project_id,concept_id,status,notes,created_at,updated_at")
        .in("concept_id", completed.map((concept) => concept.id))
      : { data: [], error: null };
    if (reviewsError) throw reviewsError;

    const conceptById = new Map(completed.map((concept) => [concept.id, concept]));
    const assetById = new Map((assets || []).map((asset) => [asset.id, asset]));
    const reviewByConcept = new Map((reviews || []).map((review) => [review.concept_id, review]));
    const queue = [];

    for (const project of projects) {
      const concept = conceptById.get(project.selected_concept_id);
      const asset = concept ? assetById.get(concept.result_asset_id) : null;
      if (!concept || !asset) continue;
      const { data: signed, error: signedError } = await service.storage
        .from(asset.bucket)
        .createSignedUrl(asset.object_path, 300);
      if (signedError || !signed?.signedUrl) continue;

      queue.push({
        project: {
          id: project.id,
          project_type: project.project_type,
          planning_budget: project.planning_budget,
          timing: project.timing,
          property_status: project.property_status,
          source_truth: project.source_truth,
          preserve_items: project.preserve_items,
          change_items: project.change_items,
          must_have_items: project.must_have_items,
          design_direction: project.design_direction,
          vision_notes: project.vision_notes,
          accessibility_requirements: project.accessibility_requirements,
          status: project.status,
          retention_expires_at: project.retention_expires_at,
          created_at: project.created_at,
          updated_at: project.updated_at,
        },
        concept: {
          id: concept.id,
          ordinal: concept.ordinal,
          direction: concept.concept_direction,
          model: concept.model,
          quality: concept.quality,
          image_size: concept.image_size,
          created_at: concept.created_at,
        },
        result: {
          signed_url: signed.signedUrl,
          expires_in_seconds: 300,
          mime_type: asset.mime_type,
          size_bytes: asset.size_bytes,
        },
        review: reviewByConcept.get(concept.id) || null,
      });
    }

    return json(req, 200, { queue, count: queue.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message === "NOT_AUTHORIZED") return json(req, 401, { error: "NOT_AUTHORIZED" });
    return json(req, 500, { error: "REVIEW_QUEUE_FAILED" });
  }
});
