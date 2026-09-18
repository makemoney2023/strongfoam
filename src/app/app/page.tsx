import { redirect } from "next/navigation";
import { getOpsSession } from "@/lib/ops/auth";

export default async function OpsHomePage() {
  redirect((await getOpsSession()) ? "/app/requests" : "/app/login");
}
