---
name: 003 — Multi-operator emails with shared site data
description: OPERATOR_EMAIL을 CSV로 받고, 등록된 모든 이메일이 같은 site owner_id를 공유하도록 설계. 사용자 명시 요구.
type: project
---

# 003 — Multi-operator emails with shared site data

## Decision

`OPERATOR_EMAIL` 환경변수가 콤마 구분 CSV를 지원하고, 등록된 모든 이메일은 **하나의 논리적 사이트 운영자**로 동작한다. 즉 누가 로그인하든 같은 데이터(friends/surveys/pairs/...)를 본다.

## Why

사용자 요구: "운영자 이메일은 여러개를 등록할 수 있도록 해줘 이름은 그냥 사이트의 운영자의 하나의 이름으로 쓸 수 있으면 돼".

"사이트의 운영자의 하나의 이름" 이라는 표현은 사이트 자체가 단일 운영자 entity라는 의미. 따라서:

- 다중 사용자 ≠ 다중 테넌트
- 여러 명이 같은 사이트를 함께 운영 (예: 부부, 친구, 팀 협업)
- 데이터는 하나로 공유

## How

### 1. Email parsing (CSV)
`lib/auth/operator.ts` 에서 `OPERATOR_EMAIL` 을 콤마로 split 후 normalize. `isOperatorEmail(email)` 이 리스트 inclusion 체크.

### 2. Shared owner_id (lazy-init)
새 테이블 `site_owner` (singleton, id=1):
- 첫 로그인한 운영자의 `auth.users.id` 가 `site_owner.user_id` 로 저장됨
- 이후 모든 운영자 세션은 이 `site_owner.user_id` 를 `OperatorSession.userId` 로 받음
- 모든 DB 쿼리는 `session.userId` 를 `owner_id` 로 사용 → 같은 데이터셋

`auth.users.id` 자체는 `OperatorSession.authUserId` 에 별도 보관 (감사/로깅 용도, 아직 미사용).

### 3. Display name (공유)
`OPERATOR_DISPLAY_NAME` 그대로. 친구한테 보일 인사말은 모든 운영자 공통.

## Migration considerations

- 첫 운영자 로그인 시점에 `site_owner` row가 lazy-create됨. 그 이전엔 row 없음.
- 만약 누군가가 site_owner 초기화 전에 데이터를 직접 SQL로 넣었다면, 그 owner_id가 `site_owner.user_id` 와 다를 수 있음 → 데이터 격리될 수 있음. 신규 배포에서는 발생할 일 없음.
- `site_owner.user_id` 를 변경하면 기존 데이터가 모두 새 owner의 시야에서 사라짐. 의도적으로 마이그레이션할 때만 수정 가능 (서비스 키로 직접 SQL).

## Alternatives considered

- **각 운영자 데이터 격리** (multi-tenant): 더 단순하지만 사용자 의도("사이트의 운영자")와 불일치. 보류.
- **SITE_OWNER_ID 환경변수**: 사용자가 UUID 직접 생성/관리해야 함. 비개발자 운영자에게 부담.
- **첫 이메일을 owner**: 환경변수 순서 의존. 이메일 추가/삭제 시 깨질 위험.
- **lazy-init via site_owner table** ✓ 선택

## How to apply

기능 추가/수정 시 `session.userId` (= shared owner_id) 가 항상 같다는 점만 의식하면 기존 코드 그대로 동작. `authUserId` 가 필요한 경우 (예: 누가 어떤 행동을 했는지 감사) 그때 활용.
