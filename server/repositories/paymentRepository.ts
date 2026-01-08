/**
 * Payment Repository
 * Handles payment records and statistics
 */

import { BaseRepository } from "./base";
import { payments, type Payment, type InsertPayment } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";

export interface IPaymentRepository {
  getUserPayments(userId: string): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentByPaypalOrderId(orderId: string): Promise<Payment | undefined>;
  getPaymentStats(userId: string): Promise<{
    totalPaid: string;
    lastPaymentDate: Date | null;
    lastPaymentAmount: string | null;
    paymentCount: number;
  }>;
}

export class PaymentRepository extends BaseRepository implements IPaymentRepository {
  async getUserPayments(userId: string): Promise<Payment[]> {
    return await this.db
      .select()
      .from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.paymentDate));
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [created] = await this.db
      .insert(payments)
      .values(payment)
      .returning();
    return created;
  }

  async getPaymentByPaypalOrderId(orderId: string): Promise<Payment | undefined> {
    const [payment] = await this.db
      .select()
      .from(payments)
      .where(eq(payments.paypalOrderId, orderId))
      .limit(1);
    return payment;
  }

  async getPaymentStats(userId: string): Promise<{
    totalPaid: string;
    lastPaymentDate: Date | null;
    lastPaymentAmount: string | null;
    paymentCount: number;
  }> {
    const [stats] = await this.db
      .select({
        totalPaid: sql<string>`COALESCE(SUM(${payments.amount}), 0)::text`,
        lastPaymentDate: sql<Date | null>`MAX(${payments.paymentDate})`,
        lastPaymentAmount: sql<string | null>`(
          SELECT ${payments.amount}::text 
          FROM ${payments} 
          WHERE ${payments.userId} = ${userId} 
          ORDER BY ${payments.paymentDate} DESC 
          LIMIT 1
        )`,
        paymentCount: sql<number>`COUNT(*)::int`,
      })
      .from(payments)
      .where(eq(payments.userId, userId));

    return stats || {
      totalPaid: "0",
      lastPaymentDate: null,
      lastPaymentAmount: null,
      paymentCount: 0,
    };
  }
}

