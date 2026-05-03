'use server'

import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { ensureAuthUserProfile } from './auth'
import type {
  CustomerProfile,
  CustomerStatus,
  ImportRecord,
  IntelligenceDataset,
  OrderRecord,
  SourceChannel,
} from '@/lib/types'

export async function ensureUserStore(userId: string, email: string): Promise<string> {
  await ensureAuthUserProfile(userId, email)

  const existing = await prisma.store.findFirst({ where: { userId } })
  if (existing) return existing.id

  const store = await prisma.store.create({ data: { userId, name: 'My Store' } })
  return store.id
}

export async function loadDataset(
  storeId: string,
): Promise<Omit<IntelligenceDataset, 'vipThreshold'>> {
  const [dbCustomers, dbImports] = await Promise.all([
    prisma.customerProfile.findMany({
      where: { storeId },
      include: { orders: { include: { items: true } } },
    }),
    prisma.import.findMany({
      where: { storeId },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const customers: CustomerProfile[] = dbCustomers.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    email: c.email ?? undefined,
    phone: c.phone ?? undefined,
    lineId: c.lineId ?? undefined,
    province: c.province ?? undefined,
    firstChannel: c.firstChannel as SourceChannel,
    lastChannel: c.lastChannel as SourceChannel,
    totalOrders: c.totalOrders,
    totalSpent: Number(c.totalSpent),
    firstOrderDate: c.firstOrderDate?.toISOString() ?? '',
    lastOrderDate: c.lastOrderDate?.toISOString() ?? '',
    customerStatus: c.customerStatus as CustomerStatus,
    orders: c.orders.map((o) => ({
      id: o.id,
      customerProfileId: o.customerProfileId,
      externalOrderId: o.externalOrderId ?? '',
      sourceChannel: o.sourceChannel as SourceChannel,
      customerNameRaw: o.customerNameRaw,
      emailRaw: o.emailRaw ?? undefined,
      phoneRaw: o.phoneRaw ?? undefined,
      provinceRaw: o.provinceRaw ?? undefined,
      orderDate: o.orderDate.toISOString(),
      totalAmount: Number(o.totalAmount),
      taxAmount: Number(o.taxAmount),
      discountAmount: Number(o.discountAmount),
      shippingAmount: Number(o.shippingAmount),
      platformFeeAmount: Number(o.platformFeeAmount),
      refundAmount: Number(o.refundAmount),
      taxRate: Number(o.taxRate),
      taxIncluded: o.taxIncluded,
      items: o.items.map((item) => ({
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
      })),
    })),
  }))

  const orders: OrderRecord[] = customers.flatMap((c) => c.orders)

  const imports: ImportRecord[] = dbImports.map((i) => ({
    id: i.id,
    fileName: i.fileName,
    sourceChannel: i.sourceChannel as SourceChannel,
    importStatus: i.importStatus as ImportRecord['importStatus'],
    totalRows: i.totalRows,
    importedRows: i.importedRows,
    createdAt: i.createdAt.toISOString(),
  }))

  return { customers, orders, imports }
}

export async function persistImport(storeId: string, dataset: IntelligenceDataset): Promise<void> {
  await writeInBatches(dataset.customers, 25, async (customers) => {
    await Promise.all(
      customers.map((customer) => {
        const data = {
          fullName: customer.fullName,
          email: customer.email ?? null,
          phone: customer.phone ?? null,
          lineId: customer.lineId ?? null,
          province: customer.province ?? null,
          firstChannel: customer.firstChannel,
          lastChannel: customer.lastChannel,
          totalOrders: customer.totalOrders,
          totalSpent: customer.totalSpent,
          firstOrderDate: customer.firstOrderDate ? new Date(customer.firstOrderDate) : null,
          lastOrderDate: customer.lastOrderDate ? new Date(customer.lastOrderDate) : null,
          customerStatus: customer.customerStatus,
        }

        return prisma.customerProfile.upsert({
          where: { id: customer.id },
          update: data,
          create: {
            id: customer.id,
            storeId,
            ...data,
          },
        })
      }),
    )
  })

  const orders = dataset.customers.flatMap((customer) =>
    customer.orders.map((order) => ({
      id: orderIdForStore(storeId, order),
      storeId,
      customerProfileId: customer.id,
      externalOrderId: order.externalOrderId || null,
      sourceChannel: order.sourceChannel,
      customerNameRaw: order.customerNameRaw,
      emailRaw: order.emailRaw ?? null,
      phoneRaw: order.phoneRaw ?? null,
      provinceRaw: order.provinceRaw ?? null,
      orderDate: new Date(order.orderDate),
      totalAmount: order.totalAmount,
      taxAmount: order.taxAmount ?? 0,
      discountAmount: order.discountAmount ?? 0,
      shippingAmount: order.shippingAmount ?? 0,
      platformFeeAmount: order.platformFeeAmount ?? 0,
      refundAmount: order.refundAmount ?? 0,
      taxRate: order.taxRate ?? 0.07,
      taxIncluded: order.taxIncluded ?? true,
    })),
  )

  await writeInBatches(orders, 500, async (data) => {
    await prisma.order.createMany({ data, skipDuplicates: true })
  })

  await prisma.orderItem.deleteMany({ where: { order: { storeId } } })

  const orderItems = dataset.customers.flatMap((customer) =>
    customer.orders.flatMap((order) =>
      order.items.map((item) => ({
        orderId: orderIdForStore(storeId, order),
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    ),
  )

  if (orderItems.length > 0) {
    await writeInBatches(orderItems, 500, async (data) => {
      await prisma.orderItem.createMany({ data })
    })
  }

  const imports = dataset.imports.map((imp) => ({
    id: imp.id,
    storeId,
    fileName: imp.fileName,
    sourceChannel: imp.sourceChannel,
    importStatus: imp.importStatus,
    totalRows: imp.totalRows,
    importedRows: imp.importedRows,
  }))

  await writeInBatches(imports, 500, async (data) => {
    await prisma.import.createMany({ data, skipDuplicates: true })
  })
}

export async function clearStoreDataset(storeId: string): Promise<void> {
  const supabase = await createClient()
  const { data } = await supabase.auth.getUser()

  if (!data.user) {
    throw new Error('Not authenticated')
  }

  const store = await prisma.store.findFirst({
    where: {
      id: storeId,
      userId: data.user.id,
    },
    select: { id: true },
  })

  if (!store) {
    throw new Error('Store not found')
  }

  await prisma.$transaction([
    prisma.orderItem.deleteMany({ where: { order: { storeId } } }),
    prisma.order.deleteMany({ where: { storeId } }),
    prisma.customerProfile.deleteMany({ where: { storeId } }),
    prisma.import.deleteMany({ where: { storeId } }),
  ])
}

async function writeInBatches<T>(
  items: T[],
  batchSize: number,
  writeBatch: (batch: T[]) => Promise<void>,
) {
  for (let index = 0; index < items.length; index += batchSize) {
    await writeBatch(items.slice(index, index + batchSize))
  }
}

function orderIdForStore(storeId: string, order: OrderRecord) {
  return `${storeId}:${order.sourceChannel}:${order.externalOrderId || order.id}`
}
