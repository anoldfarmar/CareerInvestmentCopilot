-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "customTargetDirection" TEXT,
ADD COLUMN     "subscriptionPlan" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "targetDirections" JSONB;
