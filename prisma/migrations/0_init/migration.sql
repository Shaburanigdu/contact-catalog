-- Baseline migration generated from the database schema used in the thesis
-- (pg_dump --schema-only of "Contact_catalog"). Includes triggers, views,
-- full-text GIN indexes and the pgvector index that Prisma cannot express.

CREATE SCHEMA IF NOT EXISTS "Contact_catalog";

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA "Contact_catalog";

CREATE FUNCTION "Contact_catalog".update_contact_last_interaction() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    UPDATE "Contact_catalog".contacts 
    SET last_interaction_date = NEW.started_at,
        total_interactions = total_interactions + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.contact_id;
    RETURN NEW;
END;
$$;

CREATE FUNCTION "Contact_catalog".update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TABLE "Contact_catalog".audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    action character varying(50) NOT NULL,
    entity_type character varying(50) NOT NULL,
    entity_id uuid,
    old_values jsonb,
    new_values jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Contact_catalog".contact_relationships (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    source_contact_id uuid NOT NULL,
    target_contact_id uuid NOT NULL,
    relationship_type character varying(100) NOT NULL,
    reciprocal_relationship character varying(100),
    notes text,
    strength integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_strength CHECK (((strength >= 1) AND (strength <= 10))),
    CONSTRAINT no_self_relationship CHECK ((source_contact_id <> target_contact_id))
);

CREATE TABLE "Contact_catalog".contact_tags (
    contact_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Contact_catalog".contacts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100),
    middle_name character varying(100),
    nickname character varying(100),
    email character varying(255),
    phone character varying(50),
    phone_secondary character varying(50),
    website character varying(500),
    gender character varying(20),
    date_of_birth date,
    country character varying(100),
    city character varying(100),
    address text,
    postal_code character varying(20),
    company character varying(255),
    job_title character varying(255),
    department character varying(255),
    relationship_type character varying(50) DEFAULT 'Друг'::character varying,
    relationship_level integer,
    trust_level integer,
    how_we_met text,
    met_date date,
    met_location character varying(255),
    personal_notes text,
    interests jsonb,
    important_facts jsonb,
    avatar_url character varying(500),
    last_interaction_date timestamp with time zone,
    total_interactions integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    embedding "Contact_catalog".vector(768),
    CONSTRAINT check_contact_info CHECK (((email IS NOT NULL) OR (phone IS NOT NULL) OR (first_name IS NOT NULL))),
    CONSTRAINT check_relationship_level CHECK (((relationship_level >= 1) AND (relationship_level <= 10))),
    CONSTRAINT check_trust_level CHECK (((trust_level >= 1) AND (trust_level <= 10)))
);

CREATE VIEW "Contact_catalog".contacts_extended AS
SELECT
    NULL::uuid AS id,
    NULL::uuid AS user_id,
    NULL::character varying(100) AS first_name,
    NULL::character varying(100) AS last_name,
    NULL::character varying(100) AS middle_name,
    NULL::character varying(100) AS nickname,
    NULL::character varying(255) AS email,
    NULL::character varying(50) AS phone,
    NULL::character varying(50) AS phone_secondary,
    NULL::character varying(500) AS website,
    NULL::character varying(20) AS gender,
    NULL::date AS date_of_birth,
    NULL::character varying(100) AS country,
    NULL::character varying(100) AS city,
    NULL::text AS address,
    NULL::character varying(20) AS postal_code,
    NULL::character varying(255) AS company,
    NULL::character varying(255) AS job_title,
    NULL::character varying(255) AS department,
    NULL::character varying(50) AS relationship_type,
    NULL::integer AS relationship_level,
    NULL::integer AS trust_level,
    NULL::text AS how_we_met,
    NULL::date AS met_date,
    NULL::character varying(255) AS met_location,
    NULL::text AS personal_notes,
    NULL::jsonb AS interests,
    NULL::jsonb AS important_facts,
    NULL::character varying(500) AS avatar_url,
    NULL::timestamp with time zone AS last_interaction_date,
    NULL::integer AS total_interactions,
    NULL::timestamp with time zone AS created_at,
    NULL::timestamp with time zone AS updated_at,
    NULL::timestamp with time zone AS deleted_at,
    NULL::character varying[] AS tags,
    NULL::bigint AS total_interactions_count,
    NULL::timestamp with time zone AS last_interaction_date_actual,
    NULL::character varying[] AS event_types;

