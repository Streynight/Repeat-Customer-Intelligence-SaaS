import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma/client'
import type {
  CustomerProfile,
  CustomerStatus,
  ImportRecord,
  IntelligenceDataset,
  OrderRecord,
  SourceChannel,
} from '@/lib/types'

export async function loadDatasetForStore(
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

export async function persistImportForStore(storeId: string, dataset: IntelligenceDataset): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await writeInBatches(dataset.customers, 25, async (customers) => {
      await Promise.all(
        customers.map((customer) => upsertCustomerForStore(tx, storeId, customer)),
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
      await tx.order.createMany({ data, skipDuplicates: true })
    })

    await tx.orderItem.deleteMany({ where: { order: { storeId } } })

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
        await tx.orderItem.createMany({ data })
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
      await tx.import.createMany({ data, skipDuplicates: true })
    })
  })
}

export async function clearDatasetForStore(storeId: string): Promise<void> {
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

async function upsertCustomerForStore(
  tx: Prisma.TransactionClient,
  storeId: string,
  customer: CustomerProfile,
) {
  const existing = await tx.customerProfile.findUnique({
    where: { id: customer.id },
    select: { id: true, storeId: true },
  })
  if (existing && existing.storeId !== storeId) {
    throw new Error('Customer profile does not belong to this store.')
  }

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

  if (existing) {
    return tx.customerProfile.update({
      where: { id: customer.id },
      data,
    })
  }

  return tx.customerProfile.create({
    data: {
      id: customer.id,
      storeId,
      ...data,
    },
  })
}
