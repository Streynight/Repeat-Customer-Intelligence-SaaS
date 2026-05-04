'use client'

import { useText } from '@/lib/i18n'

export function LocalizedText({ text }: { text: string }) {
  const t = useText()

  return <>{t(text)}</>
}