CREATE TABLE "Contact_catalog".event_participants (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    event_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(50) DEFAULT 'participant'::character varying,
    rsvp_status character varying(20) DEFAULT 'pending'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Contact_catalog".event_tags (
    event_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Contact_catalog".event_types (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    icon character varying(50),
    color character varying(7),
    default_duration_minutes integer,
    is_recurring_template boolean DEFAULT false,
    recurrence_pattern jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    is_system boolean DEFAULT false NOT NULL
);

CREATE TABLE "Contact_catalog".events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    event_type_id uuid,
    title character varying(255) NOT NULL,
    description text,
    start_at timestamp with time zone NOT NULL,
    end_at timestamp with time zone,
    is_all_day boolean DEFAULT false,
    timezone character varying(50),
    is_recurring boolean DEFAULT false,
    recurrence_rule character varying(500),
    recurrence_exceptions date[],
    parent_event_id uuid,
    location character varying(500),
    location_lat numeric(10,8),
    location_lng numeric(11,8),
    status character varying(20) DEFAULT 'scheduled'::character varying,
    is_public boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    embedding "Contact_catalog".vector(768)
);

CREATE VIEW "Contact_catalog".events_with_participants AS
SELECT
    NULL::uuid AS id,
    NULL::uuid AS user_id,
    NULL::uuid AS event_type_id,
    NULL::character varying(255) AS title,
    NULL::text AS description,
    NULL::timestamp with time zone AS start_at,
    NULL::timestamp with time zone AS end_at,
    NULL::boolean AS is_all_day,
    NULL::character varying(50) AS timezone,
    NULL::boolean AS is_recurring,
    NULL::character varying(500) AS recurrence_rule,
    NULL::date[] AS recurrence_exceptions,
    NULL::uuid AS parent_event_id,
    NULL::character varying(500) AS location,
    NULL::numeric(10,8) AS location_lat,
    NULL::numeric(11,8) AS location_lng,
    NULL::character varying(20) AS status,
    NULL::boolean AS is_public,
    NULL::timestamp with time zone AS created_at,
    NULL::timestamp with time zone AS updated_at,
    NULL::timestamp with time zone AS deleted_at,
    NULL::character varying(100) AS event_type_name,
    NULL::character varying(7) AS event_type_color,
    NULL::uuid[] AS participant_ids,
    NULL::jsonb[] AS participants;

CREATE TABLE "Contact_catalog".interaction_types (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    icon character varying(50),
    color character varying(7),
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Contact_catalog".interactions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    contact_id uuid NOT NULL,
    interaction_type_id uuid,
    title character varying(255) NOT NULL,
    description text,
    quick_notes text,
    started_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    duration_minutes integer,
    location character varying(255),
    location_lat numeric(10,8),
    location_lng numeric(11,8),
    mood_before integer,
    mood_after integer,
    importance integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    embedding "Contact_catalog".vector(768),
    CONSTRAINT check_duration CHECK (((ended_at IS NULL) OR (ended_at >= started_at))),
    CONSTRAINT check_importance CHECK (((importance >= 1) AND (importance <= 3))),
    CONSTRAINT check_mood_after CHECK (((mood_after >= 1) AND (mood_after <= 5))),
    CONSTRAINT check_mood_before CHECK (((mood_before >= 1) AND (mood_before <= 5)))
);

