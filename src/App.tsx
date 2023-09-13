import { VList } from "virtua";
import { css } from "../styled-system/css";
import { vstack } from "../styled-system/patterns";
import { UserStatusCard } from "./components/UserStatusCard";
import { useFollowingsStatuses } from "./nostr";

const pubkey =
  "d1d1747115d16751a97c239f46ec1703292c3b7e9988b9ebdd4ec4705b15ed44";

function App() {
  const { profileMap, userStatues } = useFollowingsStatuses(pubkey);

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
        <VList>
          {userStatues.length !== 0 ? (
            userStatues.map((status) => {
              const profile = profileMap.get(status.pubkey) ?? {
                pubkey: status.pubkey,
              };
              return (
                <div
                  key={status.pubkey}
                  className={css({
                    w: "600px",
                    mx: "auto",
                    mb: "2",
                  })}
                >
                  <UserStatusCard profile={profile} status={status} />
                </div>
              );
            })
          ) : (
            <p className={css({ textAlign: "center" })}>Now Loading...</p>
          )}
        </VList>
      </main>
    </div>
  );
}

export default App;
