'use client'

import { Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { translateText, useLanguage, type Language } from '@/lib/i18n'
import { cn } from '@/lib/utils'

const languages: Array<{ value: Language; label: string }> = [
  { value: 'en', label: 'EN' },
  { value: 'th', label: 'TH' },
]

export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage } = useLanguage()

  return (
    <div
      className={cn('inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1 shadow-sm', className)}
      aria-label={translateText('Language switcher', language)}
    >
      <Languages className="mx-1 size-4 text-muted-foreground" aria-hidden="true" />
      {languages.map((item) => (
        <Button
          key={item.value}
          type="button"
          size="sm"
          variant={language === item.value ? 'default' : 'ghost'}
          className="h-7 px-2 text-xs font-black"
          aria-pressed={language === item.value}
          onClick={() => setLanguage(item.value)}
        >
          {item.label}
        </Button>
      ))}
    </div>
  )
}
