"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ensureNotOperator, getCurrentUser } from "@/lib/auth/user";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * 014 §D3 — 가입자 자가 탈퇴 (계정 hard delete).
 *
 * UI 입력: `<form action={deleteMeAccountAction}>` + `name="confirmName"` (본인 friends.name 정확 일치).
 *
 * 가드 매트릭스 (§D4):
 *   1. `ensureNotOperator()` — 운영자 세션이면 즉시 throw (deleteUser 미호출)
 *   2. `getCurrentUser()` 가 null 이면 throw — 세션 부재
 *   3. zod `.trim().min(1).max(80)` — 빈 입력 / 80자 초과 / 공백만 거절
 *   4. 본인 friends row 의 `name` 과 case-sensitive 정확 일치 검증 (trim 후)
 *   5. 정상 → `supabase.auth.admin.deleteUser(authUserId)` →
 *      `friends.auth_user_id ON DELETE CASCADE` (마이그레이션 0001/0003) 가
 *      `friends` + 자식 6 테이블 (friend_ideals / 1:N 5개 / survey_answers / pairs)
 *      자동 정리 (014 §D3 본문 — 마이그레이션 0007 불필요).
 *   6. `/login?deleted=1` redirect — 014 §D5 안내 배너.
 *
 * `assertOwnFriendRow` 는 호출하지 않는다. friendId 가 form 입력이 아니라
 * `session.friendId` 만 사용하므로 우회 표면이 없다 (014 §D4 본문).
 */
const ConfirmNameSchema = z.string().trim().min(1).max(80);

export async function deleteMeAccountAction(formData: FormData): Promise<void> {
  // 1. 운영자 차단 — ensureNotOperator 가 throw 하면 그대로 전파.
  await ensureNotOperator();

  // 2. 세션 확보.
  const session = await getCurrentUser();
  if (!session) {
    throw new Error("세션이 없습니다");
  }

  // 3. 입력 검증 — trim/min(1)/max(80). 부재(null) / 공백만 / 길이 초과 거절.
  const confirmName = ConfirmNameSchema.parse(formData.get("confirmName"));

  // 4. 본인 friends row 의 name 과 case-sensitive 정확 일치 검증.
  //    `friend.name` 은 정상 흐름에서 ProfileSchema 가 trim 해 저장하지만, 외부
  //    작업(운영자 콘솔 / DB 직접 편집)으로 trailing space 가 섞일 가능성을 방어 —
  //    가입자가 본인 이름을 정확히 입력했는데 trailing space 때문에 거절되는 함정
  //    회피. case-sensitive 정신은 그대로 (trim 만 추가).
  //
  //    `sb` 한 인스턴스로 friends select + auth.admin.deleteUser 두 채널 모두 사용 —
  //    admin API 는 secret(service-role) key 권한 필요. 본 클라이언트는 RLS bypass.
  const sb = createSupabaseServiceClient();
  const { data: friend } = await sb
    .from("friends")
    .select("name")
    .eq("id", session.friendId)
    .single();

  if (!friend || (friend.name ?? "").trim() !== confirmName) {
    throw new Error("입력한 이름이 본인 이름과 일치하지 않습니다");
  }

  // 5. auth.users 삭제 → cascade 로 friends + 자식 6 테이블 모두 자동 정리.
  const { error } = await sb.auth.admin.deleteUser(session.authUserId);
  if (error) throw error;

  // 6. 자가 탈퇴 안내 — /login?deleted=1 으로 redirect (Next 의 redirect 는 throw).
  redirect("/login?deleted=1");
}
