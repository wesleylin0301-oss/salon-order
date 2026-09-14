import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  posCustomerId: text("pos_customer_id").unique(),
  createdAt: text("created_at").notNull(),
});

export const serviceRecords = sqliteTable("service_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").notNull(),
  serviceDate: text("service_date").notNull(),
  serviceType: text("service_type").notNull(),
  formulaJson: text("formula_json"),
  permMapJson: text("perm_map_json"),
  technicalNotes: text("technical_notes"),
  amount: integer("amount"),
  posTransactionId: text("pos_transaction_id").unique(),
});

export const servicePhotos = sqliteTable("service_photos", {
  id: text("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  serviceDate: text("service_date").notNull(),
  photoKind: text("photo_kind").notNull(),
  objectKey: text("object_key").notNull(),
  contentType: text("content_type").notNull(),
  createdAt: text("created_at").notNull(),
  deletedAt: text("deleted_at"),
}, (table) => [uniqueIndex("service_photo_slot_idx").on(table.customerName, table.serviceDate, table.photoKind)]);

export const manualCustomerRecords = sqliteTable("manual_customer_records", {
  id: text("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  serviceDate: text("service_date").notNull(),
  serviceType: text("service_type").notNull(),
  details: text("details").notNull(),
  sourceKey: text("source_key").unique(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  status: text("status").notNull().default("active"),
  supersededBy: text("superseded_by"),
  voidReason: text("void_reason"),
  deletedAt: text("deleted_at"),
});
