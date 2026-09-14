import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ReviewPanel from "./review-panel";
export const dynamic = "force-dynamic";
export default async function ReviewPage() { if (!(await cookies()).get("wd_session")) redirect("/"); return <ReviewPanel />; }
