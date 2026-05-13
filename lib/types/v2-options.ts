/**
 * V2 가입자 측 폼 (`/onboarding/*`, `/me/*`) 에서 공통 사용하는 옵션·라벨 사전.
 *
 * PRD §3.3.3 (이런 분이면 좋겠어요 3단 구조) 의 옵션·라벨 원본.
 * 이 모듈은:
 *   - 옵션 배열 (UI 컴포넌트 props 로 전달)
 *   - 라벨 lookup 객체 (운영자 측 표시·비교 뷰)
 *   - 옵션 값 → label 헬퍼
 * 를 제공한다.
 *
 * 도메인 타입 자체 (Friend / FriendStatus / SmokingPreference 등) 는
 * `lib/types/domain.ts` 가 single source. 여기서는 재export 하지 않고,
 * 사용처에서 `domain.ts` 에서 가져온다.
 */
import type {
  SmokingSelf,
  DrinkingSelf,
  MarriageViewSelf,
  TattooSelf,
} from "@/lib/types/domain";
// ─────────────────────────────────────────────────────────────
// §1 선호 조건 (구조화 8개 항목) — friend_ideals 1:1 + 다중선택 1:N
// ─────────────────────────────────────────────────────────────

// SmokingPreference / DrinkingPreference / MarriageTiming / TattooPreference 타입은
// `lib/types/domain.ts` 가 single source.
export const SMOKING_OPTIONS = [
  { value: "any", label: "상관없음" },
  { value: "non_smoker_only", label: "비흡연자만" },
] as const;

export const DRINKING_OPTIONS = [
  { value: "any", label: "상관없음" },
  { value: "often_ok", label: "자주 마셔도 OK" },
  { value: "sometimes_only", label: "가끔만 OK" },
  { value: "non_drinker_only", label: "안 마시는 사람만" },
] as const;

export const MARRIAGE_TIMING_OPTIONS = [
  { value: "any", label: "상관없음" },
  { value: "within_2y", label: "1~2년 내 결혼 생각" },
  { value: "over_3y", label: "3년 이상 천천히" },
  { value: "dating_focus", label: "지금은 연애 위주" },
] as const;

export const TATTOO_OPTIONS = [
  { value: "any", label: "상관없음" },
  { value: "none_only", label: "없는 사람만" },
  { value: "small_ok", label: "작은 것 OK" },
] as const;

/** 광역시도 17개 — 거주지역·출신지역 다중 선택 */
export const REGION_OPTIONS = [
  { value: "seoul", label: "서울" },
  { value: "busan", label: "부산" },
  { value: "incheon", label: "인천" },
  { value: "daegu", label: "대구" },
  { value: "daejeon", label: "대전" },
  { value: "gwangju", label: "광주" },
  { value: "ulsan", label: "울산" },
  { value: "sejong", label: "세종" },
  { value: "gyeonggi", label: "경기" },
  { value: "gangwon", label: "강원" },
  { value: "chungbuk", label: "충북" },
  { value: "chungnam", label: "충남" },
  { value: "jeonbuk", label: "전북" },
  { value: "jeonnam", label: "전남" },
  { value: "gyeongbuk", label: "경북" },
  { value: "gyeongnam", label: "경남" },
  { value: "jeju", label: "제주" },
] as const;
export type RegionCode = (typeof REGION_OPTIONS)[number]["value"];

// ─────────────────────────────────────────────────────────────
// 광역시·도 detail 사전 (012 §D3 — 2단계 세분화).
//
// - 광역시 7개 (서울/부산/인천/대구/대전/광주/울산) → 자치구·군 단위
// - 도 9개 (경기/강원/충북/충남/전북/전남/경북/경남/제주) → 시·군 단위
//   - 제주특별자치도는 시 단위 (제주시 / 서귀포시)
// - 세종특별자치시는 세분화 없음 (빈 배열)
//
// 슬러그 컨벤션 (012 결정 로그 §D3 + TDD 게이트):
//   ^[a-z0-9]+(?:-[a-z0-9]+)*$ — 영어 lowercase + '-' + 단위 접미사 (gu/si/gun).
//   동음·이형 충돌은 광역 그룹 안에서만 고려 (다른 region 의 같은 슬러그 OK).
//   행정안전부 시군구 목록 기준 (2026-05).
// ─────────────────────────────────────────────────────────────

