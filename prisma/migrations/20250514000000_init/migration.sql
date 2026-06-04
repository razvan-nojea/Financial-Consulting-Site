-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('confirmed', 'pending', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "services" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" VARCHAR(50) NOT NULL,
    "ownerEmail" VARCHAR(255) NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "time" VARCHAR(5) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'pending',
    "clientName" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(30) NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" VARCHAR(10) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "services_name_key" ON "services"("name");

-- CreateIndex
CREATE INDEX "appointments_ownerEmail_idx" ON "appointments"("ownerEmail");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
