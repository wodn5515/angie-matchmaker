---
name: deploy
description: stage 의 변경을 prod (master) 로 반영하는 release PR 을 생성한다. master..stage diff 를 분석해 변경 요약 / 배포 전 체크리스트 / 머지 후 검증 plan / 관련 결정 로그·docs 링크까지 PR 본문에 자동 작성한다. Lead 단독 작업 — 팀·게이트 생략.
---

# stage → master 배포 PR 생성

## 1단계: 사전 점검 (필수)

### 기존 release PR 확인
```!
gh pr list --base master --head stage --state open
```
- 열린 PR 이 있으면 그 URL 안내 + 종료 (중복 생성 금지)
- 없으면 진행

### master ↔ stage diff 확인
```!
git fetch origin
git log --oneline origin/master..origin/stage
git diff --stat origin/master..origin/stage | tail -3
```

- commits 0 → "배포할 변경 없음" 안내 후 종료
- commits N → 변경 영역 분석 시작

## 2단계: 변경 분석

### 포함되는 PR 목록 추출
```bash
git log --oneline origin/master..origin/stage | grep -oE '\(#[0-9]+\)' | tr -d '()#' | sort -u
```

각 PR 번호로 `gh pr view <N> --json title,body,mergedAt -q '{title, body}'` 호출해 제목·본문 가져오기. 본문에서 핵심 결정 로그 링크·destructive 표기·검증 결과 추출.

### 변경 영역 분류

`git diff --name-only origin/master..origin/stage` 결과를 다음 카테고리로:

| 카테고리 | 패턴 | 의미 |
|---|---|---|
| **DB / 마이그레이션** | `supabase/migrations/**` | 🚨 destructive 검사 필수 — `drop column`, `drop table`, `delete from` 토큰 grep |
| **인증·라우팅** | `lib/auth/**`, `proxy.ts`, `app/auth/**`, `app/login/**`, `app/signup/**` | OAuth / 가드 매트릭스 변경 — OAuth 콘솔 영향 확인 |
| **운영자 측** | `app/(operator)/**`, `components/operator/**` | 운영자 UX 변경 |
| **가입자 측** | `app/me/**`, `app/onboarding/**`, `app/pending/**`, `app/rejected/**`, `components/user/**` | 가입자 UX 변경 |
| **DB 헬퍼 / 비즈니스 로직** | `lib/db/**`, `lib/validation/**`, `lib/types/**` | 내부 로직 |
| **테스트** | `tests/**`, `e2e/**`, `vitest.config.ts`, `playwright.config.ts` | TDD 인프라 / spec |
| **문서** | `docs/**`, `README.md`, `CLAUDE.md`, `AGENTS.md` | 정책·결정 로그 / 사실 영역 |
| **운영 도구** | `.claude/**` | hook / skill / agent 정의 |
| **환경변수** | `CLAUDE.md` §11 / `docs/deployment.md` diff | Vercel 환경변수 갱신 필요? |

### Destructive SQL 검사
```bash
git diff origin/master..origin/stage -- supabase/migrations/ | grep -iE '(drop column|drop table|delete from|alter table .* drop)'
```
- 매치 있음 → "destructive 마이그레이션" 항목 PR 본문에 강조 + 사용자 보존 데이터 확인 안내
- 매치 없음 → "데이터 안전" 표시

### 환경변수 변경 검사
```bash
git diff origin/master..origin/stage -- CLAUDE.md docs/deployment.md README.md | grep -iE '^[+-].*(_KEY|_EMAIL|_URL|_TOKEN|env|NEXT_PUBLIC_|SUPABASE_|OPERATOR_)'
```
- 매치 있음 → "Vercel 환경변수 점검" 항목에 변경된 env 명시
- 매치 없음 → "추가 env 없음"

### 결정 로그 / 운영자 피드백 추출
```bash
git diff --name-only origin/master..origin/stage -- docs/decisions/ docs/operator-feedback/
```
- 변경된 파일 목록을 PR 본문 하단 "관련 결정 로그" 섹션에 링크 (`[NNN-slug](https://github.com/<owner>/<repo>/blob/stage/docs/decisions/NNN-slug.md)`)

## 3단계: PR 본문 작성

다음 템플릿 그대로 채워 작성. 빈 섹션 (변경 없음) 은 "변동 없음" 한 줄로 명시 (섹션 자체는 유지 — 일관 톤).

