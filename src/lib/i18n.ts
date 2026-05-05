'use client'

import { useEffect, useSyncExternalStore } from 'react'

export type Language = 'en' | 'th'

const languageStorageKey = 'repeattree.language'
const defaultLanguage: Language = 'en'
const listeners = new Set<() => void>()

const thaiCopy: Record<string, string> = {
  Admin: 'ผู้ดูแล',
  'Admin diagnostics': 'การตรวจสอบระบบ',
  Analytics: 'วิเคราะห์',
  Calendar: 'ปฏิทิน',
  Configuration: 'การตั้งค่า',
  Customers: 'ลูกค้า',
  Dashboard: 'แดชบอร์ด',
  'Deep retention analytics': 'วิเคราะห์ลูกค้าเชิงลึก',
  'Import multi-channel orders': 'นำเข้าออเดอร์หลายช่องทาง',
  'Marketplace import': 'นำเข้าไฟล์ marketplace',
  Imports: 'นำเข้า',
  Income: 'รายได้',
  'Income and VAT': 'รายได้และ VAT',
  'Main value screen': 'หน้าหลักของธุรกิจ',
  Operations: 'การปฏิบัติการ',
  'Repeat customer dashboard': 'แดชบอร์ดลูกค้าซื้อซ้ำ',
  'Repeat timing': 'จังหวะการซื้อซ้ำ',
  Settings: 'ตั้งค่า',
  Tutorials: 'คู่มือ',
  'Unified profiles': 'โปรไฟล์รวม',
  'Customer detail': 'รายละเอียดลูกค้า',
  'Customer profile': 'โปรไฟล์ลูกค้า',
  'Customer tutorial': 'คู่มือใช้งาน',
  'How to use RepeatTree': 'วิธีใช้ RepeatTree',
  'CSV import': 'นำเข้า CSV',
  'Cohorts, RFM segments, product repeat paths, channel quality, and opportunity lists built from order data.':
    'ดู cohort, RFM, สินค้าที่ซื้อซ้ำ, คุณภาพช่องทาง และรายการโอกาสจากข้อมูลออเดอร์จริง',
  'Full identity, merged channels, purchase history, products bought, and order timeline.':
    'ดูตัวตนลูกค้า ช่องทางที่รวมแล้ว ประวัติซื้อ สินค้า และไทม์ไลน์ออเดอร์',
  'Merged customer identities across channels with repeat, VIP, at-risk, and lost classifications.':
    'รวมตัวตนลูกค้าข้ามช่องทาง พร้อมจัดกลุ่มลูกค้าซื้อซ้ำ VIP เสี่ยงหาย และหายไปแล้ว',
  'Production settings for customer classification, tenant operations, and lifecycle automation.':
    'ตั้งค่าการจัดกลุ่มลูกค้า การทำงานของ workspace และ automation lifecycle สำหรับ production',
  'Operational control for tenant health, team roles, ingestion failures, and audit activity.':
    'หน้าควบคุมการทำงานสำหรับสุขภาพ tenant, role ทีม, ingestion failure และ audit activity',
  'See repeat orders, revenue, channel activity, and follow-up timing by day without adding manual event work.':
    'ดูออเดอร์ซื้อซ้ำ รายได้ กิจกรรมช่องทาง และจังหวะ follow-up รายวันโดยไม่ต้องสร้าง event เอง',
  'Track gross income, net snapshot, Thailand VAT estimates, channel income, and scheduled CSV order syncs.':
    'ติดตามรายได้รวม ภาพรวมสุทธิ VAT ไทย รายได้ตามช่องทาง และการ sync CSV ตามกำหนด',
  'Follow the shortest path from an empty workspace to repeat revenue actions your team can run every week.':
    'เริ่มจาก workspace ว่างไปสู่ action เพิ่มรายได้ซื้อซ้ำที่ทีมทำซ้ำได้ทุกสัปดาห์',
  'Understand who buys repeatedly, who is VIP or at risk, and which channel drives repeat revenue in under ten seconds.':
    'เข้าใจในไม่กี่วินาทีว่าใครซื้อซ้ำ ใครคือ VIP หรือเสี่ยงหาย และช่องทางไหนสร้างรายได้ซื้อซ้ำ',
  'Upload marketplace and social commerce order exports, map columns, preview rows, and process customers through the identity engine.':
    'อัปโหลดไฟล์ออเดอร์จาก marketplace หรือ social commerce, map columns, preview rows และรวมลูกค้าผ่าน identity engine',
  'Upload order files from Shopee, TikTok, Lazada, or CSV. RepeatTree cleans and maps the export before analysis.':
    'อัปโหลดไฟล์ออเดอร์จาก Shopee, TikTok, Lazada หรือ CSV แล้ว RepeatTree จะ clean และ map ไฟล์ก่อนวิเคราะห์',

  'Repeat Customer Intelligence': 'ระบบวิเคราะห์ลูกค้าซื้อซ้ำ',
  'Operator-grade retention SaaS': 'Retention SaaS สำหรับทีมปฏิบัติการ',
  'A production workspace for merchants who need retained revenue, channel quality, customer risk, and automation readiness from real order data.':
    'Workspace สำหรับร้านค้าที่ต้องการเห็นรายได้ซื้อซ้ำ คุณภาพช่องทาง ความเสี่ยงลูกค้า และความพร้อม automation จากข้อมูลออเดอร์จริง',
  Login: 'เข้าสู่ระบบ',
  'Open workspace': 'เปิด workspace',
  'Start with real data': 'เริ่มด้วยข้อมูลจริง',
  'Sign in': 'เข้าสู่ระบบ',
  'Import orders': 'นำเข้าออเดอร์',
  'CSV today, native integrations as each channel is ready.': 'ใช้ CSV ได้ทันที และต่อ native integrations เมื่อแต่ละช่องทางพร้อม',
  'Resolve customers': 'รวมตัวตนลูกค้า',
  'Merge email, phone, LINE ID, and channel identity signals.': 'รวม email, เบอร์โทร, LINE ID และสัญญาณตัวตนจากทุกช่องทาง',
  'Act on repeat value': 'ลงมือจากมูลค่าซื้อซ้ำ',
  'Prioritize VIP protection, second purchase, and win-back work.': 'จัดลำดับงานดูแล VIP, กระตุ้นซื้อครั้งที่สอง และ win-back',
  'Tenant-scoped imports': 'นำเข้าข้อมูลแยกตาม tenant',
  'Billing-aware usage': 'คิด usage ตาม billing',
  'Retry-safe jobs': 'งาน retry ได้อย่างปลอดภัย',
  'Health checks live': 'มี live health checks',
  Workspace: 'Workspace',
  'Retention command center': 'ศูนย์ควบคุม retention',
  'No demo data': 'ไม่มีข้อมูล demo',
  'Repeat revenue': 'รายได้ซื้อซ้ำ',
  '0 until import': '0 จนกว่าจะนำเข้า',
  'Repeat rate': 'อัตราซื้อซ้ำ',
  Calculated: 'คำนวณอัตโนมัติ',
  'Risk value': 'มูลค่าเสี่ยงหาย',
  Tracked: 'ติดตามแล้ว',
  'Readiness path': 'เส้นทางความพร้อม',
  'Import to action': 'จาก import สู่ action',
  'CSV validation': 'ตรวจ CSV',
  Ready: 'พร้อม',
  'Customer resolution': 'รวมลูกค้า',
  Scoped: 'แยกขอบเขตแล้ว',
  'Automation events': 'Automation events',
  Queued: 'เข้าคิวแล้ว',
  'Automation queue': 'คิว automation',
  'CSV sync': 'CSV sync',
  'Win-back': 'ดึงลูกค้ากลับ',
  Event: 'Event',
  Tenant: 'Tenant',
  Rule: 'Rule',

  'Return to your operating workspace.': 'กลับเข้าสู่ workspace ที่ใช้ดูแลธุรกิจ',
  'Access tenant-scoped imports, repeat revenue views, customer risk queues, and production health checks from the same workspace.':
    'เข้าถึงการนำเข้าข้อมูลที่แยกตาม tenant, มุมมองรายได้ซื้อซ้ำ, คิวลูกค้าเสี่ยงหาย และ production health checks ในที่เดียว',
  'Tenant context is enforced': 'บังคับใช้ tenant context',
  'Health checks run against live services': 'Health checks ตรวจ service จริง',
  'Workspace data stays empty until imported': 'Workspace จะว่างจนกว่าจะนำเข้าข้อมูล',
  'Use your username or email and password, or continue with Google.':
    'ใช้ username หรือ email พร้อมรหัสผ่าน หรือเข้าสู่ระบบด้วย Google',
  'Username or email': 'Username หรือ email',
  Password: 'รหัสผ่าน',
  'Your password': 'รหัสผ่านของคุณ',
  'Signing in...': 'กำลังเข้าสู่ระบบ...',
  'Continue with Google': 'ดำเนินการต่อด้วย Google',
  'Connecting...': 'กำลังเชื่อมต่อ...',
  'New to RepeatTree?': 'ยังไม่มีบัญชี RepeatTree?',
  'Create account': 'สร้างบัญชี',

  'Create a clean revenue workspace.': 'สร้าง workspace รายได้ที่สะอาด',
  'New accounts start without demo revenue. Your dashboard, customer profiles, and automation queues appear after you import real orders.':
    'บัญชีใหม่เริ่มโดยไม่มีรายได้ demo แดชบอร์ด โปรไฟล์ลูกค้า และคิว automation จะปรากฏหลังนำเข้าออเดอร์จริง',
  'No fake customer records': 'ไม่มีข้อมูลลูกค้าปลอม',
  'Tenant-scoped workspace by default': 'workspace แยกตาม tenant ตั้งแต่เริ่ม',
  'Production services checked before use': 'ตรวจ service production ก่อนใช้งาน',
  'Create your RepeatTree account': 'สร้างบัญชี RepeatTree',
  'Sign up with a username and password, or continue with Google.':
    'สมัครด้วย username และรหัสผ่าน หรือดำเนินการต่อด้วย Google',
  Username: 'Username',
  Email: 'Email',
  'Confirm password': 'ยืนยันรหัสผ่าน',
  'At least 6 characters': 'อย่างน้อย 6 ตัวอักษร',
  'Repeat your password': 'พิมพ์รหัสผ่านอีกครั้ง',
  'Creating account...': 'กำลังสร้างบัญชี...',
  'Already have an account?': 'มีบัญชีอยู่แล้ว?',
  'Preview empty workspace': 'ดูตัวอย่าง workspace ว่าง',
  'Passwords do not match.': 'รหัสผ่านไม่ตรงกัน',

  Rules: 'กฎ',
  Workflow: 'Workflow',
  'Classification rules': 'กฎการจัดกลุ่มลูกค้า',
  'Operational rules used by retention scoring, segmentation, and lifecycle automation.':
    'กฎที่ใช้สำหรับ retention scoring, segmentation และ lifecycle automation',
  'VIP spend threshold': 'ยอดใช้จ่ายขั้นต่ำสำหรับ VIP',
  'Automation-ready webhook architecture': 'Webhook architecture ที่พร้อมสำหรับ automation',
  'Lifecycle triggers are backed by jobs, audit logs, and tenant permissions.':
    'Lifecycle triggers รองรับด้วย jobs, audit logs และ tenant permissions',
  'Automation events support churn alerts, VIP detection, repeat reminders, win-back triggers, and revenue anomaly workflows.':
    'Automation events รองรับ churn alerts, ตรวจ VIP, แจ้งเตือนซื้อซ้ำ, win-back triggers และ revenue anomaly workflows',
  'Workspace status, classification controls, and safe production data operations.':
    'สถานะ workspace, การตั้งค่าการจัดกลุ่มลูกค้า และการจัดการข้อมูล production อย่างปลอดภัย',
  'Loading settings': 'กำลังโหลดการตั้งค่า',
  'Checking workspace data source before showing controls.': 'กำลังตรวจแหล่งข้อมูล workspace ก่อนแสดง control',
  'Workspace status': 'สถานะ workspace',
  'Production workspace': 'Production workspace',
  'Local demo storage': 'พื้นที่เก็บ local demo',
  'No data source connected': 'ยังไม่ได้เชื่อมต่อแหล่งข้อมูล',
  'Data is loaded from the tenant-scoped production store.': 'ข้อมูลโหลดจาก production store ที่แยกตาม tenant',
  'Local demo mode is active. Do not use it for customer truth.':
    'กำลังใช้ local demo mode อย่าใช้เป็นแหล่งข้อมูลจริงของลูกค้า',
  'Connect Supabase before importing production customer data.': 'เชื่อมต่อ Supabase ก่อนนำเข้าข้อมูลลูกค้าระดับ production',
  'Recommended next action': 'Action ถัดไปที่แนะนำ',
  'known profiles': 'โปรไฟล์ที่รู้จัก',
  threshold: 'เกณฑ์',
  'Win-back queue': 'คิวดึงลูกค้ากลับ',
  'At Risk or Lost': 'เสี่ยงหายหรือหายไปแล้ว',
  'Identity coverage': 'ความครบถ้วนของตัวตน',
  'profiles with email, phone, or LINE ID': 'โปรไฟล์ที่มีอีเมล เบอร์โทร หรือ LINE ID',
  'Active channels': 'ช่องทางที่มีข้อมูล',
  'No channel data': 'ยังไม่มีข้อมูลช่องทาง',
  'Last import': 'การนำเข้าล่าสุด',
  'Import orders to start': 'นำเข้าออเดอร์เพื่อเริ่ม',
  'OK': 'ปกติ',
  'Needs work': 'ต้องปรับ',
  'Import first orders': 'นำเข้าออเดอร์แรก',
  'Settings are most useful after the first real order import.':
    'Settings จะมีประโยชน์ที่สุดหลังนำเข้าออเดอร์จริงครั้งแรก',
  'Improve customer identity': 'ปรับตัวตนลูกค้าให้ครบขึ้น',
  'Many profiles are missing email, phone, or LINE ID, so future merges may be weaker.':
    'หลายโปรไฟล์ขาดอีเมล เบอร์โทร หรือ LINE ID ทำให้การ merge รอบถัดไปอาจอ่อนลง',
  'At Risk and Lost customers are already visible from this workspace.':
    'ลูกค้าเสี่ยงหายและหายไปแล้วพร้อมให้ตรวจจาก workspace นี้',
  'More order history is needed before repeat and VIP work becomes useful.':
    'ต้องมีประวัติออเดอร์เพิ่มก่อนที่งาน repeat และ VIP จะมีประโยชน์จริง',
  'Open retention analytics': 'เปิด retention analytics',
  'This workspace has enough data for cohort, RFM, and opportunity review.':
    'Workspace นี้มีข้อมูลพอสำหรับตรวจ cohort, RFM และ opportunity',
  'Upload or sync the next CSV.': 'อัปโหลดหรือ sync CSV ชุดถัดไป',
  'Review win-back queue': 'ตรวจคิวดึงลูกค้ากลับ',
  'Open stale customers sorted by last order.': 'เปิดลูกค้าที่ห่างไปแล้วโดยเรียงจากออเดอร์ล่าสุด',
  'Check VAT and income': 'ตรวจ VAT และรายได้',
  'Review tax estimate and CSV sync settings.': 'ตรวจค่าประมาณภาษีและการตั้งค่า CSV sync',
  'Apply threshold': 'ใช้เกณฑ์นี้',
  'Enter a VIP spend threshold of 0 or more.': 'ใส่ยอดขั้นต่ำ VIP ตั้งแต่ 0 ขึ้นไป',
  'VIP threshold applied to this session.': 'ใช้เกณฑ์ VIP กับ session นี้แล้ว',
  'VIP threshold was not updated.': 'ยังไม่ได้อัปเดตเกณฑ์ VIP',
  'Current VIP': 'VIP ปัจจุบัน',
  'Preview VIP': 'Preview VIP',
  'Current threshold': 'เกณฑ์ปัจจุบัน',
  Invalid: 'ไม่ถูกต้อง',
  'using active status': 'ตามสถานะที่ใช้อยู่',
  'if this threshold is applied': 'ถ้าใช้เกณฑ์นี้',
  'used for new imports': 'ใช้กับการนำเข้ารอบใหม่',
  '1 order': '1 ออเดอร์',
  '2+ orders': '2 ออเดอร์ขึ้นไป',
  '3+ orders and spend threshold': '3 ออเดอร์ขึ้นไปและยอดถึงเกณฑ์',
  'No purchase in 30 days': 'ไม่ซื้อใน 30 วัน',
  'No purchase in 90 days': 'ไม่ซื้อใน 90 วัน',
  'Safe workspace operations': 'การจัดการ workspace แบบปลอดภัย',
  'Use these controls only when you mean to change workspace data.':
    'ใช้ control เหล่านี้เฉพาะเมื่อคุณตั้งใจเปลี่ยนข้อมูล workspace',
  'Open admin diagnostics': 'เปิด admin diagnostics',
  'Check tenant, billing, ingestion failures, and audit activity.':
    'ตรวจ tenant, billing, ingestion failure และ audit activity',
  'Open operating guide': 'เปิดคู่มือการใช้งาน',
  'Follow the shortest setup path for a real merchant workspace.':
    'ทำตามเส้นทาง setup ที่สั้นที่สุดสำหรับ workspace ร้านค้าจริง',
  'Review retention analytics': 'ตรวจ retention analytics',
  'Use cohorts, RFM, products, and opportunities after import.':
    'ใช้ cohort, RFM, สินค้า และ opportunity หลังนำเข้า',
  'Data reset': 'Reset ข้อมูล',
  'Clearing removes imported customers, orders, and import history from this workspace.':
    'การล้างข้อมูลจะลบลูกค้า ออเดอร์ และประวัติ import ที่นำเข้าใน workspace นี้',
  'Data reset confirmation': 'ยืนยันการ reset ข้อมูล',
  'Workspace data was not cleared. Check the confirmation text and try again.':
    'ยังไม่ได้ล้างข้อมูล workspace ตรวจข้อความยืนยันแล้วลองอีกครั้ง',
  'Clear workspace data': 'ล้างข้อมูล workspace',
  'No workspace data to clear': 'ไม่มีข้อมูล workspace ให้ล้าง',
  'Clearing...': 'กำลังล้าง...',
  'Sign out': 'ออกจากระบบ',
  'Open navigation': 'เปิดเมนู',
  'RepeatTree home': 'หน้าแรก RepeatTree',
  'Language switcher': 'ตัวสลับภาษา',
  Close: 'ปิด',
  'VIP review': 'ตรวจ VIP',
  'New: 1 order. Repeat: 2+ orders. VIP: 3+ orders and spend above threshold. At Risk: no purchase in 30 days. Lost: no purchase in 90 days.':
    'New: 1 ออเดอร์. Repeat: 2 ออเดอร์ขึ้นไป. VIP: 3 ออเดอร์ขึ้นไปและยอดใช้จ่ายเกินเกณฑ์. At Risk: ไม่ซื้อใน 30 วัน. Lost: ไม่ซื้อใน 90 วัน.',

  Shopee: 'Shopee',
  'TikTok Shop': 'TikTok Shop',
  Lazada: 'Lazada',
  Instagram: 'Instagram',
  Facebook: 'Facebook',
  Website: 'เว็บไซต์',
  'Custom CSV': 'CSV กำหนดเอง',
  New: 'ลูกค้าใหม่',
  Repeat: 'ซื้อซ้ำ',
  AtRisk: 'เสี่ยงหาย',
  'At Risk': 'เสี่ยงหาย',
  Lost: 'หายไปแล้ว',
  Champion: 'แชมป์เปี้ยน',
  Loyal: 'ลูกค้าประจำ',
  Potential: 'มีศักยภาพ',
  'One-time': 'ซื้อครั้งเดียว',
  Enabled: 'เปิดใช้งาน',
  Paused: 'หยุดชั่วคราว',
  success: 'สำเร็จ',
  failed: 'ล้มเหลว',
  skipped: 'ข้าม',
  Done: 'เสร็จแล้ว',
  Importable: 'นำเข้าได้',
  Blocked: 'ถูกบล็อก',
  None: 'ไม่มี',
  Month: 'เดือน',
  Latest: 'ล่าสุด',
  Sun: 'อา.',
  Mon: 'จ.',
  Tue: 'อ.',
  Wed: 'พ.',
  Thu: 'พฤ.',
  Fri: 'ศ.',
  Sat: 'ส.',
  Overview: 'ภาพรวม',
  VAT: 'VAT',
  Channels: 'ช่องทาง',
  Sync: 'Sync',
  Retention: 'Retention',
  Cohorts: 'Cohort',
  Products: 'สินค้า',
  Opportunities: 'โอกาส',
  Order: 'ออเดอร์',
  Customer: 'ลูกค้า',
  Phone: 'เบอร์โทร',
  Date: 'วันที่',
  Amount: 'ยอดเงิน',
  Tax: 'ภาษี',
  Fees: 'ค่าธรรมเนียม',
  Refund: 'คืนเงิน',
  Channel: 'ช่องทาง',
  Status: 'สถานะ',
  Orders: 'ออเดอร์',
  'Total spent': 'ยอดใช้จ่ายรวม',
  'First channel': 'ช่องทางแรก',
  'Last channel': 'ช่องทางล่าสุด',
  'Repeat channel': 'ช่องทางซื้อซ้ำ',
  'Repeat path': 'เส้นทางซื้อซ้ำ',
  'Last order': 'ออเดอร์ล่าสุด',
  'Total orders': 'จำนวนออเดอร์รวม',
  Name: 'ชื่อ',
  Segment: 'กลุ่ม',
  Sort: 'เรียงตาม',
  RFM: 'RFM',
  Apply: 'ใช้ตัวกรอง',
  Clear: 'ล้าง',
  'Export filtered': 'Export รายการที่กรอง',
  'All segments': 'ทุกกลุ่ม',
  'Repeat buyers': 'ลูกค้าซื้อซ้ำ',
  'All statuses': 'ทุกสถานะ',
  'All channels': 'ทุกช่องทาง',
  'All RFM': 'ทุก RFM',
  'Search name, email, or phone': 'ค้นหาชื่อ อีเมล หรือเบอร์โทร',
  'Product bought': 'สินค้าที่ซื้อ',
  Product: 'สินค้า',
  Search: 'ค้นหา',
  First: 'ช่องทางแรก',
  Last: 'ช่องทางล่าสุด',
  'Sort:': 'เรียงตาม:',

  'Best repeat channel': 'ช่องทางซื้อซ้ำที่ดีที่สุด',
  'No repeats yet': 'ยังไม่มีการซื้อซ้ำ',
  'Import orders to see channel winners.': 'นำเข้าออเดอร์เพื่อดูช่องทางที่ชนะ',
  'Top channel path': 'เส้นทางช่องทางที่ดีที่สุด',
  'No path yet': 'ยังไม่มีเส้นทาง',
  'Repeat customers reveal source-to-repeat movement.': 'ลูกค้าซื้อซ้ำจะแสดงการย้ายจากช่องทางแรกไปช่องทางซื้อซ้ำ',
  'Remarketing urgency': 'ความเร่งด่วน remarketing',
  'Revenue sitting in At Risk or Lost customer profiles': 'รายได้ที่ค้างอยู่ในกลุ่มลูกค้าเสี่ยงหายหรือหายไปแล้ว',
  'Review repeat buyers': 'ตรวจลูกค้าซื้อซ้ำ',
  'Open the buyers driving repeated orders.': 'เปิดรายชื่อลูกค้าที่สร้างออเดอร์ซ้ำ',
  'Win back stale buyers': 'ดึงลูกค้าเก่ากลับมา',
  'Focus At Risk and Lost profiles first.': 'เริ่มจากลูกค้าเสี่ยงหายและหายไปแล้วก่อน',
  'Import latest orders': 'นำเข้าออเดอร์ล่าสุด',
  'Refresh the dashboard with a new CSV.': 'รีเฟรชแดชบอร์ดด้วย CSV ใหม่',
  'Refresh the dashboard with a marketplace order file.': 'รีเฟรชแดชบอร์ดด้วยไฟล์ออเดอร์ marketplace',
  'Open deep analytics': 'เปิด analytics เชิงลึก',
  'Cohorts, RFM, product repeat, and opportunities.': 'Cohort, RFM, สินค้าซื้อซ้ำ และโอกาส',
  'Total income': 'รายได้รวม',
  'Known buyers': 'ลูกค้าที่รู้จัก',
  'Bought again': 'ซื้อซ้ำแล้ว',
  'VIP buyers': 'ลูกค้า VIP',
  'Need win-back': 'ต้องดึงกลับ',
  'Repeat Revenue by Channel': 'รายได้ซื้อซ้ำตามช่องทาง',
  'Monthly Repeat Trend': 'แนวโน้มซื้อซ้ำรายเดือน',
  'Customers by Status': 'ลูกค้าตามสถานะ',
  'First Purchase vs Repeat Purchase Channel': 'ช่องทางซื้อครั้งแรกเทียบกับช่องทางซื้อซ้ำ',
  'Top Repeat Customers': 'ลูกค้าซื้อซ้ำอันดับต้น',
  'At Risk Customers': 'ลูกค้าเสี่ยงหาย',
  'Recent Repeat Orders': 'ออเดอร์ซื้อซ้ำล่าสุด',
  'Fresh repeat activity worth noticing.': 'กิจกรรมซื้อซ้ำล่าสุดที่ควรติดตาม',
  'No repeat orders yet. Import more orders to spot fresh repeat activity.':
    'ยังไม่มีออเดอร์ซื้อซ้ำ นำเข้าออเดอร์เพิ่มเพื่อเห็นกิจกรรมซื้อซ้ำล่าสุด',
  'Recent Orders': 'ออเดอร์ล่าสุด',
  'Latest imported orders visible on the dashboard.': 'ออเดอร์ที่นำเข้าล่าสุดซึ่งแสดงบนแดชบอร์ด',
  'Repeat buyer': 'ลูกค้าซื้อซ้ำ',
  'New buyer': 'ลูกค้าใหม่',
  'No orders yet. Import an order file to show recent order activity here.':
    'ยังไม่มีออเดอร์ นำเข้าไฟล์ออเดอร์เพื่อแสดงกิจกรรมล่าสุดตรงนี้',
  'Loading workspace': 'กำลังโหลด workspace',
  'Checking your store data before showing repeat intelligence.': 'กำลังตรวจข้อมูลร้านก่อนแสดงข้อมูลซื้อซ้ำ',
  'Start with your first order import': 'เริ่มด้วยการนำเข้าออเดอร์แรก',
  'This workspace is clean. Upload a CSV to grow customer profiles, repeat revenue, channel paths, and follow-up timing from your own store data.':
    'Workspace นี้ยังว่าง อัปโหลด CSV เพื่อสร้างโปรไฟล์ลูกค้า รายได้ซื้อซ้ำ เส้นทางช่องทาง และจังหวะ follow-up จากข้อมูลร้านจริง',
  'Follow tutorial': 'ทำตามคู่มือ',
  'Import CSV': 'นำเข้า CSV',
  'Bring in orders from Shopee, TikTok Shop, social, website, or custom exports.':
    'นำเข้าออเดอร์จาก Shopee, TikTok Shop, social, website หรือ export กำหนดเอง',
  'Resolve buyers': 'รวมตัวตนผู้ซื้อ',
  'Phone, email, LINE ID, and names create unified customer profiles.':
    'เบอร์โทร อีเมล LINE ID และชื่อจะสร้างโปรไฟล์ลูกค้ารวม',
  'Track repeat timing': 'ติดตามจังหวะซื้อซ้ำ',
  'Calendar and win-back views appear after the first import.': 'ปฏิทินและมุมมอง win-back จะปรากฏหลัง import แรก',
  'Current workspace': 'Workspace ปัจจุบัน',
  'No customer, order, revenue, or import records yet.': 'ยังไม่มีข้อมูลลูกค้า ออเดอร์ รายได้ หรือประวัตินำเข้า',
  'Deep analytics snapshot': 'ภาพรวม analytics เชิงลึก',
  'Cohorts, RFM, product repeat paths, and opportunity lists are ready for deeper decisions.':
    'Cohort, RFM, เส้นทางสินค้าซื้อซ้ำ และรายการโอกาสพร้อมสำหรับการตัดสินใจเชิงลึก',
  'Top RFM segment': 'กลุ่ม RFM สูงสุด',
  'No segment': 'ยังไม่มีกลุ่ม',
  'Top repeat product': 'สินค้าซื้อซ้ำสูงสุด',
  'No product data': 'ยังไม่มีข้อมูลสินค้า',
  'Avg days to repeat': 'วันเฉลี่ยก่อนซื้อซ้ำ',
  'Nothing to show yet.': 'ยังไม่มีข้อมูลให้แสดง',

  'Loading customers': 'กำลังโหลดลูกค้า',
  'Checking your workspace before showing customer profiles.': 'กำลังตรวจ workspace ก่อนแสดงโปรไฟล์ลูกค้า',
  'Unified customer profiles': 'โปรไฟล์ลูกค้ารวม',
  'Customer explorer': 'ตัวสำรวจลูกค้า',
  'Search, filter, and export the exact buyer group behind each dashboard insight.':
    'ค้นหา กรอง และ export กลุ่มผู้ซื้อที่อยู่เบื้องหลัง insight ในแดชบอร์ด',
  'No customers match these filters. Clear filters or import more orders.':
    'ไม่มีลูกค้าที่ตรงกับตัวกรองนี้ ล้างตัวกรองหรือนำเข้าออเดอร์เพิ่ม',
  'Loading customer profile': 'กำลังโหลดโปรไฟล์ลูกค้า',
  'Checking the latest store data.': 'กำลังตรวจข้อมูลร้านล่าสุด',
  'No customer found.': 'ไม่พบลูกค้า',
  'Merged ecommerce buyer': 'ผู้ซื้อ ecommerce ที่รวมข้อมูลแล้ว',
  Province: 'จังหวัด',
  'Merged identity': 'ตัวตนที่รวมแล้ว',
  'Channel journey': 'เส้นทางช่องทาง',
  'First purchase': 'การซื้อครั้งแรก',
  'Latest repeat': 'การซื้อซ้ำล่าสุด',
  'Order timeline': 'ไทม์ไลน์ออเดอร์',
  'Every known purchase tied to this profile.': 'ทุกการซื้อที่ผูกกับโปรไฟล์นี้',
  'No customers yet': 'ยังไม่มีลูกค้า',
  'Your account starts clean. Import orders to create merged customer profiles, repeat segments, VIP buyers, and win-back lists.':
    'บัญชีเริ่มต้นแบบว่าง นำเข้าออเดอร์เพื่อสร้างโปรไฟล์ลูกค้ารวม กลุ่มซื้อซ้ำ ลูกค้า VIP และรายการ win-back',

  'Loading calendar': 'กำลังโหลดปฏิทิน',
  'Checking your order history and follow-up timing.': 'กำลังตรวจประวัติออเดอร์และจังหวะ follow-up',
  'Orders this month': 'ออเดอร์เดือนนี้',
  'Follow-up focus': 'จุดที่ต้อง follow-up',
  'Daily repeat orders, revenue, channels, and win-back timing.': 'ออเดอร์ซื้อซ้ำ รายได้ ช่องทาง และจังหวะ win-back รายวัน',
  'Previous month': 'เดือนก่อนหน้า',
  'Next month': 'เดือนถัดไป',
  'calendar day': 'วันในปฏิทิน',
  'No orders': 'ไม่มีออเดอร์',
  repeat: 'ซื้อซ้ำ',
  'follow-up': 'follow-up',
  more: 'เพิ่มเติม',
  'No calendar activity yet': 'ยังไม่มีกิจกรรมในปฏิทิน',
  'Import your first order CSV to fill this calendar with repeat buyers, revenue days, channel activity, and follow-up reminders.':
    'นำเข้า CSV ออเดอร์แรกเพื่อเติมปฏิทินด้วยลูกค้าซื้อซ้ำ วันที่มีรายได้ กิจกรรมช่องทาง และการเตือน follow-up',
  'repeat orders': 'ออเดอร์ซื้อซ้ำ',
  'repeat revenue': 'รายได้ซื้อซ้ำ',
  'Channel breakdown': 'รายละเอียดตามช่องทาง',
  total: 'รวม',
  'No channel activity for this day.': 'วันนี้ยังไม่มีกิจกรรมตามช่องทาง',
  'No repeat buyers on this date.': 'วันนี้ยังไม่มีลูกค้าซื้อซ้ำ',
  'No orders on this date.': 'วันนี้ยังไม่มีออเดอร์',
  'at-risk or lost customers are due for attention.': 'ลูกค้าเสี่ยงหายหรือหายไปแล้วถึงเวลาต้องดูแล',
  'Last bought': 'ซื้อล่าสุด',
  'lifetime value': 'มูลค่าตลอดอายุลูกค้า',
  'No follow-up reminders due.': 'ยังไม่มีรายการ follow-up ที่ถึงเวลา',

  'Upload order CSV': 'อัปโหลด CSV ออเดอร์',
  'Upload marketplace order file': 'อัปโหลดไฟล์ออเดอร์ marketplace',
  'Upload order files from Shopee, TikTok, Lazada, or CSV. RepeatTree cleans the file before building repeat-customer intelligence.':
    'อัปโหลดไฟล์ออเดอร์จาก Shopee, TikTok, Lazada หรือ CSV แล้ว RepeatTree จะ clean ไฟล์ก่อนสร้างข้อมูลลูกค้าซื้อซ้ำ',
  'Drop one real shop export to build profiles, repeat paths, income, and calendar timing.':
    'วางไฟล์ export ร้านจริงหนึ่งไฟล์เพื่อสร้างโปรไฟล์ เส้นทางซื้อซ้ำ รายได้ และจังหวะปฏิทิน',
  'Choose CSV': 'เลือก CSV',
  'Choose CSV or XLSX': 'เลือก CSV หรือ XLSX',
  'Import source': 'แหล่งนำเข้า',
  'Try sample CSVs': 'ลอง CSV ตัวอย่าง',
  'Try platform templates': 'ลอง template ตามแพลตฟอร์ม',
  'Use these merchant-style files only for local validation before connecting native commerce integrations.':
    'ใช้ไฟล์สไตล์ร้านค้าเหล่านี้เพื่อ validate ในเครื่องก่อนต่อ native commerce integrations',
  'Start with a marketplace preset, then upload the real export without editing columns first.':
    'เริ่มจาก preset ของ marketplace แล้วอัปโหลด export จริงโดยไม่ต้องแก้ column ก่อน',
  'Fallback import': 'Fallback import',
  'Try sample': 'ลองตัวอย่าง',
  Download: 'ดาวน์โหลด',
  'Column mapping': 'จับคู่คอลัมน์',
  'Map your CSV columns before confirming import. Required: order ID, customer name, order date, and total amount.':
    'จับคู่คอลัมน์ CSV ก่อนยืนยัน import ช่องบังคับคือ order ID, ชื่อลูกค้า, วันที่ออเดอร์ และยอดรวม',
  'RepeatTree auto-maps known marketplace columns. Review only the fields that look wrong.':
    'RepeatTree map column marketplace ที่รู้จักให้อัตโนมัติ ตรวจเฉพาะ field ที่ดูผิด',
  'Source channel': 'ช่องทางต้นทาง',
  'Not mapped': 'ยังไม่จับคู่',
  'Identity matching reminder': 'เตือนเรื่องการจับคู่ตัวตน',
  'Phone or email repeats across channels merge into one profile. If both are missing, fuzzy name matching is used as a weaker fallback.':
    'เบอร์โทรหรืออีเมลที่ซ้ำข้ามช่องทางจะรวมเป็นโปรไฟล์เดียว ถ้าไม่มีทั้งคู่ ระบบจะใช้การจับคู่ชื่อแบบ fuzzy ที่ความมั่นใจต่ำกว่า',
  'Import preview': 'ตัวอย่างก่อนนำเข้า',
  'Showing the first valid rows that will be imported.': 'แสดงแถวที่ valid ชุดแรกที่จะถูกนำเข้า',
  'Confirm import': 'ยืนยันนำเข้า',
  'No valid rows to preview yet. Fix required mappings or row errors.':
    'ยังไม่มีแถว valid ให้ preview แก้ mapping ที่จำเป็นหรือ error ในแถวก่อน',
  'Real data readiness': 'ความพร้อมของข้อมูลจริง',
  'Import status': 'สถานะ import',
  'Supported uploads: CSV and XLSX. PDF is accepted only as a preview warning because report PDFs are not raw order data.':
    'รองรับ CSV และ XLSX ส่วน PDF รับไว้เพื่อแจ้งเตือนเท่านั้น เพราะ PDF report ไม่ใช่ raw order data',
  'Waiting for order file': 'รอไฟล์ออเดอร์',
  'PDF preview only. Upload CSV or XLSX order data for repeat-customer analysis.':
    'PDF เป็น preview เท่านั้น อัปโหลด CSV หรือ XLSX order data เพื่อวิเคราะห์ลูกค้าซื้อซ้ำ',
  'Import blocked. Upload CSV or XLSX order data.': 'Import ถูกบล็อก อัปโหลด CSV หรือ XLSX order data',
  'Unsupported file type. Upload CSV, XLSX, or PDF preview files.':
    'ชนิดไฟล์ไม่รองรับ อัปโหลด CSV, XLSX หรือ PDF สำหรับ preview',
  'Could not read this order file.': 'อ่านไฟล์ออเดอร์นี้ไม่ได้',
  'Good CSV headers:': 'หัวคอลัมน์ CSV ที่ดี:',
  'Import history': 'ประวัติ import',
  'Loading import history.': 'กำลังโหลดประวัติ import',
  'No imports yet. Connect a native integration or upload a fallback CSV.':
    'ยังไม่มี import ต่อ native integration หรืออัปโหลด fallback CSV',
  'Pre-import diagnostics': 'ตรวจสอบก่อน import',
  'Nothing is saved yet. Review row quality and likely merges before confirming import.':
    'ยังไม่มีข้อมูลถูกบันทึก ตรวจคุณภาพแถวและการ merge ที่น่าจะเกิดขึ้นก่อนยืนยัน import',
  'Total rows': 'แถวทั้งหมด',
  'Valid rows': 'แถว valid',
  'Skipped rows': 'แถวที่ข้าม',
  Warnings: 'คำเตือน',
  Errors: 'Error',
  'Missing mappings': 'mapping ที่ขาด',
  'Bad dates': 'วันที่ผิด',
  'Bad amounts': 'ยอดเงินผิด',
  'No phone/email': 'ไม่มีเบอร์/อีเมล',
  'Likely merges': 'การ merge ที่น่าจะเกิด',
  'Phone exact': 'เบอร์โทรตรงกัน',
  'Email exact': 'อีเมลตรงกัน',
  'LINE ID exact': 'LINE ID ตรงกัน',
  'Fuzzy name': 'ชื่อใกล้เคียง',
  'First row issues': 'ปัญหาในแถวแรก ๆ',
  'No row issues found in the current mapping.': 'ไม่พบปัญหาแถวใน mapping ปัจจุบัน',

  'Loading income workspace': 'กำลังโหลด income workspace',
  'Preparing revenue, VAT, and CSV sync settings.': 'กำลังเตรียมรายได้ VAT และการตั้งค่า CSV sync',
  'Gross income': 'รายได้รวม',
  'Net snapshot': 'ภาพรวมสุทธิ',
  'estimate': 'โดยประมาณ',
  'Platform fees': 'ค่าธรรมเนียมแพลตฟอร์ม',
  Refunds: 'ยอดคืนเงิน',
  'Income appears after the first import': 'รายได้จะแสดงหลัง import แรก',
  'Import or schedule a CSV sync to unlock gross income, net snapshot, Thailand VAT estimates, channel income, and monthly exports.':
    'นำเข้าหรือตั้ง CSV sync เพื่อเปิดรายได้รวม ภาพรวมสุทธิ VAT ไทย รายได้ตามช่องทาง และ export รายเดือน',
  'Add CSV sync': 'เพิ่ม CSV sync',
  'Monthly income': 'รายได้รายเดือน',
  'Gross income and net snapshot after estimated': 'รายได้รวมและภาพรวมสุทธิหลังประเมิน',
  'fees, and refunds.': 'ค่าธรรมเนียม และยอดคืนเงิน',
  Gross: 'รายได้รวม',
  'Income mix': 'ส่วนประกอบรายได้',
  'Snapshot for decision-making, not tax filing automation.': 'ภาพรวมเพื่อการตัดสินใจ ไม่ใช่ระบบยื่นภาษีอัตโนมัติ',
  'Shipping collected': 'ค่าส่งที่เก็บ',
  Discounts: 'ส่วนลด',
  'Thailand VAT settings': 'ตั้งค่า VAT ไทย',
  'Default estimate is VAT-inclusive 7% for Thailand-style merchant exports.':
    'ค่าเริ่มต้นคือ VAT รวมในราคา 7% สำหรับ export ร้านค้าแบบไทย',
  'Tax country': 'ประเทศภาษี',
  'Tax label': 'ชื่อภาษี',
  'Tax rate percent': 'อัตราภาษี (%)',
  'Tax included': 'รวมภาษีแล้ว',
  'Tax included in order total': 'ภาษีรวมอยู่ในยอดออเดอร์',
  'Tax added on top': 'ภาษีบวกเพิ่มจากยอดออเดอร์',
  'Saving...': 'กำลังบันทึก...',
  'Save VAT settings': 'บันทึก VAT',
  'Saved VAT settings.': 'บันทึก VAT แล้ว',
  'Could not save VAT settings.': 'บันทึก VAT ไม่สำเร็จ',
  'Monthly VAT summary': 'สรุป VAT รายเดือน',
  'Explicit tax columns override estimates; missing tax columns use the configured estimate.':
    'คอลัมน์ภาษีที่ระบุจริงจะมาก่อนค่าประมาณ ถ้าขาดคอลัมน์ภาษีจะใช้ค่าประมาณที่ตั้งไว้',
  'Export VAT CSV': 'Export VAT CSV',
  Explicit: 'ระบุจริง',
  Estimated: 'ประมาณการ',
  'Net before': 'สุทธิก่อน',
  'Channel income': 'รายได้ตามช่องทาง',
  'Gross and net snapshot by first imported order source.': 'รายได้รวมและสุทธิตามช่องทางต้นทางของออเดอร์แรก',
  Net: 'สุทธิ',
  'CSV scheduled sync': 'CSV sync ตามกำหนด',
  'Connect an HTTPS CSV export URL. Vercel Cron calls `/api/sync/csv` hourly.':
    'ต่อ URL export CSV แบบ HTTPS โดย Vercel Cron จะเรียก `/api/sync/csv` ทุกชั่วโมง',
  'Connection name': 'ชื่อ connection',
  'CSV URL': 'CSV URL',
  'Testing...': 'กำลังทดสอบ...',
  'Test and save sync': 'ทดสอบและบันทึก sync',
  Connections: 'Connections',
  'Enabled connections run on cron and can be synced manually.': 'Connection ที่เปิดใช้งานจะรันตาม cron และสั่ง sync เองได้',
  'Sync now': 'Sync ตอนนี้',
  Pause: 'หยุดชั่วคราว',
  Enable: 'เปิดใช้งาน',
  Delete: 'ลบ',
  'No CSV sync connections yet.': 'ยังไม่มี CSV sync connection',
  'Recent sync runs': 'การ sync ล่าสุด',
  'No sync runs yet.': 'ยังไม่มีประวัติ sync',
  imported: 'นำเข้าแล้ว',

  'Loading analytics': 'กำลังโหลด analytics',
  'Building retention cohorts, product repeat insights, and customer opportunities.':
    'กำลังสร้าง cohort retention, insight สินค้าซื้อซ้ำ และโอกาสลูกค้า',
  'Repeat revenue share': 'สัดส่วนรายได้ซื้อซ้ำ',
  'Second purchase': 'ซื้อครั้งที่สอง',
  'Days to 2nd order': 'วันถึงออเดอร์ที่ 2',
  'VIP concentration': 'สัดส่วนรายได้ VIP',
  'At-risk value': 'มูลค่ากลุ่มเสี่ยง',
  'Deep analytics starts after import': 'Analytics เชิงลึกเริ่มหลัง import',
  'Import order CSVs to unlock cohorts, RFM segments, product repeat paths, channel quality, and opportunity lists from your real customers.':
    'นำเข้า CSV ออเดอร์เพื่อเปิด cohort, กลุ่ม RFM, เส้นทางสินค้าซื้อซ้ำ, คุณภาพช่องทาง และรายการโอกาสจากลูกค้าจริง',
  'RFM customer segments': 'กลุ่มลูกค้า RFM',
  'Recency, frequency, and monetary value compressed into actionable customer groups.':
    'รวม recency, frequency และ monetary value ให้เป็นกลุ่มลูกค้าที่ลงมือทำได้',
  'customer value': 'มูลค่าลูกค้า',
  'Highest RFM scores': 'คะแนน RFM สูงสุด',
  'Best customers to protect, reward, or learn from.': 'ลูกค้าที่ควรดูแล ให้รางวัล หรือเรียนรู้จากพฤติกรรม',
  'Channel quality': 'คุณภาพช่องทาง',
  'Which first-purchase channels create repeat buyers and repeat revenue.':
    'ดูว่าช่องทางซื้อครั้งแรกใดสร้างลูกค้าซื้อซ้ำและรายได้ซื้อซ้ำ',
  'Cohort retention': 'Cohort retention',
  'First-order month cohorts with active customer retention from M0 to M5.':
    'Cohort ตามเดือนออเดอร์แรก พร้อม retention ลูกค้า active จาก M0 ถึง M5',
  Cohort: 'Cohort',
  Size: 'ขนาด',
  buyers: 'ลูกค้า',
  'No product repeat data yet': 'ยังไม่มีข้อมูลสินค้าซื้อซ้ำ',
  'Import CSV rows with product_name, quantity, and unit_price to unlock product journeys.':
    'นำเข้าแถว CSV ที่มี product_name, quantity และ unit_price เพื่อเปิดเส้นทางสินค้า',
  'Import product rows': 'นำเข้าแถวสินค้า',
  'Product repeat intelligence': 'ข้อมูลสินค้าซื้อซ้ำ',
  'Products that pull customers back, plus the next products they commonly buy.':
    'สินค้าที่ดึงลูกค้ากลับมา และสินค้าถัดไปที่มักซื้อร่วมกัน',
  'Repeat product': 'สินค้าซื้อซ้ำ',
  Revenue: 'รายได้',
  'Common next products': 'สินค้าถัดไปที่พบบ่อย',
  'No next-product pattern yet': 'ยังไม่มี pattern สินค้าถัดไป',
  'No opportunities yet': 'ยังไม่มีโอกาส',
  'Import more orders to surface win-back, second purchase, VIP protection, and cross-sell opportunities.':
    'นำเข้าออเดอร์เพิ่มเพื่อหาโอกาส win-back, ซื้อครั้งที่สอง, ปกป้อง VIP และ cross-sell',
  'Import more orders': 'นำเข้าออเดอร์เพิ่ม',
  high: 'สูง',
  medium: 'กลาง',
  low: 'ต่ำ',
  'win back': 'ดึงกลับ',
  'vip protect': 'ปกป้อง VIP',
  'cross sell': 'ขายต่อเนื่อง',
  'second purchase': 'ซื้อครั้งที่สอง',
  'Target product:': 'สินค้าเป้าหมาย:',
  'days ago': 'วันที่แล้ว',
  'Win back stale buyer': 'ดึงลูกค้าเก่ากลับ',
  'Nudge second purchase': 'กระตุ้นซื้อครั้งที่สอง',
  'Protect VIP revenue': 'ปกป้องรายได้ VIP',
  'Cross-sell likely product': 'เสนอสินค้าที่น่าซื้อถัดไป',

  'Migration command center': 'ศูนย์ควบคุมการย้ายข้อมูล',
  activated: 'เปิดใช้แล้ว',
  'Turn imported orders into repeat revenue': 'เปลี่ยนออเดอร์นำเข้าเป็นรายได้ซื้อซ้ำ',
  'Guide new accounts from their first marketplace export to buyer identity, repeat revenue, win-back focus, and recurring automation.':
    'พาบัญชีใหม่จาก export marketplace แรก ไปสู่ตัวตนผู้ซื้อ รายได้ซื้อซ้ำ จุดโฟกัส win-back และ automation ต่อเนื่อง',
  'Activation progress': 'ความคืบหน้า activation',
  'Next best action': 'Action ถัดไปที่ดีที่สุด',
  'Win-back value': 'มูลค่า win-back',
  'with contact identity': 'มีตัวตนติดต่อได้',
  'repeat buyers,': 'ลูกค้าซื้อซ้ำ,',
  'repeat rate': 'อัตราซื้อซ้ำ',
  'at-risk or lost buyers': 'ลูกค้าเสี่ยงหายหรือหายไปแล้ว',
  'Switching kit': 'ชุดย้ายข้อมูล',
  'Shopee, TikTok Shop, Instagram, Facebook, website, and custom CSV exports all start from the same import path.':
    'Shopee, TikTok Shop, Instagram, Facebook, เว็บไซต์ และ custom CSV เริ่มจากเส้นทาง import เดียวกัน',
  'Open import path': 'เปิดเส้นทาง import',
  'Move customers from scattered selling channels into one retention workspace without waiting for native integrations.':
    'ย้ายลูกค้าจากช่องทางขายที่กระจัดกระจายมาอยู่ใน retention workspace เดียวโดยไม่ต้องรอ native integrations',
  Import: 'นำเข้า',
  'Bring historical orders': 'นำเข้าออเดอร์ย้อนหลัง',
  'Start with one real export from the channel customers already buy from.':
    'เริ่มจาก export จริงหนึ่งไฟล์จากช่องทางที่ลูกค้าซื้ออยู่แล้ว',
  'Resolve buyer identity': 'รวมตัวตนผู้ซื้อ',
  'Find repeat revenue': 'หารายได้ซื้อซ้ำ',
  'Detect which buyers, products, and channels already create second purchases.':
    'ตรวจว่าลูกค้า สินค้า และช่องทางใดสร้างการซื้อครั้งที่สองแล้ว',
  'Build the win-back queue': 'สร้างคิว win-back',
  'Turn stale buyers into a focused follow-up list before they are fully lost.':
    'เปลี่ยนลูกค้าที่เริ่มหายเป็นรายการ follow-up ก่อนจะหายไปจริง',
  'Automate recurring sync': 'ทำ recurring sync อัตโนมัติ',
  'After the first import works, schedule a CSV sync so reporting stays current.':
    'หลัง import แรกใช้งานได้ ให้ตั้ง CSV sync เพื่อให้รายงานอัปเดตเสมอ',
  'Import 20-50 real orders first': 'นำเข้าออเดอร์จริง 20-50 รายการก่อน',
  'A small real export is enough to prove identity matching, repeat detection, and the first retention view.':
    'ไฟล์ export จริงขนาดเล็กพอพิสูจน์การจับคู่ตัวตน การตรวจซื้อซ้ำ และ retention view แรก',
  'Import older history to reveal second purchases': 'นำเข้าประวัติเก่าเพื่อเห็นการซื้อครั้งที่สอง',
  'Recent orders alone often hide repeat behavior. Add prior months so the system can find second-order paths.':
    'ออเดอร์ล่าสุดอย่างเดียวมักซ่อนพฤติกรรมซื้อซ้ำ เพิ่มเดือนก่อนหน้าเพื่อให้ระบบหาเส้นทางออเดอร์ที่สองได้',
  'Expand from reporting into operating cadence': 'ขยายจากรายงานเป็นจังหวะทำงานประจำ',
  'Review repeat buyers weekly, refresh win-back focus, and keep source-channel repeat paths current.':
    'ตรวจลูกค้าซื้อซ้ำทุกสัปดาห์ อัปเดต win-back focus และรักษาเส้นทางช่องทางซื้อซ้ำให้ใหม่เสมอ',
  'Open the win-back queue before adding new features': 'เปิดคิว win-back ก่อนเพิ่ม feature ใหม่',
  'The fastest revenue recovery is usually buyers who already trusted the store and stopped buying.':
    'รายได้ที่กู้คืนเร็วที่สุดมักมาจากลูกค้าที่เคยเชื่อใจร้านแล้วหยุดซื้อ',
  'Schedule recurring CSV sync': 'ตั้ง CSV sync ต่อเนื่อง',
  'Once the first import is clean, connect a CSV URL so operators do not have to rebuild reports manually.':
    'เมื่อ import แรกสะอาดแล้ว ให้ต่อ CSV URL เพื่อให้ทีมไม่ต้องสร้างรายงานใหม่ด้วยมือ',

  'First 15 minutes': '15 นาทีแรก',
  'From empty workspace to action list': 'จาก workspace ว่างสู่รายการ action',
  'RepeatTree becomes useful after real order data is imported. Start with one clean export, confirm the import diagnostics, then move from dashboard metrics into customer queues.':
    'RepeatTree จะมีประโยชน์หลังนำเข้าข้อมูลออเดอร์จริง เริ่มจาก export ที่สะอาดหนึ่งไฟล์ ตรวจ diagnostics แล้วขยับจาก metric ในแดชบอร์ดไปสู่คิวลูกค้า',
  'Start tutorial': 'เริ่มคู่มือ',
  'Step-by-step setup': 'ตั้งค่าทีละขั้น',
  'Run these in order for a new merchant workspace.': 'ทำตามลำดับนี้สำหรับ workspace ร้านค้าใหม่',
  'Operator workflow': 'Workflow สำหรับทีมปฏิบัติการ',
  'Import real orders': 'นำเข้าออเดอร์จริง',
  'Your workspace has customer, order, revenue, and import history.':
    'Workspace มีประวัติลูกค้า ออเดอร์ รายได้ และการนำเข้า',
  'Go to Imports, upload one CSV export, choose the source channel, and keep order ID, customer name, order date, and total amount mapped before confirming.':
    'ไปที่ Imports อัปโหลด CSV หนึ่งไฟล์ เลือกช่องทางต้นทาง และจับคู่ order ID, ชื่อลูกค้า, วันที่ออเดอร์ และยอดรวมก่อนยืนยัน',
  'Open imports': 'เปิด imports',
  'Check identity signals': 'ตรวจสัญญาณตัวตน',
  'Repeat buyers merge instead of becoming duplicates.': 'ลูกค้าซื้อซ้ำจะถูกรวมแทนการเป็นข้อมูลซ้ำ',
  'Prefer phone or email columns when available. LINE ID and customer name help, but phone and email are stronger for cross-channel matching.':
    'ถ้ามีให้ใช้คอลัมน์เบอร์โทรหรืออีเมล LINE ID และชื่อช่วยได้ แต่เบอร์โทรและอีเมลแข็งแรงกว่าสำหรับจับคู่ข้ามช่องทาง',
  'Review mapping': 'ตรวจ mapping',
  'Read the dashboard first': 'อ่านแดชบอร์ดก่อน',
  'You know repeat revenue, repeat rate, VIP count, and win-back risk.':
    'คุณจะรู้รายได้ซื้อซ้ำ อัตราซื้อซ้ำ จำนวน VIP และความเสี่ยง win-back',
  'Open dashboard': 'เปิดแดชบอร์ด',
  'Work the customer queues': 'ทำงานจากคิวลูกค้า',
  'VIP, repeat, and at-risk buyers become owned follow-up lists.':
    'ลูกค้า VIP ซื้อซ้ำ และเสี่ยงหายจะกลายเป็นรายการ follow-up ที่ทีมถือไว้',
  'Use Customers to filter repeat buyers, VIPs, and stale customers. Open a buyer profile when you need the order trail before contacting them.':
    'ใช้ Customers เพื่อกรองลูกค้าซื้อซ้ำ VIP และลูกค้าที่เริ่มหาย เปิดโปรไฟล์ลูกค้าเมื่อต้องดู order trail ก่อนติดต่อ',
  'Open customers': 'เปิดลูกค้า',
  'Use timing, not guessing': 'ใช้จังหวะ ไม่ใช่เดา',
  'Follow-up work happens around the next likely purchase window.':
    'งาน follow-up จะเกิดรอบช่วงเวลาที่ลูกค้าน่าจะซื้อครั้งถัดไป',
  'Use Calendar after imports create enough order history. Prioritize upcoming repeat windows and stale customers before broad campaigns.':
    'ใช้ Calendar หลัง import มีประวัติออเดอร์พอ จัดลำดับช่วงซื้อซ้ำที่กำลังมาและลูกค้าที่เริ่มหายก่อนทำ campaign กว้าง',
  'Open calendar': 'เปิดปฏิทิน',
  'Verify money and settings': 'ตรวจรายได้และการตั้งค่า',
  'Revenue views match how your business reports gross, fees, refunds, and tax.':
    'มุมมองรายได้ตรงกับวิธีที่ธุรกิจรายงานรายได้รวม ค่าธรรมเนียม คืนเงิน และภาษี',
  'Use Income for revenue checks and Settings for workspace controls. Keep billing and usage healthy before adding more channels.':
    'ใช้ Income ตรวจรายได้ และ Settings คุม workspace รักษา billing และ usage ให้ปกติก่อนเพิ่มช่องทาง',
  'Open income': 'เปิดรายได้',
  'CSV file checklist': 'Checklist ไฟล์ CSV',
  'Use this before uploading an export. Missing optional fields are allowed, but weak identity fields reduce matching quality.':
    'ใช้ก่อนอัปโหลด export ช่อง optional ขาดได้ แต่ข้อมูลตัวตนที่อ่อนจะลดคุณภาพการจับคู่',
  'When the dashboard is empty': 'เมื่อแดชบอร์ดว่าง',
  'Empty metrics usually mean no orders are imported yet. Go to Imports, try a sample only for validation, then import real orders for the customer workspace.':
    'Metric ว่างมักแปลว่ายังไม่มีออเดอร์นำเข้า ไปที่ Imports ลอง sample เพื่อ validation เท่านั้น แล้วนำเข้าออเดอร์จริงสำหรับ workspace ลูกค้า',
  'Weekly operating rhythm': 'จังหวะทำงานรายสัปดาห์',
  'Use this after the first import so the workspace drives retention work instead of becoming a passive report.':
    'ใช้หลัง import แรกเพื่อให้ workspace ขับงาน retention แทนการเป็นรายงานเฉย ๆ',
  'Open action queues': 'เปิดคิว action',
  'Understand repeat patterns': 'เข้าใจ pattern ซื้อซ้ำ',
  'Use cohorts, RFM, and product repeat views when dashboard numbers need explanation.':
    'ใช้ cohort, RFM และมุมมองสินค้าซื้อซ้ำเมื่อเลขในแดชบอร์ดต้องการคำอธิบาย',
  'Tune workspace settings': 'ปรับตั้งค่า workspace',
  'Adjust classification and workspace controls after the team agrees on operating thresholds.':
    'ปรับการจัดกลุ่มและ control ของ workspace หลังทีมตกลง threshold การทำงาน',
  'Validate revenue reporting': 'ตรวจรายงานรายได้',
  'Check gross, net, fees, refunds, and tax before sharing numbers with finance.':
    'ตรวจรายได้รวม สุทธิ ค่าธรรมเนียม คืนเงิน และภาษีก่อนส่งเลขให้ finance',

  Organization: 'องค์กร',
  'Tenant and subscription state.': 'สถานะ tenant และ subscription',
  'No organization': 'ไม่มีองค์กร',
  Team: 'ทีม',
  'Manage organization members.': 'จัดการสมาชิกองค์กร',
  Owner: 'เจ้าของ',
  Editor: 'ผู้แก้ไข',
  Analyst: 'นักวิเคราะห์',
  Billing: 'การเงิน',
  Viewer: 'ผู้ดู',
  Save: 'บันทึก',
  Ingestion: 'Ingestion',
  'Recent failed jobs.': 'งานล่าสุดที่ล้มเหลว',
  'No failed ingestion jobs.': 'ไม่มีงาน ingestion ที่ล้มเหลว',

  'RepeatTree product preview': 'ตัวอย่างผลิตภัณฑ์ RepeatTree',
  'in repeat revenue': 'ในรายได้ซื้อซ้ำ',
  'customers repeated through this path': 'ลูกค้าซื้อซ้ำผ่านเส้นทางนี้',
  orders: 'ออเดอร์',
  order: 'ออเดอร์',
  rows: 'แถว',
  Row: 'แถว',
  Showing: 'แสดง',
  of: 'จาก',
  customers: 'ลูกค้า',
  'customers from the active explorer filters.': 'ลูกค้าจากตัวกรองที่ใช้งานอยู่',
  'phone exact match': 'เบอร์โทรตรงกัน',
  'email exact match': 'อีเมลตรงกัน',
  'Orders from': 'ออเดอร์จาก',
  'channels were unified using': 'ช่องทางถูกรวมด้วย',
  'fuzzy name matching': 'การจับคู่ชื่อแบบ fuzzy',
  'Single-channel profile. Future imports will merge into this buyer when': 'โปรไฟล์ช่องทางเดียว การ import ในอนาคตจะรวมเข้ากับลูกค้านี้เมื่อ',
  or: 'หรือ',
  'name similarity': 'ชื่อใกล้เคียง',
  'matches.': 'ตรงกัน',
  'VIP because they placed': 'เป็น VIP เพราะมี',
  'orders and spent': 'ออเดอร์และใช้จ่าย',
  'above the': 'สูงกว่าเกณฑ์',
  'VIP threshold.': 'ของ VIP',
  'At Risk because their last purchase was': 'เสี่ยงหายเพราะซื้อล่าสุดเมื่อ',
  'days ago. Export them for a win-back campaign.': 'วันที่แล้ว Export เพื่อทำ campaign win-back',
  'Lost because their last purchase was': 'หายไปแล้วเพราะซื้อล่าสุดเมื่อ',
  'days ago. Use this profile for reactivation targeting.': 'วันที่แล้ว ใช้โปรไฟล์นี้สำหรับ reactivation targeting',
  'Repeat buyer because they purchased': 'เป็นลูกค้าซื้อซ้ำเพราะซื้อ',
  'times across': 'ครั้งผ่าน',
  'channel(s).': 'ช่องทาง',
  'New buyer with one known order. Watch whether they return through the same or a different channel.':
    'ลูกค้าใหม่ที่มีออเดอร์เดียว ติดตามว่าจะกลับมาซื้อผ่านช่องทางเดิมหรือช่องทางอื่น',
  via: 'ผ่าน',
  'Best test file: 20-50 orders with repeat buyers, phone or email columns, order dates, total amounts, and product names.':
    'ไฟล์ทดสอบที่ดีควรมี 20-50 ออเดอร์ พร้อมลูกค้าซื้อซ้ำ คอลัมน์เบอร์โทรหรืออีเมล วันที่ออเดอร์ ยอดรวม และชื่อสินค้า',
  'Supported source labels: Shopee, TikTok Shop, Instagram, Facebook, Website, and Custom CSV.':
    'รองรับ source labels: Shopee, TikTok Shop, Instagram, Facebook, Website และ Custom CSV',
  'Privacy note: imported order data is saved to your Supabase Postgres database and persists across sessions. New accounts stay empty until you import or intentionally try a sample CSV.':
    'หมายเหตุความเป็นส่วนตัว: ข้อมูลออเดอร์ที่นำเข้าจะถูกบันทึกใน Supabase Postgres ของคุณและอยู่ข้าม session บัญชีใหม่จะว่างจนกว่าจะนำเข้าหรือตั้งใจลอง sample CSV',
  'Waiting for CSV': 'รอ CSV',
  'Parsing CSV': 'กำลังอ่าน CSV',
  'Needs mapping review': 'ต้องตรวจ mapping',
  'Ready to preview': 'พร้อม preview',
  'Import blocked. Fix required mappings or provide at least one valid row.':
    'Import ถูกบล็อก แก้ mapping ที่จำเป็นหรือใส่อย่างน้อยหนึ่งแถวที่ valid',
  'Import failed. The order was not saved. Please try again.':
    'Import ไม่สำเร็จ ออเดอร์ยังไม่ถูกบันทึก กรุณาลองอีกครั้ง',
  Loaded: 'โหลดแล้ว',
  'Review the preview, then confirm import.': 'ตรวจ preview แล้วค่อยยืนยัน import',
  Saving: 'กำลังบันทึก',
  Imported: 'นำเข้าแล้ว',
  'may merge with': 'อาจ merge กับ',
  'phone': 'เบอร์โทร',
  'email': 'อีเมล',
  'lineId': 'LINE ID',
  'fuzzyName': 'ชื่อใกล้เคียง',
  'Shopee sample': 'ตัวอย่าง Shopee',
  'TikTok Shop sample': 'ตัวอย่าง TikTok Shop',
  'Lazada sample': 'ตัวอย่าง Lazada',
  'Custom CSV sample': 'ตัวอย่าง Custom CSV',
  'Marketplace-style exports with repeated phone numbers across later social orders.':
    'Export สไตล์ marketplace ที่มีเบอร์โทรซ้ำในออเดอร์ social ภายหลัง',
  'TikTok buyers who repurchase through TikTok and later website checkout.':
    'ผู้ซื้อ TikTok ที่ซื้อซ้ำผ่าน TikTok และภายหลังผ่าน website checkout',
  'Lazada-style orders with buyer, phone, SKU, fees, and repeat purchase fields.':
    'ออเดอร์สไตล์ Lazada ที่มีผู้ซื้อ เบอร์โทร SKU ค่าธรรมเนียม และข้อมูลซื้อซ้ำ',
  'Generic CSV for Instagram, Facebook, website, or offline order sheets.':
    'CSV ทั่วไปสำหรับ Instagram, Facebook, website หรือ sheet ออเดอร์ offline',
  'Preparing revenue, VAT, and sync tools.': 'กำลังเตรียมรายได้ VAT และเครื่องมือ sync',
  every: 'ทุก',
  minutes: 'นาที',
  'Uses the same default CSV headers as manual import, including optional tax_amount, platform_fee_amount, refund_amount, discount_amount, and shipping_amount.':
    'ใช้ header CSV ค่าเริ่มต้นชุดเดียวกับ manual import รวมถึง optional tax_amount, platform_fee_amount, refund_amount, discount_amount และ shipping_amount',
  Connected: 'เชื่อมต่อแล้ว',
  'importable rows. Cron will sync hourly.': 'แถวที่นำเข้าได้ Cron จะ sync ทุกชั่วโมง',
  'Running sync...': 'กำลัง sync...',
  'new rows imported.': 'แถวใหม่ถูกนำเข้าแล้ว',
  'Could not connect CSV URL.': 'เชื่อมต่อ CSV URL ไม่สำเร็จ',
  'customer with': 'ลูกค้าที่มี',
  'orders and no recent purchase.': 'ออเดอร์และไม่มีการซื้อล่าสุด',
  'Has not bought': 'ยังไม่เคยซื้อ',
  'one of the strongest repeat products.': 'หนึ่งในสินค้าซื้อซ้ำที่แข็งแรงที่สุด',
  'One known order. This buyer is the next repeat conversion target.':
    'มีออเดอร์เดียว ลูกค้ารายนี้คือเป้าหมายถัดไปสำหรับ conversion ซื้อซ้ำ',
  'High-value repeat buyer. Keep the next offer relevant and timely.':
    'ลูกค้าซื้อซ้ำมูลค่าสูง ควรเสนอ offer ถัดไปให้ตรงและทันเวลา',
  'Preparing retention cohorts and customer opportunities.': 'กำลังเตรียม cohort retention และโอกาสลูกค้า',
  'Loading customer explorer': 'กำลังโหลดตัวสำรวจลูกค้า',
  'Preparing filters and unified customer profiles.': 'กำลังเตรียมตัวกรองและโปรไฟล์ลูกค้ารวม',
  'phone or email': 'เบอร์โทรหรืออีเมล',
  'source channel': 'ช่องทางต้นทาง',
}

