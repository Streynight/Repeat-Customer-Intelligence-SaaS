# Demo and Real-Data Test Checklist

Use this checklist before showing the app to a merchant or testing their CSV.

## Demo Flow

- Open `/dashboard`.
- Confirm the top three insight cards are readable:
  - Best repeat channel
  - Top channel path
  - Remarketing revenue at risk
- Open `/imports`.
- Click “Try sample” for TikTok Shop.
- Review the pre-import diagnostics panel.
- Confirm preview rows appear.
- Click “Confirm import”.
- Return to `/dashboard`.
- Confirm KPIs and charts update.
- Open `/customers`.
- Export Repeat, VIP, and At Risk customers.
- Open a customer detail page.
- Confirm merged identity and channel journey are visible.

## Real CSV Test

- Start with a copy of the merchant CSV, not the original.
- Confirm order date and total amount columns exist.
- Confirm phone or email exists for most rows.
- Import a small sample first.
- Review diagnostics for missing mappings, bad dates, bad amounts, missing phone/email, duplicate order IDs, and likely merges.
- Check whether known repeat customers merge correctly.
- Check whether repeat revenue by channel matches the merchant’s intuition.
- Export Repeat/VIP/At Risk customers and inspect the CSV.

## Pass Criteria

- Merchant understands the dashboard value in under 10 seconds.
- At least one channel winner is obvious.
- At least one repeat customer profile shows multiple orders.
- Duplicate buyers merge by phone or email.
- Export files are usable for remarketing workflows.