/** region+detail 결합 값 — 이상형 다중 선호 / 본인 cascade 모두 공유. */
export type RegionDetailValue = { region: string; detail: string };

export const REGION_DETAIL_OPTIONS: Record<
  RegionCode,
  ReadonlyArray<{ value: string; label: string }>
> = {
  // 서울특별시 — 25 자치구
  seoul: [
    { value: "jongno-gu", label: "종로구" },
    { value: "jung-gu", label: "중구" },
    { value: "yongsan-gu", label: "용산구" },
    { value: "seongdong-gu", label: "성동구" },
    { value: "gwangjin-gu", label: "광진구" },
    { value: "dongdaemun-gu", label: "동대문구" },
    { value: "jungnang-gu", label: "중랑구" },
    { value: "seongbuk-gu", label: "성북구" },
    { value: "gangbuk-gu", label: "강북구" },
    { value: "dobong-gu", label: "도봉구" },
    { value: "nowon-gu", label: "노원구" },
    { value: "eunpyeong-gu", label: "은평구" },
    { value: "seodaemun-gu", label: "서대문구" },
    { value: "mapo-gu", label: "마포구" },
    { value: "yangcheon-gu", label: "양천구" },
    { value: "gangseo-gu", label: "강서구" },
    { value: "guro-gu", label: "구로구" },
    { value: "geumcheon-gu", label: "금천구" },
    { value: "yeongdeungpo-gu", label: "영등포구" },
    { value: "dongjak-gu", label: "동작구" },
    { value: "gwanak-gu", label: "관악구" },
    { value: "seocho-gu", label: "서초구" },
    { value: "gangnam-gu", label: "강남구" },
    { value: "songpa-gu", label: "송파구" },
    { value: "gangdong-gu", label: "강동구" },
  ],

  // 부산광역시 — 15 자치구 + 1 군
  busan: [
    { value: "jung-gu", label: "중구" },
    { value: "seo-gu", label: "서구" },
    { value: "dong-gu", label: "동구" },
    { value: "yeongdo-gu", label: "영도구" },
    { value: "busanjin-gu", label: "부산진구" },
    { value: "dongnae-gu", label: "동래구" },
    { value: "nam-gu", label: "남구" },
    { value: "buk-gu", label: "북구" },
    { value: "haeundae-gu", label: "해운대구" },
    { value: "saha-gu", label: "사하구" },
    { value: "geumjeong-gu", label: "금정구" },
    { value: "gangseo-gu", label: "강서구" },
    { value: "yeonje-gu", label: "연제구" },
    { value: "suyeong-gu", label: "수영구" },
    { value: "sasang-gu", label: "사상구" },
    { value: "gijang-gun", label: "기장군" },
  ],

  // 인천광역시 — 8 자치구 + 2 군
  incheon: [
    { value: "jung-gu", label: "중구" },
    { value: "dong-gu", label: "동구" },
    { value: "michuhol-gu", label: "미추홀구" },
    { value: "yeonsu-gu", label: "연수구" },
    { value: "namdong-gu", label: "남동구" },
    { value: "bupyeong-gu", label: "부평구" },
    { value: "gyeyang-gu", label: "계양구" },
    { value: "seo-gu", label: "서구" },
    { value: "ganghwa-gun", label: "강화군" },
    { value: "ongjin-gun", label: "옹진군" },
  ],

  // 대구광역시 — 7 자치구 + 2 군 (군위군 2023년 편입)
  daegu: [
    { value: "jung-gu", label: "중구" },
    { value: "dong-gu", label: "동구" },
    { value: "seo-gu", label: "서구" },
    { value: "nam-gu", label: "남구" },
    { value: "buk-gu", label: "북구" },
    { value: "suseong-gu", label: "수성구" },
    { value: "dalseo-gu", label: "달서구" },
    { value: "dalseong-gun", label: "달성군" },
    { value: "gunwi-gun", label: "군위군" },
  ],

  // 대전광역시 — 5 자치구
  daejeon: [
    { value: "dong-gu", label: "동구" },
    { value: "jung-gu", label: "중구" },
    { value: "seo-gu", label: "서구" },
    { value: "yuseong-gu", label: "유성구" },
    { value: "daedeok-gu", label: "대덕구" },
  ],

  // 광주광역시 — 5 자치구
  gwangju: [
    { value: "dong-gu", label: "동구" },
    { value: "seo-gu", label: "서구" },
    { value: "nam-gu", label: "남구" },
    { value: "buk-gu", label: "북구" },
    { value: "gwangsan-gu", label: "광산구" },
  ],

  // 울산광역시 — 4 자치구 + 1 군
  ulsan: [
    { value: "jung-gu", label: "중구" },
    { value: "nam-gu", label: "남구" },
    { value: "dong-gu", label: "동구" },
    { value: "buk-gu", label: "북구" },
    { value: "ulju-gun", label: "울주군" },
  ],

  // 세종특별자치시 — 세분화 없음
  sejong: [],

  // 경기도 — 28 시 + 3 군
  gyeonggi: [
    { value: "suwon-si", label: "수원시" },
    { value: "seongnam-si", label: "성남시" },
    { value: "uijeongbu-si", label: "의정부시" },
    { value: "anyang-si", label: "안양시" },
    { value: "bucheon-si", label: "부천시" },
    { value: "gwangmyeong-si", label: "광명시" },
    { value: "pyeongtaek-si", label: "평택시" },
    { value: "dongducheon-si", label: "동두천시" },
    { value: "ansan-si", label: "안산시" },
    { value: "goyang-si", label: "고양시" },
    { value: "gwacheon-si", label: "과천시" },
    { value: "guri-si", label: "구리시" },
    { value: "namyangju-si", label: "남양주시" },
    { value: "osan-si", label: "오산시" },
    { value: "siheung-si", label: "시흥시" },
    { value: "gunpo-si", label: "군포시" },
    { value: "uiwang-si", label: "의왕시" },
    { value: "hanam-si", label: "하남시" },
    { value: "yongin-si", label: "용인시" },
    { value: "paju-si", label: "파주시" },
    { value: "icheon-si", label: "이천시" },
    { value: "anseong-si", label: "안성시" },
    { value: "gimpo-si", label: "김포시" },
    { value: "hwaseong-si", label: "화성시" },
    { value: "gwangju-si", label: "광주시" },
    { value: "yangju-si", label: "양주시" },
    { value: "pocheon-si", label: "포천시" },
    { value: "yeoju-si", label: "여주시" },
    { value: "yeoncheon-gun", label: "연천군" },
    { value: "gapyeong-gun", label: "가평군" },
    { value: "yangpyeong-gun", label: "양평군" },
  ],

  // 강원특별자치도 — 7 시 + 11 군
  gangwon: [
    { value: "chuncheon-si", label: "춘천시" },
    { value: "wonju-si", label: "원주시" },
    { value: "gangneung-si", label: "강릉시" },
    { value: "donghae-si", label: "동해시" },
    { value: "taebaek-si", label: "태백시" },
    { value: "sokcho-si", label: "속초시" },
    { value: "samcheok-si", label: "삼척시" },
    { value: "hongcheon-gun", label: "홍천군" },
    { value: "hoengseong-gun", label: "횡성군" },
    { value: "yeongwol-gun", label: "영월군" },
    { value: "pyeongchang-gun", label: "평창군" },
    { value: "jeongseon-gun", label: "정선군" },
    { value: "cheorwon-gun", label: "철원군" },
    { value: "hwacheon-gun", label: "화천군" },
    { value: "yanggu-gun", label: "양구군" },
    { value: "inje-gun", label: "인제군" },
    { value: "goseong-gun", label: "고성군" },
    { value: "yangyang-gun", label: "양양군" },
  ],

  // 충청북도 — 3 시 + 8 군
  chungbuk: [
    { value: "cheongju-si", label: "청주시" },
    { value: "chungju-si", label: "충주시" },
    { value: "jecheon-si", label: "제천시" },
    { value: "boeun-gun", label: "보은군" },
    { value: "okcheon-gun", label: "옥천군" },
    { value: "yeongdong-gun", label: "영동군" },
    { value: "jincheon-gun", label: "진천군" },
    { value: "goesan-gun", label: "괴산군" },
    { value: "eumseong-gun", label: "음성군" },
    { value: "danyang-gun", label: "단양군" },
    { value: "jeungpyeong-gun", label: "증평군" },
  ],

  // 충청남도 — 8 시 + 7 군
  chungnam: [
    { value: "cheonan-si", label: "천안시" },
    { value: "gongju-si", label: "공주시" },
    { value: "boryeong-si", label: "보령시" },
    { value: "asan-si", label: "아산시" },
    { value: "seosan-si", label: "서산시" },
    { value: "nonsan-si", label: "논산시" },
    { value: "gyeryong-si", label: "계룡시" },
    { value: "dangjin-si", label: "당진시" },
    { value: "geumsan-gun", label: "금산군" },
    { value: "buyeo-gun", label: "부여군" },
    { value: "seocheon-gun", label: "서천군" },
    { value: "cheongyang-gun", label: "청양군" },
    { value: "hongseong-gun", label: "홍성군" },
    { value: "yesan-gun", label: "예산군" },
    { value: "taean-gun", label: "태안군" },
  ],

  // 전북특별자치도 — 6 시 + 8 군
  jeonbuk: [
    { value: "jeonju-si", label: "전주시" },
    { value: "gunsan-si", label: "군산시" },
    { value: "iksan-si", label: "익산시" },
    { value: "jeongeup-si", label: "정읍시" },
    { value: "namwon-si", label: "남원시" },
    { value: "gimje-si", label: "김제시" },
    { value: "wanju-gun", label: "완주군" },
    { value: "jinan-gun", label: "진안군" },
    { value: "muju-gun", label: "무주군" },
    { value: "jangsu-gun", label: "장수군" },
    { value: "imsil-gun", label: "임실군" },
    { value: "sunchang-gun", label: "순창군" },
    { value: "gochang-gun", label: "고창군" },
    { value: "buan-gun", label: "부안군" },
  ],

  // 전라남도 — 5 시 + 17 군
  jeonnam: [
    { value: "mokpo-si", label: "목포시" },
    { value: "yeosu-si", label: "여수시" },
    { value: "suncheon-si", label: "순천시" },
    { value: "naju-si", label: "나주시" },
    { value: "gwangyang-si", label: "광양시" },
    { value: "damyang-gun", label: "담양군" },
    { value: "gokseong-gun", label: "곡성군" },
    { value: "gurye-gun", label: "구례군" },
    { value: "goheung-gun", label: "고흥군" },
    { value: "boseong-gun", label: "보성군" },
    { value: "hwasun-gun", label: "화순군" },
    { value: "jangheung-gun", label: "장흥군" },
    { value: "gangjin-gun", label: "강진군" },
    { value: "haenam-gun", label: "해남군" },
    { value: "yeongam-gun", label: "영암군" },
    { value: "muan-gun", label: "무안군" },
    { value: "hampyeong-gun", label: "함평군" },
    { value: "yeonggwang-gun", label: "영광군" },
    { value: "jangseong-gun", label: "장성군" },
    { value: "wando-gun", label: "완도군" },
    { value: "jindo-gun", label: "진도군" },
    { value: "sinan-gun", label: "신안군" },
  ],

  // 경상북도 — 10 시 + 12 군
  gyeongbuk: [
    { value: "pohang-si", label: "포항시" },
    { value: "gyeongju-si", label: "경주시" },
    { value: "gimcheon-si", label: "김천시" },
    { value: "andong-si", label: "안동시" },
    { value: "gumi-si", label: "구미시" },
    { value: "yeongju-si", label: "영주시" },
    { value: "yeongcheon-si", label: "영천시" },
    { value: "sangju-si", label: "상주시" },
    { value: "mungyeong-si", label: "문경시" },
    { value: "gyeongsan-si", label: "경산시" },
    { value: "uiseong-gun", label: "의성군" },
    { value: "cheongsong-gun", label: "청송군" },
    { value: "yeongyang-gun", label: "영양군" },
    { value: "yeongdeok-gun", label: "영덕군" },
    { value: "cheongdo-gun", label: "청도군" },
    { value: "goryeong-gun", label: "고령군" },
    { value: "seongju-gun", label: "성주군" },
    { value: "chilgok-gun", label: "칠곡군" },
    { value: "yecheon-gun", label: "예천군" },
    { value: "bonghwa-gun", label: "봉화군" },
    { value: "uljin-gun", label: "울진군" },
    { value: "ulleung-gun", label: "울릉군" },
  ],

  // 경상남도 — 8 시 + 10 군
  gyeongnam: [
    { value: "changwon-si", label: "창원시" },
    { value: "jinju-si", label: "진주시" },
    { value: "tongyeong-si", label: "통영시" },
    { value: "sacheon-si", label: "사천시" },
    { value: "gimhae-si", label: "김해시" },
    { value: "miryang-si", label: "밀양시" },
    { value: "geoje-si", label: "거제시" },
    { value: "yangsan-si", label: "양산시" },
    { value: "uiryeong-gun", label: "의령군" },
    { value: "haman-gun", label: "함안군" },
    { value: "changnyeong-gun", label: "창녕군" },
    { value: "goseong-gun", label: "고성군" },
    { value: "namhae-gun", label: "남해군" },
    { value: "hadong-gun", label: "하동군" },
    { value: "sancheong-gun", label: "산청군" },
    { value: "hamyang-gun", label: "함양군" },
    { value: "geochang-gun", label: "거창군" },
    { value: "hapcheon-gun", label: "합천군" },
  ],

  // 제주특별자치도 — 2 시
  jeju: [
    { value: "jeju-si", label: "제주시" },
    { value: "seogwipo-si", label: "서귀포시" },
  ],
};

