/**
 * 이메일 마스킹 — 계정 찾기에서 전체 이메일을 노출하지 않기 위해 사용.
 *
 * `jaeseok@gmail.com` → `ja***@gm***.com`
 * 로컬/도메인 앞 2글자만 남기고 나머지는 `***`, TLD(`.com`)는 보존한다.
 * 짧은(1글자) 로컬/도메인도 안전하게 1글자 + `***` 로 마스킹한다.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@')
  if (at <= 0) return '***'
  const local = email.slice(0, at)
  const domain = email.slice(at + 1)
  const dot = domain.lastIndexOf('.')
  const tld = dot >= 0 ? domain.slice(dot) : ''
  const domainName = dot >= 0 ? domain.slice(0, dot) : domain

  const maskPart = (s: string, keep: number): string =>
    s.length <= keep ? `${s.slice(0, 1)}***` : `${s.slice(0, keep)}***`

  return `${maskPart(local, 2)}@${maskPart(domainName, 2)}${tld}`
}
