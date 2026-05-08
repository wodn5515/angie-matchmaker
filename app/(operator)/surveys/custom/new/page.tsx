import Link from "next/link";
import { requireOperator } from "@/lib/auth/operator";
import { listFriends } from "@/lib/db/friends";
import { CustomSurveyForm } from "./form";

export const metadata = { title: "커스텀 설문 — matchmaker" };

export default async function NewCustomSurveyPage() {
  const session = await requireOperator();
  const friends = await listFriends(session.userId);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs text-[var(--color-fg-muted)]">
          <Link href="/surveys" className="hover:text-fg">
            설문
          </Link>
          <span className="mx-1">/</span> 커스텀 / 새로 만들기
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          새 커스텀 설문
        </h1>
        <p className="mt-1 text-xs text-[var(--color-fg-muted)]">
          제목과 대상을 정하면 챕터/문항을 추가할 수 있는 편집 화면으로 넘어갑니다.
        </p>
      </div>
      <CustomSurveyForm friends={friends} />
    </div>
  );
}
