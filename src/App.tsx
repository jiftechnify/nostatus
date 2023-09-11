import { NostrEvent, NostrFetcher } from "nostr-fetch";
import { useEffect, useState } from "react";
import { VList } from "virtua";
import { css } from "../styled-system/css";
import { vstack } from "../styled-system/patterns";
import { UserStatus } from "./components/UserStatus";

const relays = ["wss://relay.nostr.band", "wss://relayable.org"];

const fetcher = NostrFetcher.init();

const fetchUserStatusEvents = () =>
  fetcher.fetchLatestEvents(relays, { kinds: [30315] }, 50);

function App() {
  const [events, setEvents] = useState<NostrEvent[]>([]);

  useEffect(() => {
    fetchUserStatusEvents()
      .then((evs) => {
        const filtered = evs.filter((ev) => ev.content.trim() !== "");
        setEvents(filtered);
        console.log(
          filtered.map((ev) => {
            return { status: ev.content, at: ev.created_at };
          })
        );
      })
      .catch((err) => console.error(err));
  }, []);

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
          {events.length !== 0 ? (
            events.map((ev) => (
              <div
                key={ev.id}
                className={css({ w: "600px", mx: "auto", mb: "2" })}
              >
                <UserStatus event={ev} />
              </div>
            ))
          ) : (
            <p className={css({ textAlign: "center" })}>Now Loading...</p>
          )}
        </VList>
      </main>
    </div>
  );
}

export default App;
