import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { listStaff } from "./families";
import { staffProfile } from "./staff-profile";

export async function listStaffProfiles() {
  const staff = await listStaff();
  if (!staff.length) return [];
  const client = await clerkClient();
  const users: Awaited<ReturnType<typeof client.users.getUserList>>["data"] = [];
  for (let i = 0; i < staff.length; i += 100) {
    const result = await client.users.getUserList({ userId: staff.slice(i, i + 100).map((item) => item.subject), limit: 100 });
    users.push(...result.data);
  }
  return staff.map((item) => staffProfile(item, users.find((entry) => entry.id === item.subject)));
}