CREATE TABLE "Contact_catalog".media (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    contact_id uuid,
    event_id uuid,
    interaction_id uuid,
    filename character varying(500) NOT NULL,
    original_filename character varying(500),
    file_path character varying(1000) NOT NULL,
    file_size bigint,
    mime_type character varying(100),
    storage_provider character varying(50) DEFAULT 'local'::character varying,
    title character varying(255),
    description text,
    width integer,
    height integer,
    duration_seconds integer,
    exif_data jsonb,
    is_private boolean DEFAULT false,
    access_token character varying(255),
    uploaded_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    taken_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT check_media_reference CHECK (((contact_id IS NOT NULL) OR (event_id IS NOT NULL) OR (interaction_id IS NOT NULL)))
);

CREATE TABLE "Contact_catalog".notes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    contact_id uuid,
    event_id uuid,
    interaction_id uuid,
    title character varying(255),
    content text NOT NULL,
    is_private boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    embedding "Contact_catalog".vector(768)
);

CREATE TABLE "Contact_catalog".notification_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    reminder_id uuid,
    channel character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    payload jsonb,
    sent_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    delivered_at timestamp with time zone,
    read_at timestamp with time zone,
    error_message text
);

CREATE TABLE "Contact_catalog".reminders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    contact_id uuid,
    event_id uuid,
    interaction_id uuid,
    title character varying(255) NOT NULL,
    description text,
    due_at timestamp with time zone NOT NULL,
    scheduled_at timestamp with time zone,
    is_recurring boolean DEFAULT false,
    recurrence_pattern character varying(500),
    recurrence_end_date date,
    notification_channels character varying(50)[] DEFAULT ARRAY['in_app'::character varying(50)],
    status character varying(20) DEFAULT 'pending'::character varying,
    snoozed_until timestamp with time zone,
    priority integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone,
    deleted_at timestamp with time zone,
    CONSTRAINT check_priority CHECK (((priority >= 1) AND (priority <= 3))),
    CONSTRAINT check_reminder_reference CHECK (((contact_id IS NOT NULL) OR (event_id IS NOT NULL)))
);

CREATE TABLE "Contact_catalog".tags (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    color character varying(7) DEFAULT '#3B82F6'::character varying,
    icon character varying(50),
    description text,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    scope character varying(20) DEFAULT 'both'::character varying
);

CREATE VIEW "Contact_catalog".upcoming_reminders AS
 SELECT r.id,
    r.user_id,
    r.contact_id,
    r.event_id,
    r.interaction_id,
    r.title,
    r.description,
    r.due_at,
    r.scheduled_at,
    r.is_recurring,
    r.recurrence_pattern,
    r.recurrence_end_date,
    r.notification_channels,
    r.status,
    r.snoozed_until,
    r.priority,
    r.created_at,
    r.updated_at,
    r.completed_at,
    r.deleted_at,
    c.first_name AS contact_first_name,
    c.last_name AS contact_last_name,
    c.avatar_url AS contact_avatar,
    e.title AS event_title,
    e.start_at AS event_start
   FROM (("Contact_catalog".reminders r
     LEFT JOIN "Contact_catalog".contacts c ON ((r.contact_id = c.id)))
     LEFT JOIN "Contact_catalog".events e ON ((r.event_id = e.id)))
  WHERE (((r.status)::text = 'pending'::text) AND (r.due_at > CURRENT_TIMESTAMP) AND ((r.snoozed_until IS NULL) OR (r.snoozed_until < CURRENT_TIMESTAMP)) AND (r.deleted_at IS NULL))
  ORDER BY r.due_at;

CREATE TABLE "Contact_catalog".users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(255) NOT NULL,
    username character varying(100),
    password_hash character varying(255) NOT NULL,
    email_verified boolean DEFAULT false,
    email_verification_token character varying(255),
    password_reset_token character varying(255),
    password_reset_expires_at timestamp with time zone,
    full_name character varying(255),
    avatar_url character varying(500),
    timezone character varying(50) DEFAULT 'UTC'::character varying,
    language character varying(10) DEFAULT 'ru'::character varying,
    settings jsonb DEFAULT '{"default_view": "list", "notifications": true, "privacy_level": "private"}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp with time zone,
    last_login_at timestamp with time zone,
    CONSTRAINT email_validation CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text))
);

