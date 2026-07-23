import { getChatGPTUser } from "./chatgpt-auth";
import { HermesConsole } from "./HermesConsole";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();

  return (
    <HermesConsole
      viewer={
        user
          ? {
              email: user.email,
              name: user.name ?? user.email,
            }
          : null
      }
    />
  );
}
