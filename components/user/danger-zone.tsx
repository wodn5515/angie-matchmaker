"use client";

import { useState } from "react";
import { deleteMeAccountAction } from "@/app/me/actions";

/**
 * 014 §D1·§D2 — `/me` 페이지 하단 위험 영역 inline expandable.
 *
 * 노출 단계:
 *   1. <details>/<summary> "위험 영역" — 클릭으로 expand (native disclosure)
 *   2. expand → 영구 삭제 경고 + 본인 이름 input + 계정 삭제 버튼 (초기 disabled)
 *   3. 입력값이 friend.name 과 case-sensitive 정확 일치 → 버튼 활성화
 *   4. submit → Server Action `deleteMeAccountAction` (FormData.confirmName)
 *
 * §8 Server → Client function prop 금지 — Server Action 은 컴포넌트가 직접 import.
 *
 * UI 톤: --color-danger 토큰 (위험 강조) + 친구 측 다크/핑크 톤 일관.
 */
export function DangerZone({ friendName }: { friendName: string }) {
  const [confirmName, setConfirmName] = useState("");
  // friendName 이 빈 문자열인 비정상 케이스에는 절대 enable 되지 않도록 가드.
  const canDelete = friendName.length > 0 && confirmName === friendName;

  return (
    <details className="rounded-2xl border border-[var(--color-danger)]/30 bg-[var(--color-surface)]">
      <summary className="cursor-pointer select-none rounded-2xl px-4 py-3 text-sm font-medium text-[var(--color-danger)] marker:text-[var(--color-fg-subtle)] hover:bg-[var(--color-danger)]/[0.06]">
        위험 영역
      </summary>
      <div className="space-y-3 border-t border-[var(--color-danger)]/20 px-4 py-4">
        <p className="text-xs leading-relaxed text-[var(--color-fg-muted)]">
          계정을 삭제하면 모든 데이터 (프로필 / 이상형 / 연애 성향 테스트 응답 /
          매칭 메모) 가 영구 삭제되며 복구할 수 없어요.
        </p>
        <form action={deleteMeAccountAction} className="space-y-2">
          <label className="block text-[11px] text-[var(--color-fg-muted)]">
            본인 이름 ({friendName}) 을 정확히 입력해주세요
            <input
              type="text"
              name="confirmName"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="mt-1 h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm text-fg placeholder:text-[var(--color-fg-subtle)] transition focus:border-[var(--color-danger)] focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)]/40"
            />
          </label>
          <button
            type="submit"
            disabled={!canDelete}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/15 px-4 text-sm font-medium text-[var(--color-danger)] transition hover:bg-[var(--color-danger)]/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            계정 삭제
          </button>
        </form>
      </div>
    </details>
  );
}
