DO $$ BEGIN
  CREATE TYPE "ProjectStatus" AS ENUM ('active', 'completed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProjectShareRole" AS ENUM ('viewer', 'editor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "projects" (
  "id" TEXT NOT NULL,
  "organization_id" TEXT NOT NULL,
  "owner_user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "start_date" TIMESTAMP(3),
  "end_date" TIMESTAMP(3),
  "status" "ProjectStatus" NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "projects_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "projects_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "projects_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "project_shares" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "role" "ProjectShareRole" NOT NULL DEFAULT 'editor',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_shares_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_shares_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "projects_organization_id_owner_user_id_idx" ON "projects"("organization_id", "owner_user_id");
CREATE INDEX IF NOT EXISTS "projects_organization_id_status_idx" ON "projects"("organization_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "project_shares_project_id_user_id_key" ON "project_shares"("project_id", "user_id");
CREATE INDEX IF NOT EXISTS "project_shares_user_id_idx" ON "project_shares"("user_id");
