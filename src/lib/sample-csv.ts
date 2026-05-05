export type SampleCsvTemplate = {
  id: 'shopee' | 'tiktok' | 'lazada' | 'custom'
  label: string
  fileName: string
  description: string
  csv: string
}

const header = 'order_id,customer_name,email,phone,line_id,province,order_date,total_amount,product_name,sku,quantity,unit_price,tax_amount,discount_amount,shipping_amount,platform_fee_amount,refund_amount'

export const sampleCsvTemplates: SampleCsvTemplate[] = [
  {
    id: 'shopee',
    label: 'Shopee sample',
    fileName: 'shopee-repeat-orders-sample.csv',
    description: 'Marketplace-style exports with repeated phone numbers across later social orders.',
    csv: [
      header,
      'SHP-2001,Siriporn C,siri@example.com,0814409911,,Bangkok,2026-04-01,1290,Vitamin C serum,VC-SERUM-30,1,1290,,50,40,38,0',
      'SHP-2002,Anan Store,anan@example.com,0891002003,,Chiang Mai,2026-04-03,890,Trial skincare set,TRIAL-SKIN,1,890,,0,35,27,0',
      'SHP-2003,Siriporn Ch,siri@example.com,0814409911,,Bangkok,2026-04-19,1890,Night cream refill,NIGHT-REFILL,1,1890,,80,40,56,0',
      'SHP-2004,Pawinee L,pawinee@example.com,0864507711,,Nakhon Ratchasima,2026-04-20,2490,Family bundle,FAMILY-BUNDLE,1,2490,,120,60,75,0',
    ].join('\n'),
  },
  {
    id: 'tiktok',
    label: 'TikTok Shop sample',
    fileName: 'tiktok-repeat-orders-sample.csv',
    description: 'TikTok buyers who repurchase through TikTok and later website checkout.',
    csv: [
      header,
      'TT-7001,Natcha M,natcha@example.com,0825559988,@natcha,Bangkok,2026-04-02,1590,Flash sale serum,FLASH-SERUM,1,1590,,100,40,80,0',
      'TT-7002,Beam P,beam@example.com,0876601100,@beam,Chonburi,2026-04-05,990,Lip care set,LIP-CARE,1,990,,40,35,50,0',
      'TT-7003,Natcha M.,natcha@example.com,0825559988,@natcha,Bangkok,2026-04-22,2690,Repeat glow bundle,GLOW-BUNDLE,1,2690,,150,60,135,0',
      'TT-7004,Janjira K,janjira@example.com,0842228001,@janjira,Khon Kaen,2026-04-25,1190,Cleansing set,CLEANSE-SET,1,1190,,60,40,60,0',
    ].join('\n'),
  },
  {
    id: 'lazada',
    label: 'Lazada sample',
    fileName: 'lazada-repeat-orders-sample.csv',
    description: 'Lazada-style orders with buyer, phone, SKU, fees, and repeat purchase fields.',
    csv: [
      header,
      'LZD-4001,Warunee P,warunee@example.com,0801112233,,Bangkok,2026-04-04,1320,Hydration mask,HYD-MASK,2,660,,40,35,52,0',
      'LZD-4002,Thanakorn B,thanakorn@example.com,0861123344,,Pathum Thani,2026-04-08,1890,Daily supplement pack,DAILY-SUP,1,1890,,90,45,76,0',
      'LZD-4003,Warunee P.,warunee@example.com,0801112233,,Bangkok,2026-04-24,2600,Hydration refill bundle,HYD-REFILL,1,2600,,120,55,104,0',
      'LZD-4004,Kanya C,kanya@example.com,0832244556,,Surat Thani,2026-04-27,990,Trial mask set,MASK-TRIAL,1,990,,30,35,40,0',
    ].join('\n'),
  },
  {
    id: 'custom',
    label: 'Custom CSV sample',
    fileName: 'custom-repeat-orders-sample.csv',
    description: 'Generic CSV for Instagram, Facebook, website, or offline order sheets.',
    csv: [
      header,
      'CSV-9001,Chanida R,chanida@example.com,0917788110,line_chanida,Phuket,2026-03-28,2200,Body care kit,BODY-KIT,1,2200,143.93,0,0,0,0',
      'CSV-9002,Prakit S,prakit@example.com,0883004411,line_prakit,Rayong,2026-03-31,760,Trial pack,TRIAL-PACK,1,760,49.72,0,0,0,0',
      'CSV-9003,Chanida R.,chanida@example.com,0917788110,line_chanida,Phuket,2026-04-24,3400,VIP body bundle,VIP-BODY,1,3400,222.43,0,0,0,0',
      'CSV-9004,Orn B,orn@example.com,0837756612,line_orn,Nonthaburi,2026-04-26,1450,Moisture set,MOISTURE-SET,1,1450,94.86,0,0,0,0',
    ].join('\n'),
  },
]

export function downloadSampleCsv(template: SampleCsvTemplate) {
  const blob = new Blob([template.csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = template.fileName
  link.click()
  URL.revokeObjectURL(url)
}