ALTER TABLE ONLY "Contact_catalog".audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY "Contact_catalog".contact_relationships
    ADD CONSTRAINT contact_relationships_pkey PRIMARY KEY (id);

ALTER TABLE ONLY "Contact_catalog".contact_tags
    ADD CONSTRAINT contact_tags_pkey PRIMARY KEY (contact_id, tag_id);

ALTER TABLE ONLY "Contact_catalog".contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY "Contact_catalog".event_participants
    ADD CONSTRAINT event_participants_pkey PRIMARY KEY (id);

ALTER TABLE ONLY "Contact_catalog".event_tags
    ADD CONSTRAINT event_tags_pkey PRIMARY KEY (event_id, tag_id);

ALTER TABLE ONLY "Contact_catalog".event_types
    ADD CONSTRAINT event_types_pkey PRIMARY KEY (id);

ALTER TABLE ONLY "Contact_catalog".events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);

ALTER TABLE ONLY "Contact_catalog".interaction_types
    ADD CONSTRAINT interaction_types_pkey PRIMARY KEY (id);

ALTER TABLE ONLY "Contact_catalog".interactions
    ADD CONSTRAINT interactions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY "Contact_catalog".media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);

ALTER TABLE ONLY "Contact_catalog".notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY "Contact_catalog".notification_history
    ADD CONSTRAINT notification_history_pkey PRIMARY KEY (id);

ALTER TABLE ONLY "Contact_catalog".reminders
    ADD CONSTRAINT reminders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY "Contact_catalog".tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);

ALTER TABLE ONLY "Contact_catalog".users
    ADD CONSTRAINT users_email_key UNIQUE (email);

ALTER TABLE ONLY "Contact_catalog".users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY "Contact_catalog".users
    ADD CONSTRAINT users_username_key UNIQUE (username);

CREATE INDEX idx_active_contacts ON "Contact_catalog".contacts USING btree (user_id, updated_at) WHERE (deleted_at IS NULL);

CREATE INDEX idx_audit_created ON "Contact_catalog".audit_logs USING btree (created_at);

CREATE INDEX idx_audit_entity ON "Contact_catalog".audit_logs USING btree (entity_type, entity_id);

CREATE INDEX idx_audit_user ON "Contact_catalog".audit_logs USING btree (user_id);

CREATE INDEX idx_contact_rels_source ON "Contact_catalog".contact_relationships USING btree (source_contact_id);

CREATE INDEX idx_contact_rels_target ON "Contact_catalog".contact_relationships USING btree (target_contact_id);

CREATE INDEX idx_contact_rels_user ON "Contact_catalog".contact_relationships USING btree (user_id);

CREATE INDEX idx_contact_tags_contact ON "Contact_catalog".contact_tags USING btree (contact_id);

CREATE INDEX idx_contact_tags_tag ON "Contact_catalog".contact_tags USING btree (tag_id);

CREATE INDEX idx_contacts_birthday ON "Contact_catalog".contacts USING btree (EXTRACT(month FROM date_of_birth), EXTRACT(day FROM date_of_birth));

CREATE INDEX idx_contacts_city ON "Contact_catalog".contacts USING btree (user_id, city);

CREATE INDEX idx_contacts_email ON "Contact_catalog".contacts USING btree (user_id, email);

CREATE INDEX idx_contacts_embedding ON "Contact_catalog".contacts USING ivfflat (embedding "Contact_catalog".vector_cosine_ops) WITH (lists='100');

CREATE INDEX idx_contacts_last_interaction ON "Contact_catalog".contacts USING btree (user_id, last_interaction_date);

CREATE INDEX idx_contacts_last_interaction_date ON "Contact_catalog".contacts USING btree (last_interaction_date) WHERE (deleted_at IS NULL);

