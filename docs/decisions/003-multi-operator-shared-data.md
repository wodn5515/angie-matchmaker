---
name: 003 — Multi-operator emails with shared site data
description: OPERATOR_EMAIL을 CSV로 받고, 등록된 모든 이메일이 같은 site owner_id (하드코딩 상수)를 공유하도록 단순 설계.
type: project
---

# 003 — Multi-operator emails with shared site data

## Decision

`OPERATOR_EMAIL` 환경변수가 콤마 구분 CSV를 지원한다. 등록된 모든 이메일은 동일한 **하드코딩된 사이트 owner_id** 로 동작 → 데이터(friends/surveys/pairs)를 공유한다.

## Why

사용자 요구: "운영자 이메일은 여러개를 등록할 수 있도록 해줘 이름은 그냥 사이트의 운영자의 하나의 이름으로 쓸 수 있으면 돼".

**가장 단순한 형태**: 사이트는 단일 테넌트, 멀티 사용자. 데이터는 한 덩어리. 운영자 화이트리스트만 관리하면 됨.

## How

### 1. Email parsing (CSV)
`lib/auth/operator.ts` 가 `OPERATOR_EMAIL` 을 콤마로 split 후 lowercase + trim. `isOperatorEmail(email)` 이 리스트 inclusion 체크.

### 2. Fixed site owner_id
```ts
const SITE_OWNER_ID = "11111111-1111-1111-1111-111111111111";
```
모든 whitelisted 운영자의 `OperatorSession.userId` 가 이 값으로 고정. 모든 DB 쿼리는 이 값을 `owner_id` 로 사용 → 같은 데이터셋. Auth user id 자체는 의도적으로 owner_id 로 쓰지 않음.

### 3. Display name (공유)
`OPERATOR_DISPLAY_NAME` 그대로. 친구한테 보일 인사말은 모든 운영자 공통.

## Trade-offs

- **장점**: 추가 테이블/마이그레이션/race-condition handling 불필요. 코드 한 두 줄 변경.
- **단점**: V2에서 다중 테넌트로 확장하려면 owner_id 처리 다시 손봐야 함. 그러나 PRD §9 에서 다중 운영자는 V1 non-goal로 명시했으므로 OK.

## Alternatives considered (모두 reject)

- **각 운영자 데이터 격리 (멀티 테넌트)**: 사용자 의도("사이트의 운영자")와 불일치
- **lazy-init via site_owner table**: 처음 시도했던 방식. 마이그레이션·race handling 등 오버엔지니어링이라 폐기
- **SITE_OWNER_ID 환경변수**: 사용자(비개발자)가 UUID 직접 관리해야 함

## How to apply

기능 추가/수정 시 `session.userId` (= 하드코딩 SITE_OWNER_ID) 가 항상 같다는 점만 의식하면 기존 코드 그대로 동작.
