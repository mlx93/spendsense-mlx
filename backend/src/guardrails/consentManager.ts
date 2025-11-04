// Consent management per Reqs PRD Section 6.1

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function checkConsent(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { consent_status: true },
  });

  return user?.consent_status || false;
}

export async function updateConsent(
  userId: string,
  consentStatus: boolean
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      consent_status: consentStatus,
      consent_date: consentStatus ? new Date() : null,
    },
  });

  // If consent revoked, clear all active recommendations
  if (!consentStatus) {
    await prisma.recommendation.updateMany({
      where: {
        user_id: userId,
        status: 'active',
      },
      data: {
        status: 'hidden',
      },
    });
  }
}