CREATE INDEX idx_contacts_name ON "Contact_catalog".contacts USING btree (user_id, first_name, last_name);

CREATE INDEX idx_contacts_phone ON "Contact_catalog".contacts USING btree (user_id, phone);

CREATE INDEX idx_contacts_relationship ON "Contact_catalog".contacts USING btree (user_id, relationship_type);

CREATE INDEX idx_contacts_relationship_type ON "Contact_catalog".contacts USING btree (relationship_type);

CREATE INDEX idx_contacts_search ON "Contact_catalog".contacts USING gin (to_tsvector('russian'::regconfig, (((((((((((COALESCE(first_name, ''::character varying))::text || ' '::text) || (COALESCE(last_name, ''::character varying))::text) || ' '::text) || (COALESCE(nickname, ''::character varying))::text) || ' '::text) || (COALESCE(email, ''::character varying))::text) || ' '::text) || (COALESCE(company, ''::character varying))::text) || ' '::text) || (COALESCE(job_title, ''::character varying))::text)));

CREATE INDEX idx_contacts_search_gin ON "Contact_catalog".contacts USING gin (to_tsvector('russian'::regconfig, (((((((((((COALESCE(first_name, ''::character varying))::text || ' '::text) || (COALESCE(last_name, ''::character varying))::text) || ' '::text) || (COALESCE(nickname, ''::character varying))::text) || ' '::text) || (COALESCE(email, ''::character varying))::text) || ' '::text) || (COALESCE(company, ''::character varying))::text) || ' '::text) || (COALESCE(job_title, ''::character varying))::text)));

CREATE INDEX idx_contacts_user ON "Contact_catalog".contacts USING btree (user_id);

CREATE INDEX idx_event_participants_contact ON "Contact_catalog".event_participants USING btree (contact_id);

CREATE INDEX idx_event_participants_event ON "Contact_catalog".event_participants USING btree (event_id);

CREATE UNIQUE INDEX idx_event_participants_event_contact ON "Contact_catalog".event_participants USING btree (event_id, contact_id);

CREATE INDEX idx_event_participants_user ON "Contact_catalog".event_participants USING btree (user_id);

CREATE INDEX idx_event_tags_event ON "Contact_catalog".event_tags USING btree (event_id);

CREATE INDEX idx_event_tags_tag ON "Contact_catalog".event_tags USING btree (tag_id);

CREATE INDEX idx_event_types_user ON "Contact_catalog".event_types USING btree (user_id);

CREATE UNIQUE INDEX idx_event_types_user_name ON "Contact_catalog".event_types USING btree (user_id, name);

CREATE INDEX idx_events_date ON "Contact_catalog".events USING btree (user_id, start_at);

CREATE INDEX idx_events_recurring ON "Contact_catalog".events USING btree (is_recurring, start_at);

CREATE INDEX idx_events_recurring_dates ON "Contact_catalog".events USING btree (user_id, start_at) WHERE ((is_recurring = true) AND (deleted_at IS NULL));

CREATE INDEX idx_events_search ON "Contact_catalog".events USING gin (to_tsvector('russian'::regconfig, (((title)::text || ' '::text) || COALESCE(description, ''::text))));

CREATE INDEX idx_events_type ON "Contact_catalog".events USING btree (event_type_id);

CREATE INDEX idx_events_user ON "Contact_catalog".events USING btree (user_id);

CREATE INDEX idx_interaction_types_user ON "Contact_catalog".interaction_types USING btree (user_id);

CREATE UNIQUE INDEX idx_interaction_types_user_name ON "Contact_catalog".interaction_types USING btree (user_id, name);

CREATE INDEX idx_interactions_contact ON "Contact_catalog".interactions USING btree (contact_id);

CREATE INDEX idx_interactions_date ON "Contact_catalog".interactions USING btree (user_id, started_at);

