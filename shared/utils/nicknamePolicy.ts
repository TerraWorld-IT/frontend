/**
 * 닉네임 금칙어 정책 (App Store 가이드라인 1.2 — 사용자 생성 콘텐츠 필터링).
 *
 * 앱(가입 폼·프로필 수정 폼 즉시 안내)과 Nuxt 서버(better-auth 가입 before hook)가 이 모듈 하나를 쓴다.
 * 백엔드 `NicknamePolicy.kt`(프로필 수정 최종 검증)와 같은 목록·정규화·판정 규칙이다. 한쪽을 바꾸면 반드시 다른 쪽도 맞춘다.
 *
 * 정규화: NFKC → 소문자화 → (영문 소문자 / 한글 음절 / 한글 자모 이외 문자와 한글 채움 문자 제거) → 다시 NFKC.
 *  - 공백·숫자·특수문자·이모지·제로폭 문자가 사이에 끼워진 변형("시1발", "ㅅ.ㅂ", "F u c k")을 같은 단어로 본다.
 *  - NFKC 는 호환 자모(ㅅ U+3145)를 첫소리 자모(U+1109)로 바꾸므로 첫소리·가운뎃소리·끝소리 자모(U+1100–U+11FF)도
 *    남긴다. 이 범위를 지우면 'ㅅㅂ' 같은 목록 단어가 빈 문자열이 되어 모든 닉네임이 걸린다.
 *  - 분해 자모 사이에 구분자를 넣은 입력은 구분자를 지운 뒤 두 번째 NFKC 로 음절로 재조합한다.
 *  - 한글 채움 문자(U+115F, U+1160, U+3164, U+FFA0)는 폭이 없어 보이는 구분자이므로 제거한다("시\u3164발").
 *  - 추가로 leet 치환(0→o, 1→i, 3→e, 4→a, 5→s, @→a, $→s)을 적용한 형태도 함께 검사한다("sh1t", "b1tch").
 *
 * 판정: SUBSTRING_WORDS 는 정규화 결과에 부분 일치하면 거부, EXACT_WORDS 는 정규화 결과 전체가 그 단어일 때만 거부한다.
 *  - 정규화 과정에서 숫자가 지워지므로 "se2x", "자2지" 도 단독 단어로 판정된다.
 *  - 오탐이 많은 '년' 은 목록에 넣지 않는다("2020년" 이 걸린다). 욕설 용법은 "미친년" 같은 복합어로 막는다.
 */

/** 한글 채움 문자 — 글자처럼 보이지 않으면서 자모 사이를 끊는 구분자로 쓰인다. */
const HANGUL_FILLERS = /[\u115F\u1160\u3164\uFFA0]/g
/** 영문 소문자·한글 음절·한글 자모(첫소리/가운뎃소리/끝소리 + 호환 자모) 이외 문자. */
const NON_WORD_CHARS = /[^a-z\uAC00-\uD7A3\u1100-\u11FF\u3131-\u318E]/g

/** leet 치환 표 — 숫자 제거만으로는 놓치는 영문 변형용. */
const LEET: Record<string, string> = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', '@': 'a', $: 's' }

function fold(text: string): string {
  return text.normalize('NFKC').toLowerCase()
}

function strip(text: string): string {
  return text.replace(HANGUL_FILLERS, '').replace(NON_WORD_CHARS, '').normalize('NFKC')
}

/** 목록 단어를 입력과 같은 규칙으로 정규화한다. */
export function normalizeNickname(text: string): string {
  return strip(fold(text))
}

/** 정규화 후 부분 일치로 막는 단어. */
const SUBSTRING_WORDS: readonly string[] = [
  // 한국어 욕설·비하
  '시발', '씨발', '씨빨', 'ㅅㅂ', 'ㅆㅂ', '병신', 'ㅄ', 'ㅂㅅ',
  '개새끼', '개새', '좆', '존나', '지랄', '미친놈', '미친년',
  '꺼져', '닥쳐', '엿먹', '느금마', '니애미',
  // 한국어 성적 표현
  '섹스', '야동', '걸레', '창녀',
  // 영어
  'fuck', 'shit', 'bitch', 'asshole', 'pussy', 'cunt', 'nigger', 'faggot', 'porn',
  // 운영 사칭
  '운영자', '관리자', 'admin', 'terraworld운영', '테라월드운영',
].map(normalizeNickname)

/**
 * 정규화 결과 전체가 일치할 때만 막는 단어 — 부분 일치로 막으면 정상 닉네임이 걸리는 짧은 단어.
 *  - 시바: "시바견"(견종)  - 새끼: "새끼고양이"  - 졸라: "졸라맨"
 *  - 애미/애비: 이름·외래어("애비뉴")  - 보지/자지: "보지마"·"안자지" 등 일상어
 *  - sex/dick: "Essex"·"Sussex"·"Dickens"
 */
const EXACT_WORDS: ReadonlySet<string> = new Set(
  ['시바', '새끼', '졸라', '애미', '애비', '보지', '자지', 'sex', 'dick'].map(normalizeNickname),
)

/** 닉네임이 금칙어(욕설·비하·성적 표현·운영자 사칭)에 걸리면 true. 검사 형태는 원문과 leet 치환형 두 가지. */
export function isForbiddenNickname(nickname: string): boolean {
  const folded = fold(nickname)
  const leet = Array.from(folded, c => LEET[c] ?? c).join('')
  return [strip(folded), strip(leet)].some(form =>
    form.length > 0 && (EXACT_WORDS.has(form) || SUBSTRING_WORDS.some(word => form.includes(word))),
  )
}

/** 가입 거부 응답과 클라이언트 안내가 함께 쓰는 오류 코드·문구. */
export const NICKNAME_NOT_ALLOWED_CODE = 'NICKNAME_NOT_ALLOWED'
export const NICKNAME_NOT_ALLOWED_MESSAGE = '사용할 수 없는 닉네임이에요'
