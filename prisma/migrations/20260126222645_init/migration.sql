-- CreateTable
CREATE TABLE "Contact_catalog"."users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) NOT NULL,
    "username" VARCHAR(100),
    "password_hash" VARCHAR(255) NOT NULL,
    "email_verified" BOOLEAN DEFAULT false,
    "email_verification_token" VARCHAR(255),
    "password_reset_token" VARCHAR(255),
    "password_reset_expires_at" TIMESTAMPTZ(6),
    "full_name" VARCHAR(255),
    "avatar_url" VARCHAR(500),
    "timezone" VARCHAR(50) DEFAULT 'UTC',
    "language" VARCHAR(10) DEFAULT 'ru',
    "settings" JSONB DEFAULT '{"default_view": "list", "notifications": true, "privacy_level": "private"}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "last_login_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact_catalog"."user_sessions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(255) NOT NULL,
    "user_agent" TEXT,
    "ip_address" INET,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact_catalog"."audit_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "action" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact_catalog"."contacts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100),
    "middle_name" VARCHAR(100),
    "nickname" VARCHAR(100),
    "email" VARCHAR(255),
    "phone" VARCHAR(50),
    "phone_secondary" VARCHAR(50),
    "website" VARCHAR(500),
    "gender" VARCHAR(20),
    "date_of_birth" DATE,
    "country" VARCHAR(100),
    "city" VARCHAR(100),
    "address" TEXT,
    "postal_code" VARCHAR(20),
    "company" VARCHAR(255),
    "job_title" VARCHAR(255),
    "department" VARCHAR(255),
    "relationship_type" VARCHAR(50) DEFAULT 'friend',
    "relationship_level" INTEGER,
    "trust_level" INTEGER,
    "how_we_met" TEXT,
    "met_date" DATE,
    "met_location" VARCHAR(255),
    "personal_notes" TEXT,
    "interests" JSONB,
    "important_facts" JSONB,
    "avatar_url" VARCHAR(500),
    "last_interaction_date" TIMESTAMPTZ(6),
    "total_interactions" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact_catalog"."contact_relationships" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "source_contact_id" UUID NOT NULL,
    "target_contact_id" UUID NOT NULL,
    "relationship_type" VARCHAR(100) NOT NULL,
    "reciprocal_relationship" VARCHAR(100),
    "notes" TEXT,
    "strength" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact_catalog"."tags" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "color" VARCHAR(7) DEFAULT '#3B82F6',
    "icon" VARCHAR(50),
    "description" TEXT,
    "is_system" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact_catalog"."contact_tags" (
    "contact_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_tags_pkey" PRIMARY KEY ("contact_id","tag_id")
);

-- CreateTable
CREATE TABLE "Contact_catalog"."interaction_types" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(50),
    "color" VARCHAR(7),
    "is_system" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interaction_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact_catalog"."interactions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "interaction_type_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "quick_notes" TEXT,
    "started_at" TIMESTAMPTZ(6) NOT NULL,
    "ended_at" TIMESTAMPTZ(6),
    "duration_minutes" INTEGER,
    "location" VARCHAR(255),
    "location_lat" DECIMAL(10,8),
    "location_lng" DECIMAL(11,8),
    "mood_before" INTEGER,
    "mood_after" INTEGER,
    "importance" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact_catalog"."notes" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "contact_id" UUID,
    "event_id" UUID,
    "interaction_id" UUID,
    "title" VARCHAR(255),
    "content" TEXT NOT NULL,
    "is_private" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact_catalog"."event_types" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "icon" VARCHAR(50),
    "color" VARCHAR(7),
    "default_duration_minutes" INTEGER,
    "is_recurring_template" BOOLEAN DEFAULT false,
    "recurrence_pattern" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact_catalog"."events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "event_type_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "start_at" TIMESTAMPTZ(6) NOT NULL,
    "end_at" TIMESTAMPTZ(6),
    "is_all_day" BOOLEAN DEFAULT false,
    "timezone" VARCHAR(50),
    "is_recurring" BOOLEAN DEFAULT false,
    "recurrence_rule" VARCHAR(500),
    "recurrence_exceptions" DATE[],
    "parent_event_id" UUID,
    "location" VARCHAR(500),
    "location_lat" DECIMAL(10,8),
    "location_lng" DECIMAL(11,8),
    "status" VARCHAR(20) DEFAULT 'scheduled',
    "is_public" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact_catalog"."event_participants" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "event_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(50) DEFAULT 'participant',
    "rsvp_status" VARCHAR(20) DEFAULT 'pending',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact_catalog"."event_tags" (
    "event_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_tags_pkey" PRIMARY KEY ("event_id","tag_id")
);

