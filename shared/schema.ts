import { pgTable, text, serial, integer, boolean, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  userToken: text("user_token").notNull().unique(), // Token único de 10 caracteres
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name"),
  phone: text("phone"),
  cpf: text("cpf"),
  balance: decimal("balance", { precision: 10, scale: 2 }).default("0.00"),
  bonusBalance: decimal("bonus_balance", { precision: 10, scale: 2 }).default("0.00"), // Saldo de bônus (não sacável)
  totalEarnings: decimal("total_earnings", { precision: 10, scale: 2 }).default("0.00"), // Total ganho em jogos
  totalWithdrawals: decimal("total_withdrawals", { precision: 10, scale: 2 }).default("0.00"), // Total já sacado
  withdrawalBlocked: boolean("withdrawal_blocked").default(false),
  depositBlocked: boolean("deposit_blocked").default(false),
  accountBlocked: boolean("account_blocked").default(false),
  referralCode: text("referral_code").unique(), // Código único do usuário
  referredBy: text("referred_by"), // Código de quem indicou este usuário
  hasReceivedReferralBonus: boolean("has_received_referral_bonus").default(false),
  activeSessionId: text("active_session_id"), // Session ID ativa para controle de sessão única
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const gameSessions = pgTable("game_sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  gameType: text("game_type").notNull(), // 'memory'
  betAmount: decimal("bet_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull(), // 'active', 'completed'
  result: text("result"), // 'won', 'lost'
  winAmount: decimal("win_amount", { precision: 10, scale: 2 }).default("0.00"),
  matchedPairs: integer("matched_pairs").default(0),
  gameData: jsonb("game_data"), // Store game-specific data
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'deposit', 'withdrawal', 'bet', 'win'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  balanceBefore: decimal("balance_before", { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal("balance_after", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  paymentMethod: text("payment_method"), // 'PIX', 'USDT BEP-20', etc.
  gameSessionId: text("game_session_id").references(() => gameSessions.id),
  externalTxnId: text("external_txn_id"), // ID from payment provider (Plisio txn_id, Primepag ID)
  orderNumber: text("order_number"), // Unique random code for security
  status: text("status").default('pending'), // 'pending', 'completed', 'failed', 'cancelled'
  metadata: jsonb("metadata").default('{}'), // Additional data from payment providers
  createdAt: timestamp("created_at").defaultNow(),
});

export const gameSettings = pgTable("game_settings", {
  id: serial("id").primaryKey(),
  maxTime: integer("max_time").notNull().default(30),
  maxMoves: integer("max_moves").notNull().default(20),
  winMultiplier: decimal("win_multiplier", { precision: 5, scale: 2 }).notNull().default("2.00"),
  minBet: decimal("min_bet", { precision: 10, scale: 2 }).notNull().default("1.00"),
  maxBet: decimal("max_bet", { precision: 10, scale: 2 }).notNull().default("1000.00"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const affiliateSettings = pgTable("affiliate_settings", {
  id: serial("id").primaryKey(),
  referrerBonus: decimal("referrer_bonus", { precision: 10, scale: 2 }).default("1.00"), // Bônus para quem indica
  referredBonus: decimal("referred_bonus", { precision: 10, scale: 2 }).default("1.00"), // Bônus para quem é indicado
  commissionPercentage: decimal("commission_percentage", { precision: 5, scale: 2 }).default("5.00"), // Percentual de comissão
  minWithdrawal: decimal("min_withdrawal", { precision: 10, scale: 2 }).default("10.00"), // Valor mínimo para saque
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'pix', 'usdt'
  isActive: boolean("is_active").default(true),
  settings: jsonb("settings").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  siteName: text("site_name").notNull().default("Memory Casino"),
  favicon: text("favicon"),
  logoLight: text("logo_light"),
  logoDark: text("logo_dark"),
  primaryColor: text("primary_color").default("#6366f1"),
  theme: text("theme").default("light"), // 'light', 'dark', 'system'
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const referralCommissions = pgTable("referral_commissions", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").references(() => users.id).notNull(), // Quem indicou
  referredId: integer("referred_id").references(() => users.id).notNull(), // Quem foi indicado
  gameSessionId: text("game_session_id").references(() => gameSessions.id), // Sessão que gerou a comissão
  betAmount: decimal("bet_amount", { precision: 10, scale: 2 }).notNull(), // Valor da aposta
  commissionAmount: decimal("commission_amount", { precision: 10, scale: 2 }).notNull(), // Valor da comissão
  commissionPercentage: decimal("commission_percentage", { precision: 5, scale: 2 }).default("5.00"), // Percentual da comissão
  status: text("status").notNull().default("pending"), // 'pending', 'paid', 'cancelled'
  createdAt: timestamp("created_at").defaultNow(),
  paidAt: timestamp("paid_at"),
});

export const passwordResets = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentSettings = pgTable("payment_settings", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(), // 'primepag' or 'plisio'
  isTestMode: boolean("is_test_mode").default(true),
  clientId: text("client_id"),
  clientSecret: text("client_secret"),
  secretKey: text("secret_key"),
  isActive: boolean("is_active").default(true),
  minDepositAmount: decimal("min_deposit_amount", { precision: 10, scale: 2 }).default("10.00"),
  maxDepositAmount: decimal("max_deposit_amount", { precision: 10, scale: 2 }).default("50000.00"),
  minWithdrawalAmount: decimal("min_withdrawal_amount", { precision: 10, scale: 2 }).default("10.00"),
  maxWithdrawalAmount: decimal("max_withdrawal_amount", { precision: 10, scale: 2 }).default("50000.00"),
  withdrawalFeePercentage: decimal("withdrawal_fee_percentage", { precision: 5, scale: 2 }).default("2.50"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schema validations
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  name: true,
  phone: true,
  cpf: true,
  balance: true,
  referralCode: true,
  referredBy: true,
});

export const insertGameSessionSchema = createInsertSchema(gameSessions).pick({
  userId: true,
  gameType: true,
  betAmount: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  userId: true,
  type: true,
  amount: true,
  balanceBefore: true,
  balanceAfter: true,
  description: true,
  gameSessionId: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type GameSession = typeof gameSessions.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type GameSettings = typeof gameSettings.$inferSelect;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type ReferralCommission = typeof referralCommissions.$inferSelect;
export type PasswordReset = typeof passwordResets.$inferSelect;

export type InsertGameSession = z.infer<typeof insertGameSessionSchema>;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type SiteSettings = typeof siteSettings.$inferSelect;
export type AffiliateSettings = typeof affiliateSettings.$inferSelect;
