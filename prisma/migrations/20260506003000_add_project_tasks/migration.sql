DO $$ BEGIN
  CREATE TYPE "ProjectTaskStatus" AS ENUM ('open', 'done');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "project_tasks" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "assigned_user_id" TEXT,
  "title" TEXT NOT NULL,
  "status" "ProjectTaskStatus" NOT NULL DEFAULT 'open',
  "due_date" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "project_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "project_tasks_assigned_user_id_fkey" FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "project_tasks_project_id_status_idx" ON "project_tasks"("project_id", "status");
CREATE INDEX IF NOT EXISTS "project_tasks_assigned_user_id_idx" ON "project_tasks"("assigned_user_id");
