CREATE TABLE "shipping_review" (
	"owner_id" text NOT NULL,
	"run_hash" text NOT NULL,
	"email_id" text NOT NULL,
	"version" integer NOT NULL,
	"history" jsonb NOT NULL,
	CONSTRAINT "shipping_review_owner_id_run_hash_email_id_pk" PRIMARY KEY("owner_id","run_hash","email_id")
);
--> statement-breakpoint
ALTER TABLE "shipping_review" ADD CONSTRAINT "shipping_review_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;