-- CreateTable
CREATE TABLE "Contact_catalog"."media" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "contact_id" UUID,
    "event_id" UUID,
    "interaction_id" UUID,
    "filename" VARCHAR(500) NOT NULL,
    "original_filename" VARCHAR(500),
    "file_path" VARCHAR(1000) NOT NULL,
    "file_size" BIGINT,
    "mime_type" VARCHAR(100),
    "storage_provider" VARCHAR(50) DEFAULT 'local',
    "title" VARCHAR(255),
    "description" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "duration_seconds" INTEGER,
    "exif_data" JSONB,
    "is_private" BOOLEAN DEFAULT false,
    "access_token" VARCHAR(255),
    "uploaded_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "taken_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact_catalog"."reminders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "contact_id" UUID,
    "event_id" UUID,
    "interaction_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "due_at" TIMESTAMPTZ(6) NOT NULL,
    "scheduled_at" TIMESTAMPTZ(6),
    "is_recurring" BOOLEAN DEFAULT false,
    "recurrence_pattern" VARCHAR(500),
    "recurrence_end_date" DATE,
    "notification_channels" VARCHAR(50)[] DEFAULT ARRAY['in_app']::VARCHAR(50)[],
    "status" VARCHAR(20) DEFAULT 'pending',
    "snoozed_until" TIMESTAMPTZ(6),
    "priority" INTEGER,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact_catalog"."notification_history" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "reminder_id" UUID,
    "channel" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "payload" JSONB,
    "sent_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "delivered_at" TIMESTAMPTZ(6),
    "read_at" TIMESTAMPTZ(6),
    "error_message" TEXT,

    CONSTRAINT "notification_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "Contact_catalog"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "Contact_catalog"."users"("username");

-- CreateIndex
CREATE INDEX "idx_user_sessions_expires" ON "Contact_catalog"."user_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "idx_user_sessions_user_id" ON "Contact_catalog"."user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "idx_audit_created" ON "Contact_catalog"."audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "idx_audit_entity" ON "Contact_catalog"."audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_audit_user" ON "Contact_catalog"."audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "idx_contacts_city" ON "Contact_catalog"."contacts"("user_id", "city");

-- CreateIndex
CREATE INDEX "idx_contacts_email" ON "Contact_catalog"."contacts"("user_id", "email");

-- CreateIndex
CREATE INDEX "idx_contacts_last_interaction" ON "Contact_catalog"."contacts"("user_id", "last_interaction_date");

-- CreateIndex
CREATE INDEX "idx_contacts_name" ON "Contact_catalog"."contacts"("user_id", "first_name", "last_name");

-- CreateIndex
CREATE INDEX "idx_contacts_phone" ON "Contact_catalog"."contacts"("user_id", "phone");

-- CreateIndex
CREATE INDEX "idx_contacts_relationship" ON "Contact_catalog"."contacts"("user_id", "relationship_type");

-- CreateIndex
CREATE INDEX "idx_contacts_user" ON "Contact_catalog"."contacts"("user_id");

-- CreateIndex
CREATE INDEX "idx_contact_rels_source" ON "Contact_catalog"."contact_relationships"("source_contact_id");

-- CreateIndex
CREATE INDEX "idx_contact_rels_target" ON "Contact_catalog"."contact_relationships"("target_contact_id");

