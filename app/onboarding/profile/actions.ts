"use server";

import { redirect } from "next/navigation";
import {
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from "@/lib/supabase/server";
import { ensureNotOperator } from "@/lib/auth/user";
import { SITE_OWNER_ID } from "@/lib/auth/operator";
import { ProfileSchema } from "@/lib/validation/profile";

/**
 * V2 온보딩 Step 1 (`/onboarding/profile`) — 가입자 본인 기본 정보 제출.
 *
 * PRD §3.1.2 — Step 1 완료 시점에 friends row 생성 (status='pending',
 * onboarding_step=2). 재방문 시엔 같은 row 의 프로필 필드만 업데이트.
 */
export async function submitOnboardingProfileAction(
  formData: FormData,
): Promise<void> {
  const sb = await createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user?.id) redirect("/login");

  // 운영자 우회 차단
  await ensureNotOperator();

  // 필수 4 + 선택 7 검증
  const parsed = ProfileSchema.parse(Object.fromEntries(formData.entries()));

  const service = createSupabaseServiceClient();
  const existing = await service
    .from("friends")
    .select("id, status, onboarding_step")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existing.error) throw existing.error;

  if (!existing.data) {
    // 첫 가입 — INSERT
    const ins = await service.from("friends").insert({
      owner_id: SITE_OWNER_ID,
      auth_user_id: user.id,
      email: user.email ?? null,
      ...parsed,
      status: "pending",
      onboarding_step: 2,
    });
    if (ins.error) throw ins.error;
  } else {
    // 이미 row 있음 — 프로필 필드만 갱신. status / onboarding_step 은 보존.
    // 단, 아직 onboarding_step=1 (이 단계 진행 중) 이면 step=2 로 진행.
    const stepUpdate =
      existing.data.status === "pending" && existing.data.onboarding_step === 1
        ? { onboarding_step: 2 }
        : {};
    const upd = await service
      .from("friends")
      .update({ ...parsed, ...stepUpdate })
      .eq("id", existing.data.id);
    if (upd.error) throw upd.error;
  }

  redirect("/onboarding/preferences");
}
