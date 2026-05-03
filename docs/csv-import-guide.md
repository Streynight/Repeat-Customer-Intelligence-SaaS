# CSV Import Guide

RepeatTree is CSV-first. Real merchant data can come from Shopee, TikTok Shop, Instagram, Facebook, website exports, or a custom spreadsheet.

## Required Fields

Map these fields before confirming import:

| Field | Example | Notes |
| --- | --- | --- |
| `order_id` | `SHP-2001` | Used to avoid duplicate order imports. |
| `customer_name` | `Siriporn C` | Used as fallback identity matching. |
| `order_date` | `2026-04-01` | Any browser-parseable date works best in `YYYY-MM-DD`. |
| `total_amount` | `1290` | Numeric order total. |

## Strongly Recommended Fields

| Field | Why it matters |
| --- | --- |
| `phone` | Best identity resolution signal. Exact phone match merges buyers across channels. |
| `email` | Second-best identity resolution signal. |
| `line_id` | Useful for Thai social commerce sellers. |
| `province` | Useful for merchant context and segmentation later. |
| `product_name` | Shows what each customer bought in profile history. |
| `quantity` | Used for order item display. |
| `unit_price` | Used for order item display. |

## Optional Finance Fields

These fields power `/income`. If they are missing, RepeatTree still imports the order and estimates Thailand VAT from `total_amount`.

| Field | Why it matters |
| --- | --- |
| `tax_amount` | Uses explicit tax from the merchant export instead of an estimate. |
| `discount_amount` | Shows discounts in the income mix. |
| `shipping_amount` | Separates shipping collected from product/order income context. |
| `platform_fee_amount` | Helps net income snapshot subtract marketplace fees. |
| `refund_amount` | Helps net income snapshot subtract refunds. |

## Recommended Header Format

```csv
order_id,customer_name,email,phone,line_id,province,order_date,total_amount,product_name,quantity,unit_price,tax_amount,discount_amount,shipping_amount,platform_fee_amount,refund_amount
SHP-2001,Siriporn C,siri@example.com,0814409911,,Bangkok,2026-04-01,1290,Vitamin C serum,1,1290,84.39,0,40,35,0
SHP-2003,Siriporn Ch,siri@example.com,0814409911,,Bangkok,2026-04-19,1890,Night cream refill,1,1890,123.64,50,40,45,0
```

## Channel Mapping Notes

- Choose the source channel before import: Shopee, TikTok Shop, Instagram, Facebook, Website, or Custom CSV.
- The selected channel is applied to all rows in that import.
- If one CSV mixes multiple channels, split it into separate files for the clearest attribution.
- Scheduled CSV sync uses the same headers and channel rule as manual import.

## Identity Resolution Rules

RepeatTree merges duplicate customers in this order:

1. phone exact match
2. email exact match
3. LINE ID exact match
4. fuzzy full name match

For real CSV testing, include phone whenever possible.

## Common Import Mistakes

- Missing order date or total amount.
- Currency symbols or commas in amount fields. The MVP handles common `$`, `฿`, and comma formatting, but plain numbers are safest.
- Different phone formats for the same buyer. Use normalized mobile numbers when possible.
- One file containing multiple marketplace channels.
- Empty phone/email fields, which forces weaker fuzzy name matching.

## Good Real-Data Test

Use a small file first:

- 20-50 orders
- at least 5 buyers with repeat purchases
- some repeat buyers across two channels
- at least 2 duplicate names with the same phone/email
- at least 1 old customer who should become At Risk or Lost

## Pre-Import Diagnostics

Before saving rows, the Imports page shows:

- total parsed rows
- valid importable rows
- skipped/invalid rows
- missing required mappings
- bad dates
- bad or zero amounts
- rows missing both phone and email
- duplicate order IDs
- likely customer merges by phone, email, LINE ID, or fuzzy name

Errors block import. Warnings do not block import, but they show where real merchant data may need cleanup.
