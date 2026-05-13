/**
 * `deleteMeAccountAction` 단위 테스트 — 014 §D3.
 *
 * 결정 로그: docs/decisions/014-account-self-delete.md §D3·§D4
 *
 * ## 작업 주제
 *
 * 가입자 자가 탈퇴 (계정 hard delete). 본인 row + cascade 자식 6 테이블 +
 * auth.users 까지 영구 삭제. UI 는 `/me` 페이지 하단 "위험 영역" inline expandable +
 * 본인 이름 입력 confirm (§D2).
 *
 * ## worker 가 채울 인터페이스 (가정)
 *
 *   // 위치: app/me/actions.ts (또는 app/me/profile/actions.ts 안의 별도 export)
 *   //   Lead 가 자율 채택. spec 은 path 만 갱신 가능하면 통과.
 *   //
 *   //   import { deleteMeAccountAction } from "@/app/me/actions";
 *
 *   "use server";
 *   export async function deleteMeAccountAction(formData: FormData): Promise<void>;
 *
 * 분기 (§D3 본문 그대로):
 *   1. `ensureNotOperator()` — 운영자 throw + auth.admin.deleteUser 호출 X
 *   2. `getCurrentUser()` 가 null 이면 throw + auth.admin.deleteUser 호출 X
 *   3. zod parse — `confirmName` min(1) / max(80) / 빈 입력 거절
 *   4. 본인 friends row 의 `name` 과 case-sensitive 정확 일치 검증
 *      불일치 → throw + auth.admin.deleteUser 호출 X
 *   5. 정상 → `supabase.auth.admin.deleteUser(authUserId)` 호출 → cascade →
 *      redirect "/login?deleted=1"
 *
 * Supabase 클라이언트는 mock 으로 격리.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// 모듈 mock — worker 가 실제 헬퍼/클라이언트를 쓰는 구조 가정.
// `getCurrentUser` / `ensureNotOperator` 는 `@/lib/auth/user` 의 named export.
vi.mock("@/lib/auth/user", () => ({
  getCurrentUser: vi.fn(),
  ensureNotOperator: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceClient: vi.fn(),
}));

// next/navigation 의 redirect 는 throw 로 흉내 — server action 의 자연스러운
// flow 종결 패턴 (`requireApprovedUser` spec 과 동일).
vi.mock("next/navigation", () => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`__REDIRECT__:${to}`);
  }),
}));

import { getCurrentUser, ensureNotOperator } from "@/lib/auth/user";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

// worker 가 작성할 모듈 — 아직 없으므로 import 자체가 빨갛게 실패.
// path 는 Lead 가 자율 채택 가능 (§D3: app/me/actions.ts 또는 app/me/profile/actions.ts).
// 본 spec 은 첫 번째 후보를 쓰고 worker 가 다른 위치로 채택하면 path 만 갱신.
// @ts-expect-error worker 미작성
import { deleteMeAccountAction } from "@/app/me/actions";

type FriendRowForName = { name: string } | null;

/**
 * Supabase service client mock — `.from('friends').select('name').eq('id', ...).single()`
 * 체이닝 + `.auth.admin.deleteUser(id)` 두 채널을 한 객체로.
 *
 * 014 §D3 본문 그대로의 한 sb 인스턴스 (스펙: `const sb = createSupabaseServiceClient()`).
 * Lead 가 분리해도 mock 측은 호출 횟수 / 인자만 검증해 path 영향 없음.
 */
function mockServiceClient(opts: {
  friend: FriendRowForName;
  deleteUserResult?: { error: { message: string } | null };
}) {
  const singleSpy = vi
    .fn()
    .mockResolvedValue({ data: opts.friend, error: null });
  const eqSpy = vi.fn(() => ({ single: singleSpy }));
  const selectSpy = vi.fn(() => ({ eq: eqSpy }));
  const fromSpy = vi.fn(() => ({ select: selectSpy }));

  const deleteUserSpy = vi
    .fn()
    .mockResolvedValue(opts.deleteUserResult ?? { error: null });

  const sb = {
    from: fromSpy,
    auth: {
      admin: {
        deleteUser: deleteUserSpy,
      },
    },
  };
  (createSupabaseServiceClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
    sb,
  );
  return { sb, fromSpy, selectSpy, eqSpy, singleSpy, deleteUserSpy };
}