CREATE INDEX idx_interactions_search ON "Contact_catalog".interactions USING gin (to_tsvector('russian'::regconfig, (((((title)::text || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || COALESCE(quick_notes, ''::text))));

CREATE INDEX idx_interactions_type ON "Contact_catalog".interactions USING btree (interaction_type_id);

CREATE INDEX idx_interactions_user ON "Contact_catalog".interactions USING btree (user_id);

CREATE INDEX idx_media_contact ON "Contact_catalog".media USING btree (contact_id);

CREATE INDEX idx_media_event ON "Contact_catalog".media USING btree (event_id);

CREATE INDEX idx_media_uploaded ON "Contact_catalog".media USING btree (uploaded_at);

CREATE INDEX idx_media_user ON "Contact_catalog".media USING btree (user_id);

CREATE INDEX idx_notes_contact ON "Contact_catalog".notes USING btree (contact_id);

CREATE INDEX idx_notes_created ON "Contact_catalog".notes USING btree (created_at);

CREATE INDEX idx_notes_user ON "Contact_catalog".notes USING btree (user_id);

CREATE INDEX idx_notification_history_reminder ON "Contact_catalog".notification_history USING btree (reminder_id);

CREATE INDEX idx_notification_history_sent ON "Contact_catalog".notification_history USING btree (sent_at);

CREATE INDEX idx_notification_history_user ON "Contact_catalog".notification_history USING btree (user_id);

CREATE INDEX idx_pending_reminders ON "Contact_catalog".reminders USING btree (user_id, due_at) WHERE (((status)::text = 'pending'::text) AND (deleted_at IS NULL));

CREATE INDEX idx_reminders_contact ON "Contact_catalog".reminders USING btree (contact_id);

CREATE INDEX idx_reminders_deleted ON "Contact_catalog".reminders USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);

CREATE INDEX idx_reminders_due ON "Contact_catalog".reminders USING btree (user_id, due_at, status);

CREATE INDEX idx_reminders_event ON "Contact_catalog".reminders USING btree (event_id);

CREATE INDEX idx_reminders_user ON "Contact_catalog".reminders USING btree (user_id);

CREATE INDEX idx_tags_user ON "Contact_catalog".tags USING btree (user_id);

CREATE UNIQUE INDEX idx_tags_user_name ON "Contact_catalog".tags USING btree (user_id, name);

CREATE UNIQUE INDEX idx_unique_contact_relationship ON "Contact_catalog".contact_relationships USING btree (user_id, source_contact_id, target_contact_id, relationship_type);

CREATE OR REPLACE VIEW "Contact_catalog".contacts_extended AS
 SELECT c.id,
    c.user_id,
    c.first_name,
    c.last_name,
    c.middle_name,
    c.nickname,
    c.email,
    c.phone,
    c.phone_secondary,
    c.website,
    c.gender,
    c.date_of_birth,
    c.country,
    c.city,
    c.address,
    c.postal_code,
    c.company,
    c.job_title,
    c.department,
    c.relationship_type,
    c.relationship_level,
    c.trust_level,
    c.how_we_met,
    c.met_date,
    c.met_location,
    c.personal_notes,
    c.interests,
    c.important_facts,
    c.avatar_url,
    c.last_interaction_date,
    c.total_interactions,
    c.created_at,
    c.updated_at,
    c.deleted_at,
    array_agg(DISTINCT t.name) FILTER (WHERE (t.name IS NOT NULL)) AS tags,
    count(DISTINCT i.id) AS total_interactions_count,
    max(i.started_at) AS last_interaction_date_actual,
    array_agg(DISTINCT et.name) FILTER (WHERE (et.name IS NOT NULL)) AS event_types
   FROM (((((("Contact_catalog".contacts c
     LEFT JOIN "Contact_catalog".contact_tags ct ON ((c.id = ct.contact_id)))
     LEFT JOIN "Contact_catalog".tags t ON ((ct.tag_id = t.id)))
     LEFT JOIN "Contact_catalog".interactions i ON ((c.id = i.contact_id)))
     LEFT JOIN "Contact_catalog".event_participants ep ON ((c.id = ep.contact_id)))
     LEFT JOIN "Contact_catalog".events e ON ((ep.event_id = e.id)))
     LEFT JOIN "Contact_catalog".event_types et ON ((e.event_type_id = et.id)))
  WHERE (c.deleted_at IS NULL)
  GROUP BY c.id;

CREATE OR REPLACE VIEW "Contact_catalog".events_with_participants AS
 SELECT e.id,
    e.user_id,
    e.event_type_id,
    e.title,
    e.description,
    e.start_at,
    e.end_at,
    e.is_all_day,
    e.timezone,
    e.is_recurring,
    e.recurrence_rule,
    e.recurrence_exceptions,
    e.parent_event_id,
    e.location,
    e.location_lat,
    e.location_lng,
    e.status,
    e.is_public,
    e.created_at,
    e.updated_at,
    e.deleted_at,
    et.name AS event_type_name,
    et.color AS event_type_color,
    array_agg(DISTINCT c.id) AS participant_ids,
    array_agg(DISTINCT jsonb_build_object('id', c.id, 'name', (((c.first_name)::text || ' '::text) || (COALESCE(c.last_name, ''::character varying))::text), 'avatar', c.avatar_url)) AS participants
   FROM ((("Contact_catalog".events e
     LEFT JOIN "Contact_catalog".event_types et ON ((e.event_type_id = et.id)))
     LEFT JOIN "Contact_catalog".event_participants ep ON ((e.id = ep.event_id)))
     LEFT JOIN "Contact_catalog".contacts c ON ((ep.contact_id = c.id)))
  WHERE (e.deleted_at IS NULL)
  GROUP BY e.id, et.id;

CREATE TRIGGER after_interaction_insert AFTER INSERT ON "Contact_catalog".interactions FOR EACH ROW EXECUTE FUNCTION "Contact_catalog".update_contact_last_interaction();

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON "Contact_catalog".contacts FOR EACH ROW EXECUTE FUNCTION "Contact_catalog".update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON "Contact_catalog".events FOR EACH ROW EXECUTE FUNCTION "Contact_catalog".update_updated_at_column();

CREATE TRIGGER update_interactions_updated_at BEFORE UPDATE ON "Contact_catalog".interactions FOR EACH ROW EXECUTE FUNCTION "Contact_catalog".update_updated_at_column();

CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON "Contact_catalog".notes FOR EACH ROW EXECUTE FUNCTION "Contact_catalog".update_updated_at_column();

CREATE TRIGGER update_reminders_updated_at BEFORE UPDATE ON "Contact_catalog".reminders FOR EACH ROW EXECUTE FUNCTION "Contact_catalog".update_updated_at_column();

ALTER TABLE ONLY "Contact_catalog".audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES "Contact_catalog".users(id) ON DELETE SET NULL;

ALTER TABLE ONLY "Contact_catalog".contact_relationships
    ADD CONSTRAINT contact_relationships_source_contact_id_fkey FOREIGN KEY (source_contact_id) REFERENCES "Contact_catalog".contacts(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".contact_relationships
    ADD CONSTRAINT contact_relationships_target_contact_id_fkey FOREIGN KEY (target_contact_id) REFERENCES "Contact_catalog".contacts(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".contact_relationships
    ADD CONSTRAINT contact_relationships_user_id_fkey FOREIGN KEY (user_id) REFERENCES "Contact_catalog".users(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".contact_tags
    ADD CONSTRAINT contact_tags_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES "Contact_catalog".contacts(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".contact_tags
    ADD CONSTRAINT contact_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES "Contact_catalog".tags(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".contacts
    ADD CONSTRAINT contacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES "Contact_catalog".users(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".event_participants
    ADD CONSTRAINT event_participants_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES "Contact_catalog".contacts(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".event_participants
    ADD CONSTRAINT event_participants_event_id_fkey FOREIGN KEY (event_id) REFERENCES "Contact_catalog".events(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".event_participants
    ADD CONSTRAINT event_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES "Contact_catalog".users(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".event_tags
    ADD CONSTRAINT event_tags_event_id_fkey FOREIGN KEY (event_id) REFERENCES "Contact_catalog".events(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".event_tags
    ADD CONSTRAINT event_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES "Contact_catalog".tags(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".event_types
    ADD CONSTRAINT event_types_user_id_fkey FOREIGN KEY (user_id) REFERENCES "Contact_catalog".users(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".events
    ADD CONSTRAINT events_event_type_id_fkey FOREIGN KEY (event_type_id) REFERENCES "Contact_catalog".event_types(id) ON DELETE SET NULL;

ALTER TABLE ONLY "Contact_catalog".events
    ADD CONSTRAINT events_parent_event_id_fkey FOREIGN KEY (parent_event_id) REFERENCES "Contact_catalog".events(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".events
    ADD CONSTRAINT events_user_id_fkey FOREIGN KEY (user_id) REFERENCES "Contact_catalog".users(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".notes
    ADD CONSTRAINT fk_notes_event FOREIGN KEY (event_id) REFERENCES "Contact_catalog".events(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".interaction_types
    ADD CONSTRAINT interaction_types_user_id_fkey FOREIGN KEY (user_id) REFERENCES "Contact_catalog".users(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".interactions
    ADD CONSTRAINT interactions_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES "Contact_catalog".contacts(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".interactions
    ADD CONSTRAINT interactions_interaction_type_id_fkey FOREIGN KEY (interaction_type_id) REFERENCES "Contact_catalog".interaction_types(id) ON DELETE SET NULL;

ALTER TABLE ONLY "Contact_catalog".interactions
    ADD CONSTRAINT interactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES "Contact_catalog".users(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".media
    ADD CONSTRAINT media_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES "Contact_catalog".contacts(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".media
    ADD CONSTRAINT media_event_id_fkey FOREIGN KEY (event_id) REFERENCES "Contact_catalog".events(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".media
    ADD CONSTRAINT media_interaction_id_fkey FOREIGN KEY (interaction_id) REFERENCES "Contact_catalog".interactions(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".media
    ADD CONSTRAINT media_user_id_fkey FOREIGN KEY (user_id) REFERENCES "Contact_catalog".users(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".notes
    ADD CONSTRAINT notes_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES "Contact_catalog".contacts(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".notes
    ADD CONSTRAINT notes_interaction_id_fkey FOREIGN KEY (interaction_id) REFERENCES "Contact_catalog".interactions(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".notes
    ADD CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES "Contact_catalog".users(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".notification_history
    ADD CONSTRAINT notification_history_reminder_id_fkey FOREIGN KEY (reminder_id) REFERENCES "Contact_catalog".reminders(id) ON DELETE SET NULL;

ALTER TABLE ONLY "Contact_catalog".notification_history
    ADD CONSTRAINT notification_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES "Contact_catalog".users(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".reminders
    ADD CONSTRAINT reminders_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES "Contact_catalog".contacts(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".reminders
    ADD CONSTRAINT reminders_event_id_fkey FOREIGN KEY (event_id) REFERENCES "Contact_catalog".events(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".reminders
    ADD CONSTRAINT reminders_interaction_id_fkey FOREIGN KEY (interaction_id) REFERENCES "Contact_catalog".interactions(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".reminders
    ADD CONSTRAINT reminders_user_id_fkey FOREIGN KEY (user_id) REFERENCES "Contact_catalog".users(id) ON DELETE CASCADE;

ALTER TABLE ONLY "Contact_catalog".tags
    ADD CONSTRAINT tags_user_id_fkey FOREIGN KEY (user_id) REFERENCES "Contact_catalog".users(id) ON DELETE CASCADE;