/** 직업 대분류 — 다중 선택 */
export const JOB_OPTIONS = [
  { value: "office", label: "사무직" },
  { value: "professional", label: "전문직" },
  { value: "civil_servant", label: "공무원" },
  { value: "it_dev", label: "IT·개발" },
  { value: "art_creative", label: "예술·창작" },
  { value: "service", label: "서비스" },
  { value: "self_employed", label: "자영업" },
  { value: "student", label: "학생" },
  { value: "etc", label: "기타" },
] as const;
export type JobCategory = (typeof JOB_OPTIONS)[number]["value"];

// ─────────────────────────────────────────────────────────────
// §2 성격·결 — 키워드 15개 (다중 선택)
// ─────────────────────────────────────────────────────────────

export const PERSONALITY_KEYWORDS = [
  { value: "kind", label: "다정함" },
  { value: "humor", label: "유머" },
  { value: "serious", label: "진중함" },
  { value: "lively", label: "활발함" },
  { value: "calm", label: "차분함" },
  { value: "caring", label: "자상함" },
  { value: "smart", label: "똑똑함" },
  { value: "self_care", label: "자기관리" },
  { value: "stable", label: "안정적" },
  { value: "free_spirit", label: "자유로운" },
  { value: "responsible", label: "책임감" },
  { value: "sociable", label: "친화력" },
  { value: "honest", label: "솔직함" },
  { value: "considerate", label: "배려심" },
  { value: "curious", label: "호기심" },
] as const;
export type PersonalityKeyword = (typeof PERSONALITY_KEYWORDS)[number]["value"];

