import { Resolver } from 'node:dns/promises'
import { loadEnvConfig } from '@next/env'

type DnsCheck = {
  label: string
  status: 'ok' | 'warn' | 'fail'
  detail: string
}

const vercelApexIp = '76.76.21.21'
const vercelCnamePattern = /vercel-dns/i
const resendFeedbackMxPattern = /feedback-smtp\..*\.amazonses\.com\.?$/i
const resendSpfPattern = /^v=spf1\s+.*include:amazonses\.com\b/i
const resolver = new Resolver()

resolver.setServers(['1.1.1.1', '8.8.8.8'])

loadEnvConfig(process.cwd())

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})

async function main() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    console.error('NEXT_PUBLIC_APP_URL is required for DNS readiness checks.')
    process.exitCode = 1
    return
  }

  const hostname = new URL(appUrl).hostname.toLowerCase()
  const apexDomain = hostname.startsWith('www.') ? hostname.slice(4) : hostname
  const wwwDomain = `www.${apexDomain}`
  const resendDomain = process.env.RESEND_FROM_EMAIL?.split('@')[1]?.trim().toLowerCase()

  const checks = [
    await checkNameservers(apexDomain),
    await checkApexARecord(apexDomain),
    await checkWwwRecord(wwwDomain),
    ...resendDomain ? [
      await checkResendSpfMxRecord(resendDomain),
      await checkResendSpfTxtRecord(resendDomain),
      await checkResendDkimRecord(resendDomain),
      await checkDmarcRecord(resendDomain),
    ] : [warnCheck('Resend sender domain', 'RESEND_FROM_EMAIL is not configured.')],
  ]

  const failed = checks.filter((check) => check.status === 'fail')

  console.log(`RepeatTree DNS readiness: ${failed.length ? 'FAIL' : 'OK'}`)
  for (const check of checks) {
    console.log(`- ${check.label}: ${check.status.toUpperCase()} (${check.detail})`)
  }

  process.exitCode = failed.length ? 1 : 0
}

async function checkNameservers(domain: string): Promise<DnsCheck> {
  try {
    const records = await resolver.resolveNs(domain)
    return records.length
      ? okCheck('Authoritative nameservers', records.join(', '))
      : failCheck('Authoritative nameservers', `No NS records found for ${domain}.`)
  } catch (error) {
    return failCheck('Authoritative nameservers', errorDetail(error))
  }
}

async function checkApexARecord(domain: string): Promise<DnsCheck> {
  try {
    const records = await resolver.resolve4(domain)
    return records.includes(vercelApexIp)
      ? okCheck('Apex Vercel A record', `${domain} resolves to ${vercelApexIp}.`)
      : failCheck('Apex Vercel A record', `${domain} A records are ${records.join(', ') || 'empty'}; expected ${vercelApexIp}.`)
  } catch (error) {
    return failCheck('Apex Vercel A record', errorDetail(error))
  }
}

async function checkWwwRecord(domain: string): Promise<DnsCheck> {
  try {
    const records = await resolver.resolveCname(domain)
    return records.some((record) => vercelCnamePattern.test(record))
      ? okCheck('www Vercel CNAME', `${domain} CNAME resolves to ${records.join(', ')}.`)
      : failCheck('www Vercel CNAME', `${domain} CNAME records are ${records.join(', ') || 'empty'}; expected a Vercel DNS target.`)
  } catch (error) {
    try {
      const records = await resolver.resolve4(domain)
      return records.includes(vercelApexIp)
        ? okCheck('www Vercel record', `${domain} resolves to ${vercelApexIp}.`)
        : failCheck('www Vercel record', `${domain} A records are ${records.join(', ') || 'empty'}; expected a Vercel DNS target.`)
    } catch {
      return failCheck('www Vercel CNAME', errorDetail(error))
    }
  }
}

async function checkResendSpfMxRecord(domain: string): Promise<DnsCheck> {
  const host = `send.${domain}`

  try {
    const records = await resolver.resolveMx(host)
    const mx = records.find((record) => resendFeedbackMxPattern.test(record.exchange))

    return mx
      ? okCheck('Resend SPF MX', `${host} routes feedback to ${mx.exchange}.`)
      : failCheck('Resend SPF MX', `${host} has no Resend feedback MX record. Add the MX value shown by Resend.`)
  } catch (error) {
    return failCheck('Resend SPF MX', errorDetail(error))
  }
}

async function checkResendSpfTxtRecord(domain: string): Promise<DnsCheck> {
  const host = `send.${domain}`

  try {
    const records = await resolver.resolveTxt(host)
    const flatRecords = records.map((parts) => parts.join(''))
    const spf = flatRecords.find((record) => resendSpfPattern.test(record))

    return spf
      ? okCheck('Resend SPF TXT', `${host} authorizes Amazon SES for Resend.`)
      : failCheck('Resend SPF TXT', `${host} has no Resend SPF TXT record. Add the TXT value shown by Resend.`)
  } catch (error) {
    return failCheck('Resend SPF TXT', errorDetail(error))
  }
}

async function checkResendDkimRecord(domain: string): Promise<DnsCheck> {
  const host = `resend._domainkey.${domain}`

  try {
    const records = await resolver.resolveTxt(host)
    const hasDkim = records.some((parts) => parts.join('').toLowerCase().startsWith('p='))

    return hasDkim
      ? okCheck('Resend DKIM TXT', `${host} has a DKIM public key.`)
      : failCheck('Resend DKIM TXT', `${host} has no DKIM public key. Add the DKIM value shown by Resend.`)
  } catch (error) {
    return failCheck('Resend DKIM TXT', errorDetail(error))
  }
}

async function checkDmarcRecord(domain: string): Promise<DnsCheck> {
  try {
    const records = await resolver.resolveTxt(`_dmarc.${domain}`)
    const hasDmarc = records.some((parts) => parts.join('').toLowerCase().startsWith('v=dmarc1'))

    return hasDmarc
      ? okCheck('DMARC TXT', `${domain} has a DMARC policy.`)
      : warnCheck('DMARC TXT', `${domain} has no DMARC policy yet.`)
  } catch {
    return warnCheck('DMARC TXT', `${domain} has no DMARC policy yet.`)
  }
}

function okCheck(label: string, detail: string): DnsCheck {
  return { label, status: 'ok', detail }
}

function warnCheck(label: string, detail: string): DnsCheck {
  return { label, status: 'warn', detail }
}

function failCheck(label: string, detail: string): DnsCheck {
  return { label, status: 'fail', detail }
}

function errorDetail(error: unknown) {
  return error instanceof Error ? error.message : 'DNS lookup failed.'
}
