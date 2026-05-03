export type SampleCsvTemplate = {
  id: 'shopee' | 'tiktok' | 'custom'
  label: string
  fileName: string
  description: string
  csv: string
}

const header = 'order_id,customer_name,email,phone,line_id,province,order_date,total_amount,product_name,quantity,unit_price'

export const sampleCsvTemplates: SampleCsvTemplate[] = [
  {
    id: 'shopee',
    label: 'Shopee sample',
    fileName: 'shopee-repeat-orders-sample.csv',
    description: 'Marketplace-style exports with repeated phone numbers across later social orders.',
    csv: [
      header,
      'SHP-2001,Siriporn C,siri@example.com,0814409911,,Bangkok,2026-04-01,1290,Vitamin C serum,1,1290',
      'SHP-2002,Anan Store,anan@example.com,0891002003,,Chiang Mai,2026-04-03,890,Trial skincare set,1,890',
      'SHP-2003,Siriporn Ch,siri@example.com,0814409911,,Bangkok,2026-04-19,1890,Night cream refill,1,1890',
      'SHP-2004,Pawinee L,pawinee@example.com,0864507711,,Nakhon Ratchasima,2026-04-20,2490,Family bundle,1,2490',
    ].join('\n'),
  },
  {
    id: 'tiktok',
    label: 'TikTok Shop sample',
    fileName: 'tiktok-repeat-orders-sample.csv',
    description: 'TikTok buyers who repurchase through TikTok and later website checkout.',
    csv: [
      header,
      'TT-7001,Natcha M,natcha@example.com,0825559988,@natcha,Bangkok,2026-04-02,1590,Flash sale serum,1,1590',
      'TT-7002,Beam P,beam@example.com,0876601100,@beam,Chonburi,2026-04-05,990,Lip care set,1,990',
      'TT-7003,Natcha M.,natcha@example.com,0825559988,@natcha,Bangkok,2026-04-22,2690,Repeat glow bundle,1,2690',
      'TT-7004,Janjira K,janjira@example.com,0842228001,@janjira,Khon Kaen,2026-04-25,1190,Cleansing set,1,1190',
    ].join('\n'),
  },
  {
    id: 'custom',
    label: 'Custom CSV sample',
    fileName: 'custom-repeat-orders-sample.csv',
    description: 'Generic CSV for Instagram, Facebook, website, or offline order sheets.',
    csv: [
      header,
      'CSV-9001,Chanida R,chanida@example.com,0917788110,line_chanida,Phuket,2026-03-28,2200,Body care kit,1,2200',
      'CSV-9002,Prakit S,prakit@example.com,0883004411,line_prakit,Rayong,2026-03-31,760,Trial pack,1,760',
      'CSV-9003,Chanida R.,chanida@example.com,0917788110,line_chanida,Phuket,2026-04-24,3400,VIP body bundle,1,3400',
      'CSV-9004,Orn B,orn@example.com,0837756612,line_orn,Nonthaburi,2026-04-26,1450,Moisture set,1,1450',
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
