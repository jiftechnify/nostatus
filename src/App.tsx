import { css } from "../styled-system/css";
import { vstack } from "../styled-system/patterns";
import { LoginForm } from "./components/LoginForm";
import { UserStatusList } from "./components/UserStatusList";
import { useCachedPubkey } from "./nostr";

function App() {
  const { pubkey, savePubkey } = useCachedPubkey();

  const onLogin = (pubkey: string) => {
    savePubkey(pubkey);
  };

  return (
    <div
      className={vstack({
        h: "100vh",
        pt: "4",
        gap: "4",
      })}
    >
      <header className={css({ lineHeight: "tight", textAlign: "center" })}>
        <h1 className={css({ textStyle: "title" })}>nostatus</h1>
        <p className={css({ textStyle: "tagline", color: "gray.500" })}>
          Have an eye on your friends' status.
        </p>
      </header>
      <main className={css({ h: "100%", w: "100vw", pt: "2", pb: "4" })}>
        {pubkey !== undefined ? (
          <UserStatusList userPubkey={pubkey} />
        ) : (
          <LoginForm onLogin={onLogin} />
        )}
      </main>
    </div>
  );
}

export default App;
