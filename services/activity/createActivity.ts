import { prisma } from "@/core/database/prisma";

type CreateActivityInput = {
  identifierId: string;
  projectId: string;
  ip?: string;
  userAgent?: string;
  pageUrl: string;
  referral?: string;
};

export async function createActivity(data: CreateActivityInput) {
  return prisma.activity.create({
    data: {
      identifierId: data.identifierId,
      projectId: data.projectId,
      ip: data.ip ?? null,
      userAgent: data.userAgent ?? null,
      pageUrl: data.pageUrl,
      referral: data.referral ?? null,
    },
  });
}