export function useLanguage() {
  const language = useSyncExternalStore(subscribeLanguage, readLanguageSnapshot, readServerLanguageSnapshot)

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  return {
    language,
    setLanguage,
  }
}

export function useText() {
  const { language } = useLanguage()

  return (text: string) => translateText(text, language)
}

export function translateText(text: string, language: Language) {
  if (language === 'en') return text
  return thaiCopy[text] ?? text
}

function setLanguage(language: Language) {
  writeStoredLanguage(language)

  listeners.forEach((listener) => listener())
}

function subscribeLanguage(listener: () => void) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

function readServerLanguageSnapshot(): Language {
  return defaultLanguage
}

function readLanguageSnapshot(): Language {
  if (typeof window === 'undefined') return defaultLanguage

  const stored = readStoredLanguage()
  if (stored) return stored

  return browserLanguage()
}

function browserLanguage(): Language {
  if (typeof window === 'undefined') return defaultLanguage
  return window.navigator.language.toLowerCase().startsWith('th') ? 'th' : defaultLanguage
}

function normalizeLanguage(value: string | null): Language | null {
  return value === 'en' || value === 'th' ? value : null
}

function readStoredLanguage() {
  if (typeof window === 'undefined') return null

  try {
    const storage = window.localStorage
    if (typeof storage?.getItem !== 'function') return null
    return normalizeLanguage(storage.getItem(languageStorageKey))
  } catch {
    return null
  }
}

function writeStoredLanguage(language: Language) {
  if (typeof window === 'undefined') return

  try {
    const storage = window.localStorage
    if (typeof storage?.setItem === 'function') {
      storage.setItem(languageStorageKey, language)
    }
  } catch {
    return
  }
}
