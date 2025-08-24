#!/bin/bash

# Script to fix production database migrations
# This will mark failed migrations as resolved

echo "Fixing production database migrations..."

# Set the production DATABASE_URL
export DATABASE_URL="postgresql://neondb_owner:npg_q7N1owMIiWnp@ep-lingering-sun-abx8zkr7-pooler.eu-west-2.aws.neon.tech/newskoopdb?sslmode=require&channel_binding=require"

# Mark the failed migrations as applied since the schema already exists
echo "Marking failed migrations as applied..."

npx prisma migrate resolve --applied "20250129000000_remove_audio_description"
npx prisma migrate resolve --applied "20250129000001_add_email_tracking"
npx prisma migrate resolve --applied "20250619101734_init"
npx prisma migrate resolve --applied "20250619133037_rename_require_password_change"
npx prisma migrate resolve --applied "20250620102039_add_newsroom_models"
npx prisma migrate resolve --applied "20250620103101_add_newsroom_models"
npx prisma migrate resolve --applied "20250701232403_add_task_system"
npx prisma migrate resolve --applied "20250702134252_update_workflow_system"
npx prisma migrate resolve --applied "20250702141741_re_add_task_system"
npx prisma migrate resolve --applied "20250703230816_remove_task_system"
npx prisma migrate resolve --applied "20250703231609_remove_story_summary"
npx prisma migrate resolve --applied "20250703232238_remove_language_and_religious_filter"
npx prisma migrate resolve --applied "20250704135541_add_pending_approval_status"
npx prisma migrate resolve --applied "20250704211726_add_category_to_comments"
npx prisma migrate resolve --applied "20250704224404_add_tag_categories"
npx prisma migrate resolve --applied "20250704224449_"
npx prisma migrate resolve --applied "20250705064610_add_translation_workflow"
npx prisma migrate resolve --applied "20250705065149_remove_needs_journalist_review"
npx prisma migrate resolve --applied "20250705084048_make_category_optional"
npx prisma migrate resolve --applied "20250724215343_add_followup_to_story"
npx prisma migrate resolve --applied "20250724224543_remove_single_translation_language"
npx prisma migrate resolve --applied "20250728214524_simplify_translation_fields"

echo "Checking migration status..."
npx prisma migrate status

echo "Done!"