function makeFormData(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

describe("deleteMeAccountAction — 가입자 자가 탈퇴 (014 §D3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("운영자 차단 — ensureNotOperator() 가 throw", () => {
    it("운영자 세션이면 throw 하고 auth.admin.deleteUser 가 호출되지 않는다", async () => {
      // ensureNotOperator 가 운영자 시 throw — 014 §D4 가드.
      (ensureNotOperator as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("운영자는 가입자 액션을 수행할 수 없습니다"),
      );

      const { deleteUserSpy } = mockServiceClient({
        friend: { name: "Alice" },
      });

      await expect(
        deleteMeAccountAction(makeFormData({ confirmName: "Alice" })),
      ).rejects.toThrow();

      // 핵심 — 운영자가 던진 후엔 delete 까지 못 간다.
      expect(deleteUserSpy).not.toHaveBeenCalled();
    });
  });

  describe("세션 없음 — getCurrentUser() 가 null", () => {
    it("세션이 없으면 throw 하고 auth.admin.deleteUser 가 호출되지 않는다", async () => {
      (ensureNotOperator as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );
      (getCurrentUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        null,
      );

      const { deleteUserSpy } = mockServiceClient({
        friend: null,
      });

      await expect(
        deleteMeAccountAction(makeFormData({ confirmName: "anything" })),
      ).rejects.toThrow();

      expect(deleteUserSpy).not.toHaveBeenCalled();
    });
  });

  describe("friend row 없음 — 본인 row 조회 실패", () => {
    it("DB 에 본인 friend 가 없으면 throw 하고 auth.admin.deleteUser 가 호출되지 않는다", async () => {
      // 세션은 있지만 friends row 가 race condition 등으로 없는 경계 케이스.
      // §D3 의 `if (!friend || friend.name !== confirmName)` 의 !friend 가지.
      (ensureNotOperator as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );
      (getCurrentUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        authUserId: "auth-1",
        email: "u1@gmail.com",
        friendId: "friend-1",
        status: "approved",
        onboardingStep: null,
      });

      const { deleteUserSpy } = mockServiceClient({
        friend: null,
      });

      await expect(
        deleteMeAccountAction(makeFormData({ confirmName: "Alice" })),
      ).rejects.toThrow();

      expect(deleteUserSpy).not.toHaveBeenCalled();
    });
  });

  describe("본인 이름 불일치 — confirmName !== friend.name", () => {
    beforeEach(() => {
      (ensureNotOperator as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );
      (getCurrentUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        authUserId: "auth-1",
        email: "u1@gmail.com",
        friendId: "friend-1",
        status: "approved",
        onboardingStep: null,
      });
    });

    it("이름이 다르면 (입력 'Bob' vs friend.name 'Alice') throw + delete 호출 X", async () => {
      const { deleteUserSpy } = mockServiceClient({
        friend: { name: "Alice" },
      });

      await expect(
        deleteMeAccountAction(makeFormData({ confirmName: "Bob" })),
      ).rejects.toThrow(/일치하지 않/);

      expect(deleteUserSpy).not.toHaveBeenCalled();
    });

    it("에러 메시지는 '입력한 이름이 본인 이름과 일치하지 않습니다' 톤", async () => {
      mockServiceClient({
        friend: { name: "Alice" },
      });

      // §D3 본문의 정확한 카피 — 본인 이름 불일치 시 사용자에게 표시될 핵심 키워드.
      // 메시지 미세 조정 여지를 위해 키워드만 정규식 매치.
      await expect(
        deleteMeAccountAction(makeFormData({ confirmName: "Bob" })),
      ).rejects.toThrow(/일치하지 않/);
    });

    it("case-sensitive — 'alice' (소문자) vs friend.name 'Alice' 는 거절 (대소문자 다름)", async () => {
      // §D3 — "본인 이름과 정확히 일치 (case-sensitive)" 명시.
      const { deleteUserSpy } = mockServiceClient({
        friend: { name: "Alice" },
      });

      await expect(
        deleteMeAccountAction(makeFormData({ confirmName: "alice" })),
      ).rejects.toThrow();

      expect(deleteUserSpy).not.toHaveBeenCalled();
    });

    it("앞뒤 공백 trim 후 비교 — '  Alice  ' 는 'Alice' 와 일치 (정상 삭제 흐름 진입)", async () => {
      // §D3 의 zod `.trim().min(1).max(80)` — trim 후 비교가 자연.
      // worker 가 trim 을 안 넣을 가능성도 있어 한 줄 정도만 (실패해도 무방한 안전 spec).
      const { deleteUserSpy } = mockServiceClient({
        friend: { name: "Alice" },
      });

      await expect(
        deleteMeAccountAction(makeFormData({ confirmName: "  Alice  " })),
      ).rejects.toThrow(/__REDIRECT__:\/login\?deleted=1/);

      expect(deleteUserSpy).toHaveBeenCalledWith("auth-1");
    });
  });

  describe("zod 입력 검증 — confirmName min(1) / max(80)", () => {
    beforeEach(() => {
      (ensureNotOperator as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );
      (getCurrentUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        authUserId: "auth-1",
        email: "u1@gmail.com",
        friendId: "friend-1",
        status: "approved",
        onboardingStep: null,
      });
    });

    it("빈 입력은 zod min(1) 으로 throw + delete 호출 X", async () => {
      const { deleteUserSpy } = mockServiceClient({
        friend: { name: "Alice" },
      });

      await expect(
        deleteMeAccountAction(makeFormData({ confirmName: "" })),
      ).rejects.toThrow();

      expect(deleteUserSpy).not.toHaveBeenCalled();
    });

    it("공백만 있는 입력은 trim() 후 빈 문자열이 되어 거절", async () => {
      const { deleteUserSpy } = mockServiceClient({
        friend: { name: "Alice" },
      });

      await expect(
        deleteMeAccountAction(makeFormData({ confirmName: "   " })),
      ).rejects.toThrow();

      expect(deleteUserSpy).not.toHaveBeenCalled();
    });

    it("80자 초과 입력은 zod max(80) 으로 throw + delete 호출 X", async () => {
      const { deleteUserSpy } = mockServiceClient({
        friend: { name: "Alice" },
      });

      // 81자 — 정확히 max+1 경계.
      const tooLong = "x".repeat(81);
      await expect(
        deleteMeAccountAction(makeFormData({ confirmName: tooLong })),
      ).rejects.toThrow();

      expect(deleteUserSpy).not.toHaveBeenCalled();
    });

    it("confirmName 필드 자체가 누락되면 throw", async () => {
      const { deleteUserSpy } = mockServiceClient({
        friend: { name: "Alice" },
      });

      // FormData 에 confirmName 자체가 없음 → null → zod 거절
      await expect(deleteMeAccountAction(makeFormData({}))).rejects.toThrow();

      expect(deleteUserSpy).not.toHaveBeenCalled();
    });
  });

  describe("정상 삭제 — case-sensitive 정확 일치", () => {
    beforeEach(() => {
      (ensureNotOperator as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );
      (getCurrentUser as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
        authUserId: "auth-1",
        email: "u1@gmail.com",
        friendId: "friend-1",
        status: "approved",
        onboardingStep: null,
      });
    });

    it("정확 일치 'Alice' → auth.admin.deleteUser('auth-1') 호출 + redirect '/login?deleted=1'", async () => {
      const { deleteUserSpy } = mockServiceClient({
        friend: { name: "Alice" },
      });

      // §D3 — 정상 분기. redirect 가 throw 로 흉내내져 있으므로 rejects.toThrow 매치.
      await expect(
        deleteMeAccountAction(makeFormData({ confirmName: "Alice" })),
      ).rejects.toThrow(/__REDIRECT__:\/login\?deleted=1/);

      // auth.admin.deleteUser 가 정확히 authUserId 로 호출됐는지.
      expect(deleteUserSpy).toHaveBeenCalledTimes(1);
      expect(deleteUserSpy).toHaveBeenCalledWith("auth-1");
    });

    it("friend.name 이 한국어 ('홍길동') 여도 정확 일치하면 삭제 흐름 진입", async () => {
      const { deleteUserSpy } = mockServiceClient({
        friend: { name: "홍길동" },
      });

      await expect(
        deleteMeAccountAction(makeFormData({ confirmName: "홍길동" })),
      ).rejects.toThrow(/__REDIRECT__:\/login\?deleted=1/);

      expect(deleteUserSpy).toHaveBeenCalledWith("auth-1");
    });

    it("auth.admin.deleteUser 가 error 를 반환하면 throw (cascade 실패 보호)", async () => {
      // §D3 — `if (error) throw error;` — 삭제 자체가 실패하면 redirect 안 함.
      mockServiceClient({
        friend: { name: "Alice" },
        deleteUserResult: { error: { message: "delete failed" } },
      });

      await expect(
        deleteMeAccountAction(makeFormData({ confirmName: "Alice" })),
      ).rejects.toThrow();
    });

    it("friends 테이블에서 본인 row (id=session.friendId) 의 name 만 select 한다", async () => {
      // §D3 — `.from('friends').select('name').eq('id', session.friendId).single()`.
      // 핵심: 자기 friendId 만 조회 (다른 row 조회 우회 표면 없음).
      const { fromSpy, selectSpy, eqSpy } = mockServiceClient({
        friend: { name: "Alice" },
      });

      await expect(
        deleteMeAccountAction(makeFormData({ confirmName: "Alice" })),
      ).rejects.toThrow(/__REDIRECT__:\/login\?deleted=1/);

      expect(fromSpy).toHaveBeenCalledWith("friends");
      // name 컬럼을 select — 다른 컬럼 폭넓게 가져오지 않음 (정보 최소화).
      expect(selectSpy.mock.calls[0]?.[0]).toMatch(/name/);
      // session.friendId 로 eq — auth_user_id 가 아닌 friend.id 기준.
      expect(eqSpy).toHaveBeenCalledWith("id", "friend-1");
    });
  });
});