// ─────────────────────────────────────────────────────────────
// §3 매칭 우선순위 — 6개 카테고리, top 3 선택 (RankingPicker)
// ─────────────────────────────────────────────────────────────

// PriorityCategory 타입은 `lib/types/domain.ts` 가 single source.
export const PRIORITY_CATEGORIES = [
  {
    value: "appearance",
    label: "외모",
    emoji: "✨",
    description: "스타일·인상·체형 등",
  },
  {
    value: "personality",
    label: "성격",
    emoji: "💛",
    description: "결·말투·취향 합",
  },
  {
    value: "stability",
    label: "안정성",
    emoji: "🏠",
    description: "직업·경제·생활 패턴",
  },
  {
    value: "marriage_view",
    label: "결혼관",
    emoji: "💍",
    description: "결혼·아이·가정 그림",
  },
  {
    value: "values",
    label: "가치관",
    emoji: "🧭",
    description: "삶에서 중요하다고 보는 것",
  },
  {
    value: "lifestyle",
    label: "라이프스타일",
    emoji: "🌿",
    description: "취미·여가·일상 흐름",
  },
] as const;

// ─────────────────────────────────────────────────────────────
// 라벨 lookup helper — 단발 사용 (운영자 측 표시·비교 뷰)
// ─────────────────────────────────────────────────────────────