```markdown
## 요약

<한 줄 컨셉 — 가장 큰 변경의 1 줄 요약. 예: "V1 → V2 자가 가입 전환 + V2.1 후속 정리">

| PR | 영역 | 내용 |
|---|---|---|
| #N | <카테고리> | <title 한 줄> |
| ... | ... | ... |

<N> files / +<I> / -<D>. 검증: tsc / lint / <X> tests pass.

---

## 🚨 배포 전 필수 체크리스트 — 순서대로 실행

### 1. Supabase 콘솔 마이그레이션 적용 — Vercel deploy 전에 먼저

코드 deploy 가 먼저 떨어지고 마이그레이션이 안 가면 **<영향 — 예: 이상형 폼 저장 / 가입 흐름 등이 깨진다>**. 반드시 마이그레이션 우선.

<각 마이그레이션 파일별 한 줄 요약>
- `supabase/migrations/NNNN_<slug>.sql` — <목적 한 줄>
  - <destructive 항목 강조 — 있으면 ⚠️ + 보존 데이터 확인 안내>

<destructive 한 항목 있으면>
> ⚠️ **destructive 적용 전 데이터 보존 확인** — 필요 시 콘솔에서 export

### 2. OAuth / 인증 콘솔 — <변경 있을 때만>

- Supabase Auth → Providers / Redirect URLs 변경 확인
- Google Cloud Console OAuth Client ID 의 Authorized redirect URIs 확인
- Testing 모드 Test Users 등록

### 3. Vercel 환경 변수 — <변경 있을 때만>

prod 환경에 다음 env 갱신:
- `<ENV_NAME>` — <설명>

<변경 없으면>
> 추가 / 변경된 env 없음. 기존 설정 그대로 유지.

### 4. 머지 후 수동 검증 항목 — <PR 본문에서 추출>

PR 본문에 명시된 사용자 측 수동 검증 항목 모음:
- <항목 1> (PR #N)
- <항목 2> (PR #N)

---

## 머지 후 검증 plan (골든 패스)

영역별 핵심 시나리오:

1. **운영자**: <시나리오 — 예: Google OAuth → /(operator)/ 진입 → 대시보드 위젯>
2. **신규 가입자**: <시나리오>
3. **이상형 / 비교 뷰**: <시나리오>
4. <필요한 만큼>

장애 발생 시 Vercel rollback. 단 마이그레이션은 rollback 안 됨 — destructive 변경 있으면 사용자 데이터 영향 인지.

---

## V2.x 검토 항목 (이번 배포 미포함)

<머지된 PR 들 본문에서 "후속 / V2.x / V2.2 백로그" 항목 모아 정리. 없으면 "현재 백로그 없음" 한 줄>

---

## 관련 결정 로그 / docs

<docs/decisions/ 변경 파일 링크>
- [`docs/decisions/NNN-slug.md`](https://github.com/<owner>/<repo>/blob/stage/docs/decisions/NNN-slug.md) — <한 줄 제목>

<docs/operator-feedback/ 변경 있으면>
- [`docs/operator-feedback/<file>.md`](https://github.com/<owner>/<repo>/blob/stage/docs/operator-feedback/<file>.md)

<PRD / CLAUDE.md / README 변경 영역>
- `docs/PRD.md` §<영역들>
- `CLAUDE.md` §<영역들>
- `README.md` — <변경 요약>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## 4단계: PR 생성

```bash
gh pr create --base master --head stage \
  --title "[release] <한 줄 요약 — 가장 큰 변경 컨셉>" \
  --body-file - <<'EOF'
<3단계에서 작성한 본문>
EOF
```

PR URL 반환.

## 5단계: 결과 보고

```
🚀 release PR #N 생성 — <URL>

- master..stage: <N> commits / <P>개 PR (#x, #y, ...)
- <N> files / +<I> / -<D>
- destructive 마이그레이션: <있음/없음>
- 환경변수 변경: <있음/없음>
- 머지 후 수동 검증 항목 <M>건

배포 진행 시 PR 본문 1번 체크리스트 (마이그레이션) 부터 순서대로 — Vercel auto-deploy 가 마이그레이션 적용 전에 떨어지지 않도록 주의.
```

## 주의 사항

- **사용자만 머지 가능** — Lead 는 PR 생성까지. 머지는 사용자가 GitHub UI 또는 `gh pr merge` 로 수행
- **base = master / head = stage 고정** — matchmaker 기본 브랜치가 master (CLAUDE.md §11)
- **PR 본문 자동 생성이 핵심** — 변경 분석 결과를 정확히 본문에 담는 게 가치. PR 자체는 단순 호출
- **destructive 마이그레이션 누락 금지** — 사용자가 모르고 머지하면 데이터 손실 가능. PR 본문 §1 에서 ⚠️ 강조 필수
- **결정 로그 / operator-feedback 링크** — diff 에 등장하면 자동으로 PR 본문 하단에 추가 (사용자가 배포 의도·근거 추적 가능)
- **이전 비슷한 PR**: matchmaker PR #12 (V2 prod 배포) 가 이 SKILL 의 패턴 원형. 동일한 톤·구조 유지.

## 사용 예

```
/deploy
```

argument 없음. 자동으로 origin/master..origin/stage 분석 + PR 생성. 사용자가 PR 검토 후 머지 진행.