-- CreateIndex
CREATE INDEX "idx_contact_rels_user" ON "Contact_catalog"."contact_relationships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_unique_contact_relationship" ON "Contact_catalog"."contact_relationships"("user_id", "source_contact_id", "target_contact_id", "relationship_type");

-- CreateIndex
CREATE INDEX "idx_tags_user" ON "Contact_catalog"."tags"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_tags_user_name" ON "Contact_catalog"."tags"("user_id", "name");

-- CreateIndex
CREATE INDEX "idx_contact_tags_contact" ON "Contact_catalog"."contact_tags"("contact_id");

-- CreateIndex
CREATE INDEX "idx_contact_tags_tag" ON "Contact_catalog"."contact_tags"("tag_id");

-- CreateIndex
CREATE INDEX "idx_interaction_types_user" ON "Contact_catalog"."interaction_types"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_interaction_types_user_name" ON "Contact_catalog"."interaction_types"("user_id", "name");

-- CreateIndex
CREATE INDEX "idx_interactions_contact" ON "Contact_catalog"."interactions"("contact_id");

-- CreateIndex
CREATE INDEX "idx_interactions_date" ON "Contact_catalog"."interactions"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "idx_interactions_type" ON "Contact_catalog"."interactions"("interaction_type_id");

-- CreateIndex
CREATE INDEX "idx_interactions_user" ON "Contact_catalog"."interactions"("user_id");

-- CreateIndex
CREATE INDEX "idx_notes_contact" ON "Contact_catalog"."notes"("contact_id");

-- CreateIndex
CREATE INDEX "idx_notes_created" ON "Contact_catalog"."notes"("created_at");

-- CreateIndex
CREATE INDEX "idx_notes_user" ON "Contact_catalog"."notes"("user_id");

-- CreateIndex
CREATE INDEX "idx_event_types_user" ON "Contact_catalog"."event_types"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_event_types_user_name" ON "Contact_catalog"."event_types"("user_id", "name");

-- CreateIndex
CREATE INDEX "idx_events_date" ON "Contact_catalog"."events"("user_id", "start_at");

-- CreateIndex
CREATE INDEX "idx_events_recurring" ON "Contact_catalog"."events"("is_recurring", "start_at");

-- CreateIndex
CREATE INDEX "idx_events_type" ON "Contact_catalog"."events"("event_type_id");

-- CreateIndex
CREATE INDEX "idx_events_user" ON "Contact_catalog"."events"("user_id");

-- CreateIndex
CREATE INDEX "idx_event_participants_contact" ON "Contact_catalog"."event_participants"("contact_id");

-- CreateIndex
CREATE INDEX "idx_event_participants_event" ON "Contact_catalog"."event_participants"("event_id");

-- CreateIndex
CREATE INDEX "idx_event_participants_user" ON "Contact_catalog"."event_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_event_participants_event_contact" ON "Contact_catalog"."event_participants"("event_id", "contact_id");

-- CreateIndex
CREATE INDEX "idx_event_tags_event" ON "Contact_catalog"."event_tags"("event_id");

-- CreateIndex
CREATE INDEX "idx_event_tags_tag" ON "Contact_catalog"."event_tags"("tag_id");

-- CreateIndex
CREATE INDEX "idx_media_contact" ON "Contact_catalog"."media"("contact_id");

-- CreateIndex
CREATE INDEX "idx_media_event" ON "Contact_catalog"."media"("event_id");

-- CreateIndex
CREATE INDEX "idx_media_uploaded" ON "Contact_catalog"."media"("uploaded_at");

-- CreateIndex
CREATE INDEX "idx_media_user" ON "Contact_catalog"."media"("user_id");

-- CreateIndex
CREATE INDEX "idx_reminders_contact" ON "Contact_catalog"."reminders"("contact_id");

-- CreateIndex
CREATE INDEX "idx_reminders_due" ON "Contact_catalog"."reminders"("user_id", "due_at", "status");

-- CreateIndex
CREATE INDEX "idx_reminders_event" ON "Contact_catalog"."reminders"("event_id");

-- CreateIndex
CREATE INDEX "idx_reminders_user" ON "Contact_catalog"."reminders"("user_id");

