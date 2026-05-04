import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LanguageSwitcher } from '@/components/language-switcher'
import { translateText } from '@/lib/i18n'

describe('LanguageSwitcher', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
    document.documentElement.lang = 'en'
  })

  it('switches between English and Thai and persists the choice', async () => {
    installLocalStorageMock()
    render(<LanguageSwitcher />)

    fireEvent.click(screen.getByRole('button', { name: 'TH' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'TH' })).toHaveAttribute('aria-pressed', 'true'))
    expect(window.localStorage.getItem('repeattree.language')).toBe('th')
    expect(document.documentElement.lang).toBe('th')
  })

  it('keeps unknown copy unchanged', () => {
    expect(translateText('Dashboard', 'th')).toBe('แดชบอร์ด')
    expect(translateText('Not translated yet', 'th')).toBe('Not translated yet')
  })

  it('covers primary post-login surfaces with Thai copy', () => {
    expect(translateText('Deep analytics snapshot', 'th')).toBe('ภาพรวม analytics เชิงลึก')
    expect(translateText('Customer explorer', 'th')).toBe('ตัวสำรวจลูกค้า')
    expect(translateText('Loading calendar', 'th')).toBe('กำลังโหลดปฏิทิน')
    expect(translateText('Upload order CSV', 'th')).toBe('อัปโหลด CSV ออเดอร์')
    expect(translateText('Monthly income', 'th')).toBe('รายได้รายเดือน')
    expect(translateText('Migration command center', 'th')).toBe('ศูนย์ควบคุมการย้ายข้อมูล')
    expect(translateText('Step-by-step setup', 'th')).toBe('ตั้งค่าทีละขั้น')
    expect(translateText('Organization', 'th')).toBe('องค์กร')
  })
})

function installLocalStorageMock() {
  const store = new Map<string, string>()

  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => store.set(key, value)),
      removeItem: vi.fn((key: string) => store.delete(key)),
      clear: vi.fn(() => store.clear()),
    },
  })
}
