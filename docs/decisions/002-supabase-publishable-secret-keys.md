# 002 — Supabase Key Migration: anon/service_role → publishable/secret

> 2025-07부터 Supabase가 `anon`/`service_role` JWT 키를 deprecated하고 `sb_publishable_…`/`sb_secret_…` 키 체계로 전환. 본 프로젝트도 신규 키 체계를 디폴트로 채택. 사용자 피드백("publishable/secret으로 바뀐 거 같아")으로 확인 후 반영.

## What changed (Supabase 측)

| Old (legacy) | New (current) |
|---|---|
| `anon` key (JWT) | `sb_publishable_…` key |
| `service_role` key (JWT) | `sb_secret_…` key |

- **Co-existence**: 두 키는 동일 프로젝트에서 동시 사용 가능. zero-downtime 마이그레이션.
- **API 변경 없음**: `@supabase/ssr`의 `createBrowserClient`/`createServerClient` 시그니처는 그대로. 단순 키 문자열 교체.
- **출처**: Supabase blog 2025-07-14 "JWT Signing Keys", Settings → API Keys 화면.

## Decision

코드는 **신규 env 이름을 우선**, 누락 시 **레거시로 fallback** 하도록 작성.

```ts
// publishable
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// secret
process.env.SUPABASE_SECRET_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY
```

## Why fallback

- 본 프로젝트는 아직 배포 전 ⇒ fallback이 필수는 아님
- 그러나 fallback이 있으면:
  - 사용자가 옛 키를 그대로 복사해도 동작 (혼동 ↓)
  - 향후 마이그레이션 중 양쪽 키가 공존하는 시기에도 안전
- 비용은 한 줄짜리 `??` 두 군데. 부담 없음.

## Files changed

| File | Change |
|---|---|
| `lib/supabase/server.ts` | `publishableKey()` / `secretKey()` 헬퍼로 신규 우선, 레거시 fallback |
| `lib/supabase/client.ts` | publishable 우선, anon fallback |
| `lib/supabase/proxy.ts` | publishable 우선, anon fallback |
| `.env.example` | publishable/secret을 기본 표기, anon/service_role은 주석으로 fallback 안내 |
| `README.md` | 환경변수 표 갱신 + fallback 한 줄 주석 |
| `docs/deployment.md` | "Settings → API Keys" 새 위치 안내, sb_publishable_/sb_secret_ 접두사 명시 |

## Non-changes

- DB 스키마, RLS 정책, 어플리케이션 인가 로직 — 영향 없음.
- 친구 측 토큰 흐름 — 영향 없음.

## Future cleanup

`SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` fallback은 1~2 릴리스 안에 제거해도 됨. 운영 시작 후 신규 키만 쓰는 게 확정되면 헬퍼에서 fallback 줄 삭제 + 결정 로그에 추기.