-- CreateIndex
CREATE INDEX "idx_notification_history_reminder" ON "Contact_catalog"."notification_history"("reminder_id");

-- CreateIndex
CREATE INDEX "idx_notification_history_sent" ON "Contact_catalog"."notification_history"("sent_at");

-- CreateIndex
CREATE INDEX "idx_notification_history_user" ON "Contact_catalog"."notification_history"("user_id");

-- AddForeignKey
ALTER TABLE "Contact_catalog"."user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Contact_catalog"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Contact_catalog"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."contacts" ADD CONSTRAINT "contacts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Contact_catalog"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."contact_relationships" ADD CONSTRAINT "contact_relationships_source_contact_id_fkey" FOREIGN KEY ("source_contact_id") REFERENCES "Contact_catalog"."contacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."contact_relationships" ADD CONSTRAINT "contact_relationships_target_contact_id_fkey" FOREIGN KEY ("target_contact_id") REFERENCES "Contact_catalog"."contacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."contact_relationships" ADD CONSTRAINT "contact_relationships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Contact_catalog"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."tags" ADD CONSTRAINT "tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Contact_catalog"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."contact_tags" ADD CONSTRAINT "contact_tags_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact_catalog"."contacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."contact_tags" ADD CONSTRAINT "contact_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "Contact_catalog"."tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."interaction_types" ADD CONSTRAINT "interaction_types_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Contact_catalog"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."interactions" ADD CONSTRAINT "interactions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact_catalog"."contacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."interactions" ADD CONSTRAINT "interactions_interaction_type_id_fkey" FOREIGN KEY ("interaction_type_id") REFERENCES "Contact_catalog"."interaction_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."interactions" ADD CONSTRAINT "interactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Contact_catalog"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."notes" ADD CONSTRAINT "fk_notes_event" FOREIGN KEY ("event_id") REFERENCES "Contact_catalog"."events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."notes" ADD CONSTRAINT "notes_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact_catalog"."contacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."notes" ADD CONSTRAINT "notes_interaction_id_fkey" FOREIGN KEY ("interaction_id") REFERENCES "Contact_catalog"."interactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."notes" ADD CONSTRAINT "notes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Contact_catalog"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."event_types" ADD CONSTRAINT "event_types_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Contact_catalog"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."events" ADD CONSTRAINT "events_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "Contact_catalog"."event_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."events" ADD CONSTRAINT "events_parent_event_id_fkey" FOREIGN KEY ("parent_event_id") REFERENCES "Contact_catalog"."events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."events" ADD CONSTRAINT "events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Contact_catalog"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."event_participants" ADD CONSTRAINT "event_participants_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact_catalog"."contacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."event_participants" ADD CONSTRAINT "event_participants_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Contact_catalog"."events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."event_participants" ADD CONSTRAINT "event_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Contact_catalog"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."event_tags" ADD CONSTRAINT "event_tags_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Contact_catalog"."events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."event_tags" ADD CONSTRAINT "event_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "Contact_catalog"."tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."media" ADD CONSTRAINT "media_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact_catalog"."contacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."media" ADD CONSTRAINT "media_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Contact_catalog"."events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."media" ADD CONSTRAINT "media_interaction_id_fkey" FOREIGN KEY ("interaction_id") REFERENCES "Contact_catalog"."interactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."media" ADD CONSTRAINT "media_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Contact_catalog"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."reminders" ADD CONSTRAINT "reminders_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "Contact_catalog"."contacts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."reminders" ADD CONSTRAINT "reminders_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Contact_catalog"."events"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."reminders" ADD CONSTRAINT "reminders_interaction_id_fkey" FOREIGN KEY ("interaction_id") REFERENCES "Contact_catalog"."interactions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."reminders" ADD CONSTRAINT "reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Contact_catalog"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."notification_history" ADD CONSTRAINT "notification_history_reminder_id_fkey" FOREIGN KEY ("reminder_id") REFERENCES "Contact_catalog"."reminders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Contact_catalog"."notification_history" ADD CONSTRAINT "notification_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Contact_catalog"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
