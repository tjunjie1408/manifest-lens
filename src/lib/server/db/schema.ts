import { user } from './auth.schema';
import type { Event } from '../../schemas/shipping';
import { integer, pgTable, text, jsonb, primaryKey } from 'drizzle-orm/pg-core';

export const task = pgTable('task', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	title: text('title').notNull(),
	priority: integer('priority').notNull().default(1)
});

export * from './auth.schema';

export const shippingReview = pgTable(
	'shipping_review',
	{
		ownerId: text('owner_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		runHash: text('run_hash').notNull(),
		emailId: text('email_id').notNull(),
		version: integer('version').notNull(),
		history: jsonb('history').$type<Event[]>().notNull()
	},
	(t) => [primaryKey({ columns: [t.ownerId, t.runHash, t.emailId] })]
);
