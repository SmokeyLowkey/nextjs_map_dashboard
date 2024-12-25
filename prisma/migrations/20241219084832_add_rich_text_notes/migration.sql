-- First, create a temporary column for Department notes
ALTER TABLE "Department" ADD COLUMN "temp_notes" JSONB DEFAULT '{}';

-- Copy existing notes data to JSON format
UPDATE "Department" 
SET "temp_notes" = CASE 
  WHEN "notes" IS NOT NULL THEN jsonb_build_object('content', "notes")
  ELSE '{}'::jsonb
END;

-- Drop the old notes column and rename the temporary one
ALTER TABLE "Department" DROP COLUMN "notes";
ALTER TABLE "Department" RENAME COLUMN "temp_notes" TO "notes";

-- Add notes column to Contact
ALTER TABLE "Contact" ADD COLUMN "notes" JSONB DEFAULT '{}';

-- Update email format for all contacts
UPDATE "Contact"
SET "email" = LOWER(
  CONCAT(
    LEFT(SPLIT_PART("name", ' ', 1), 1),
    SPLIT_PART("name", ' ', -1),
    '@brandt.ca'
  )
)
WHERE "name" IS NOT NULL;

-- Create index on departmentId
CREATE INDEX "Contact_departmentId_idx" ON "Contact"("departmentId");
