import { describe, expect, it } from 'vitest'
import { getIntegrationContract, nativeIntegrationContracts } from '@/lib/integrations/providers'

describe('native integration contracts', () => {
  it('covers the required ecommerce and paid media providers', () => {
    expect(nativeIntegrationContracts.map((contract) => contract.provider)).toEqual([
      'shopify',
      'woocommerce',
      'stripe',
      'meta_ads',
      'google_ads',
      'tiktok_shop',
      'shopee',
      'lazada',
    ])
  })

  it('treats CSV as fallback outside the native provider list', () => {
    expect(getIntegrationContract('csv')).toBeUndefined()
    expect(getIntegrationContract('shopify')?.capabilities).toContain('webhooks')
  })
})
