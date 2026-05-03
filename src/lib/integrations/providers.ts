export type NativeIntegrationProvider =
  | 'shopify'
  | 'woocommerce'
  | 'stripe'
  | 'meta_ads'
  | 'google_ads'
  | 'tiktok_shop'
  | 'shopee'
  | 'lazada'

export type IntegrationCapability =
  | 'orders'
  | 'customers'
  | 'products'
  | 'refunds'
  | 'adSpend'
  | 'campaigns'
  | 'webhooks'

export type IntegrationContract = {
  provider: NativeIntegrationProvider
  label: string
  capabilities: IntegrationCapability[]
  primaryCustomerKeys: Array<'email' | 'phone' | 'externalCustomerId' | 'platformId'>
  authModel: 'oauth' | 'apiKey' | 'partnerApp'
}

export const nativeIntegrationContracts: IntegrationContract[] = [
  {
    provider: 'shopify',
    label: 'Shopify',
    capabilities: ['orders', 'customers', 'products', 'refunds', 'webhooks'],
    primaryCustomerKeys: ['externalCustomerId', 'email', 'phone'],
    authModel: 'oauth',
  },
  {
    provider: 'woocommerce',
    label: 'WooCommerce',
    capabilities: ['orders', 'customers', 'products', 'refunds', 'webhooks'],
    primaryCustomerKeys: ['externalCustomerId', 'email', 'phone'],
    authModel: 'apiKey',
  },
  {
    provider: 'stripe',
    label: 'Stripe',
    capabilities: ['orders', 'customers', 'refunds', 'webhooks'],
    primaryCustomerKeys: ['externalCustomerId', 'email'],
    authModel: 'oauth',
  },
  {
    provider: 'meta_ads',
    label: 'Meta Ads',
    capabilities: ['adSpend', 'campaigns'],
    primaryCustomerKeys: ['platformId'],
    authModel: 'oauth',
  },
  {
    provider: 'google_ads',
    label: 'Google Ads',
    capabilities: ['adSpend', 'campaigns'],
    primaryCustomerKeys: ['platformId'],
    authModel: 'oauth',
  },
  {
    provider: 'tiktok_shop',
    label: 'TikTok Shop',
    capabilities: ['orders', 'customers', 'products', 'refunds', 'webhooks'],
    primaryCustomerKeys: ['externalCustomerId', 'phone', 'email'],
    authModel: 'partnerApp',
  },
  {
    provider: 'shopee',
    label: 'Shopee',
    capabilities: ['orders', 'customers', 'products', 'refunds', 'webhooks'],
    primaryCustomerKeys: ['externalCustomerId', 'phone', 'email'],
    authModel: 'partnerApp',
  },
  {
    provider: 'lazada',
    label: 'Lazada',
    capabilities: ['orders', 'customers', 'products', 'refunds', 'webhooks'],
    primaryCustomerKeys: ['externalCustomerId', 'phone', 'email'],
    authModel: 'partnerApp',
  },
]

export function getIntegrationContract(provider: string) {
  return nativeIntegrationContracts.find((contract) => contract.provider === provider)
}