function toLookup<T extends { value: string; label: string }>(arr: readonly T[]) {
  return Object.fromEntries(arr.map((o) => [o.value, o.label])) as Record<
    string,
    string
  >;
}

export const REGION_LABEL = toLookup(REGION_OPTIONS);
export const JOB_LABEL = toLookup(JOB_OPTIONS);
export const PERSONALITY_KEYWORD_LABEL = toLookup(PERSONALITY_KEYWORDS);
export const PRIORITY_CATEGORY_LABEL = toLookup(PRIORITY_CATEGORIES);
export const SMOKING_LABEL = toLookup(SMOKING_OPTIONS);
export const DRINKING_LABEL = toLookup(DRINKING_OPTIONS);
export const MARRIAGE_TIMING_LABEL = toLookup(MARRIAGE_TIMING_OPTIONS);
export const TATTOO_LABEL = toLookup(TATTOO_OPTIONS);

// ─────────────────────────────────────────────────────────────
// 라벨 변환 helper — null/undefined/빈 → "", 매핑 미스 → raw value
// 008 §D3·D4 — 가입자 리스트/디테일 사이 정합성 (사용자 보고 "한글로 보이게").
// 페이지 본체는 이 helper 만 호출 (lookup 객체 직접 노출 ❌).
// ─────────────────────────────────────────────────────────────

