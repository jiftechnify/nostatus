import { VList } from "virtua";
import { css } from "../styled-system/css";
import { vstack } from "../styled-system/patterns";
import { UserStatusCard } from "./components/UserStatus";
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
        gap: "6",
      })}
    >
      <header className={css({ lineHeight: "tight", textAlign: "center" })}>
        <h1 className={css({ fontSize: "4xl", fontWeight: "bold" })}>
          nostatus
        </h1>
        <p className={css({ fontSize: "sm", color: "gray.500" })}>
          Have an eye on your friends' status.
        </p>
      </header>
      <main style={{ height: "100%", width: "100vw" }}>
        <VList>
          {userStatues.length !== 0 ? (
            userStatues.map((status) => {
              const profile = profileMap.get(status.pubkey) ?? {
                pubkey: status.pubkey,
              };
              return (
                <div
                  key={status.pubkey}
                  className={css({ w: "600px", mx: "auto", mb: "3" })}
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
