import { cookies } from "next/headers";
import Workspace from "./workspace";
import Login from "./login";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = (await cookies()).get("wd_session")?.value;
  return session ? <Workspace /> : <Login />;
}