function makeLabelGetter(lookup: Record<string, string>) {
  return function getLabel(value: string | null | undefined): string {
    if (value == null || value === "") return "";
    return lookup[value] ?? value;
  };
}

/** region 코드 → 한글 라벨 (광역시도 17개). 예: "gyeonggi" → "경기". */
export const getRegionLabel = makeLabelGetter(REGION_LABEL);

/** 출신지역 코드 → 한글 라벨. hometown 도 region 사전을 공유한다 (광역시도 17개). */
export const getHometownLabel = makeLabelGetter(REGION_LABEL);

/** 직업군 코드 → 한글 라벨. 예: "it_dev" → "IT·개발". */
export const getJobLabel = makeLabelGetter(JOB_LABEL);

/**
 * region + detail 결합 한글 라벨 — 012 §D6.
 *
 * - region null/undefined/빈 → ""
 * - detail null/undefined/빈 → 광역 라벨만 (예: "서울")
 * - detail 매핑 미스 → 광역 라벨만 (raw fallback, 012 §D3 명세)
 * - 둘 다 유효 → "서울 강남구" 처럼 결합
 *
 * hometown 도 같은 사전을 공유 (광역 17개 동일).
 */
export function getRegionFullLabel(
  region: string | null | undefined,
  detail: string | null | undefined,
): string {
  if (region == null || region === "") return "";
  const regionLabel = REGION_LABEL[region] ?? region;
  if (detail == null || detail === "") return regionLabel;
  const detailEntries = REGION_DETAIL_OPTIONS[region as RegionCode];
  if (!detailEntries) return regionLabel;
  const found = detailEntries.find((d) => d.value === detail);
  return found ? `${regionLabel} ${found.label}` : regionLabel;
}

/** hometown 도 region 사전을 공유한다 — 동일 helper 위임. */
export const getHometownFullLabel = getRegionFullLabel;

