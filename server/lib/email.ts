/**
 * 트랜잭션 메일 발송 (Resend).
 *
 * 설계 원칙
 * - 공급자 교체 가능: 현재는 Resend HTTP API 를 `$fetch` 로 직접 호출한다(별도 npm 의존성 없음).
 *   다른 공급자로 바꾸려면 `deliver()` 한 곳만 교체하면 된다.
 * - fail-soft: 발송 실패/미설정이어도 **절대 throw 하지 않는다**. 비밀번호 재설정은
 *   `forgetPassword` 호출 결과로 성공/실패를 노출하면 "그 이메일이 가입돼 있는지"를
 *   공격자가 알 수 있으므로(계정 열거), 호출부는 항상 동일하게 성공 응답을 줘야 한다.
 * - 키 미설정(dev): 메일을 보내지 않고 콘솔에 링크를 찍는다 → RESEND_API_KEY 없이도
 *   재설정 흐름을 로컬에서 끝까지 테스트할 수 있다.
 *
 * 환경변수
 * - RESEND_API_KEY : Resend API 키. 없으면 콘솔 폴백(미발송).
 * - MAIL_FROM      : 발신 주소. 예) "TerraWorld <noreply@terraworld.web-qplay.kr>".
 *                    Resend 는 발신 도메인 인증(DNS)이 돼 있어야 실제 전송된다.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

interface SendArgs {
  to: string
  subject: string
  html: string
  text: string
}

function mailFrom(): string {
  return process.env.MAIL_FROM || 'TerraWorld <noreply@terraworld.web-qplay.kr>'
}

async function deliver({ to, subject, html, text }: SendArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    // 공급자 미설정 — dev 폴백. 절대 throw 하지 않는다(계정 열거 방지).
    // eslint-disable-next-line no-console
    console.warn(`[email] RESEND_API_KEY 미설정 — 메일 미발송(콘솔 폴백). to=${to} subject="${subject}"`)
    // eslint-disable-next-line no-console
    console.info(`[email:dev]\n${text}`)
    return
  }
  try {
    await $fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: { from: mailFrom(), to: [to], subject, html, text },
      timeout: 10_000,
      retry: 1,
      retryDelay: 300,
    })
  }
  catch (e) {
    // 발송 실패를 호출부로 전파하지 않는다(계정 열거 방지). 운영 로그로만 남긴다.
    // eslint-disable-next-line no-console
    console.error('[email] 발송 실패', e)
  }
}

/**
 * 비밀번호 재설정 메일.
 * @param to  수신 이메일
 * @param url better-auth 가 생성한 재설정 검증 링크. 그대로 사용한다.
 *            (클릭 시 callbackURL=/auth/reset-password 로 token 쿼리와 함께 리다이렉트됨)
 */
export async function sendPasswordResetEmail(to: string, url: string): Promise<void> {
  const subject = 'TerraWorld 비밀번호 재설정'
  const text = [
    'TerraWorld 비밀번호 재설정 요청',
    '',
    '아래 링크에서 새 비밀번호를 설정하세요 (링크는 1시간 동안만 유효합니다):',
    url,
    '',
    '본인이 요청하지 않았다면 이 메일을 무시하세요. 비밀번호는 변경되지 않습니다.',
  ].join('\n')

  const html = `
  <div style="max-width:480px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2d3348">
    <div style="text-align:center;padding:24px 0">
      <h1 style="margin:0;font-size:22px;letter-spacing:1px;color:#5b6fa6">TERRAWORLD</h1>
    </div>
    <div style="background:#f6f4ff;border-radius:16px;padding:28px 24px">
      <h2 style="margin:0 0 12px;font-size:18px;color:#4a5580">비밀번호 재설정</h2>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4f659c">
        아래 버튼을 눌러 새 비밀번호를 설정하세요.<br>이 링크는 <strong>1시간</strong> 동안만 유효합니다.
      </p>
      <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#97a8f1 0%,#c4a0f0 100%);color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:12px">
        비밀번호 재설정하기
      </a>
      <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#8a93b0">
        버튼이 동작하지 않으면 아래 주소를 브라우저에 붙여넣으세요:<br>
        <span style="word-break:break-all;color:#4e62bc">${url}</span>
      </p>
    </div>
    <p style="margin:16px 4px;font-size:12px;line-height:1.6;color:#9aa0b5">
      본인이 요청하지 않았다면 이 메일을 무시하세요. 비밀번호는 변경되지 않습니다.
    </p>
  </div>`

  await deliver({ to, subject, html, text })
}
