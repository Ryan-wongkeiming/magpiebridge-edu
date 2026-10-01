-- AlterTable
ALTER TABLE "LessonProgress" ADD COLUMN     "acknowledgedAt" TIMESTAMP(3),
ADD COLUMN     "durationSeconds" INTEGER,
ADD COLUMN     "watchedSeconds" INTEGER NOT NULL DEFAULT 0;