// ─────────────────────────────────────────────────────────────
// 본인 프로필 4 항목 (009 — 자기 보고). 이상형 enum 셋과 분리.
//
// 이상형 enum 사전 (SMOKING_LABEL 등) 은 "any/non_smoker_only" 등
// "이상형 측 표현". 본인 프로필 enum 사전은 "non_smoker/occasional/regular"
// 등 "자기 상태". 의미 분리 명확히 위해 별 사전 + helper.
// (도메인 타입 import 는 파일 상단에 모음.)
// ─────────────────────────────────────────────────────────────

/** 본인 흡연 사전 — 자기 상태. 이상형 SMOKING_LABEL 과 분리. */
export const SELF_SMOKING_LABEL: Record<SmokingSelf, string> = {
  non_smoker: "비흡연",
  occasional: "가끔 핀다",
  regular: "자주 핀다",
};

/** 본인 음주 사전. */
export const SELF_DRINKING_LABEL: Record<DrinkingSelf, string> = {
  non_drinker: "안 마심",
  sometimes: "가끔",
  often: "자주",
};

/** 본인 결혼관 사전. */
export const SELF_MARRIAGE_VIEW_LABEL: Record<MarriageViewSelf, string> = {
  within_2y: "1~2년 내 결혼",
  over_3y: "3년 이후 결혼",
  dating_focus: "연애 위주",
};

/** 본인 문신 사전. */
export const SELF_TATTOO_LABEL: Record<TattooSelf, string> = {
  none: "없음",
  small: "작은 것",
  large: "큰·여러 개",
};

/** 본인 흡연 코드 → 한글. 이상형 enum (non_smoker_only) 는 raw fallback. */
export const getSmokingLabel = makeLabelGetter(SELF_SMOKING_LABEL);

/** 본인 음주 코드 → 한글. */
export const getDrinkingLabel = makeLabelGetter(SELF_DRINKING_LABEL);

/** 본인 결혼관 코드 → 한글. */
export const getMarriageViewLabel = makeLabelGetter(SELF_MARRIAGE_VIEW_LABEL);

/** 본인 문신 코드 → 한글. 이상형 enum (none_only) 는 raw fallback. */
export const getTattooLabel = makeLabelGetter(SELF_TATTOO_LABEL);

// 본인 프로필 폼 option 배열 (Select / RadioGroup 용).
// label 은 위 사전과 같은 텍스트를 그대로 재사용.
export const SELF_SMOKING_OPTIONS = [
  { value: "non_smoker", label: SELF_SMOKING_LABEL.non_smoker },
  { value: "occasional", label: SELF_SMOKING_LABEL.occasional },
  { value: "regular", label: SELF_SMOKING_LABEL.regular },
] as const;

export const SELF_DRINKING_OPTIONS = [
  { value: "non_drinker", label: SELF_DRINKING_LABEL.non_drinker },
  { value: "sometimes", label: SELF_DRINKING_LABEL.sometimes },
  { value: "often", label: SELF_DRINKING_LABEL.often },
] as const;

export const SELF_MARRIAGE_VIEW_OPTIONS = [
  { value: "within_2y", label: SELF_MARRIAGE_VIEW_LABEL.within_2y },
  { value: "over_3y", label: SELF_MARRIAGE_VIEW_LABEL.over_3y },
  { value: "dating_focus", label: SELF_MARRIAGE_VIEW_LABEL.dating_focus },
] as const;

export const SELF_TATTOO_OPTIONS = [
  { value: "none", label: SELF_TATTOO_LABEL.none },
  { value: "small", label: SELF_TATTOO_LABEL.small },
  { value: "large", label: SELF_TATTOO_LABEL.large },
] as const;

// ─────────────────────────────────────────────────────────────
// 출생연도 범위 (선호 나이대 RangeSlider 의 기본 범위)
// ─────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
export const BIRTH_YEAR_MIN = CURRENT_YEAR - 70; // ~70대 후반까지
export const BIRTH_YEAR_MAX = CURRENT_YEAR - 18; // 만 18+

// FRIEND_STATUS_LABEL 은 `lib/types/domain.ts` 에 있음 (재정의 제거).
