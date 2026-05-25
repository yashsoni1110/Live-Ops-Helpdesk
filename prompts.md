# My Prompts & Coding Notes

These are the raw questions and notes I wrote down while pair-programming with the AI to figure out the concurrency locks, WebSocket event flows, and React state syncs. 

---

## 1. Figuring out how to do the ticket locks (rooms vs maps)

**My query to the AI:**
> "Hey, I'm building a live support ticket dashboard for a dispatch room where agents keep opening the same ticket and overwriting each other's updates. I want to build a real-time 'pessimistic lock' system using Socket.io. 
>
> Basically, the moment Agent A clicks 'Edit' on a ticket, it should instantly lock for Agent B, turn gray on their screen, show a padlock, and disable their edit button. 
> 
> What's the cleanest way to structure this on the backend Express server? I want to avoid database read/write locks for the active lock states since they are super temporary and highly volatile. Should I just use dynamic Socket.io rooms for each ticket (like joining dynamic rooms) or is that overkill? How do I clean it up if a socket connection drops out of nowhere?"

**What we ended up doing:**
After talking it over, dynamically joining/leaving rooms for hundreds of tickets is way too heavy since agents on the dashboard need to see lock statuses of *all* tickets at once. We went with a simple in-memory Javascript `Map` on the server (`locks: ticketId -> agentSession`). Whenever a lock is acquired or released, we broadcast the event globally to all active sockets so the board stays perfectly in sync. If a socket drops, the backend loops through the `locks` Map, deletes any keys held by that socket, and broadcasts the releases.

---

## 2. React strict mode double-firing connection bug

**My query to the AI:**
> "I'm setting up my WebSocket event listeners inside a React hook using `useEffect`. However, due to React Strict Mode double-mounting components in development, my event listeners are registering twice. Whenever a ticket updates, the lock toasts and animations fire twice on my screen.
> 
> I want to write a clean teardown loop. In the `useEffect` cleanup function (the return block), I should run `socket.off('event_name')` for every event we registered. This way, when React unmounts or double-fires the effect, it cleanly wipes the old bound listeners before binding the new ones. 
> 
> Can you double-check if running `.off()` on named socket events inside the unmount return block is the correct standard pattern to completely eliminate duplicates?"

**What we ended up doing:**
We confirmed that separating the socket connection itself (keeping it as a persistent singleton) from the specific event handlers is the way to go. We created named callbacks inside `useSocketEvents.js` and cleanly detached only those specific callbacks using `.off()` inside the cleanup return function. This stops listener stacking completely without having to violently disconnect the entire WebSocket tunnel on every re-render.

---

## 3. Session rehydration and dealing with React stale closures

**My query to the AI:**
> "I want to make sure that when an agent refreshes their page, they don't get kicked back to the login modal or lose their active socket connection. I've set up `localStorage` to save the agent profile, which works. 
> 
> But inside my socket event listeners, I have a stale closure bug: because `useEffect` binds the listeners once on mount, they capture the initial `null` value of `currentAgent`. When the socket reconnects or the server restarts, it emits a `join` event with `null`.
> 
> I tried putting `currentAgent` in the `useEffect` dependency array so the hook re-runs and re-binds whenever the agent changes. But that caused a huge mess: the socket keeps disconnecting and reconnecting on every state update!
> 
> So I thought of a different approach: what if I keep the socket hook dependencies empty so it binds only once, but I store `currentAgent` in a mutable React `useRef` that gets synced on every render? Since references are mutable objects that bypass closure snapshots, the socket callbacks can read directly from the ref and always get the freshest hydrated session. Does this logic make sense to solve the stale closure without hook tearing?"

**What we ended up doing:**
We implemented the mutable `useRef` sync trick. Every render updates `currentAgentRef.current = currentAgent`, and our socket connection handler reads directly from the ref. This completely solved the stale closure reconnect issue while keeping the listener bindings rock-solid and static.

---

## 4. Quick reload crashes (the "Ghost Socket" key collision)

**My query to the AI:**
> "I'm hitting a weird runtime crash during multi-agent testing. When an agent refreshes their browser, the server registers their new socket connection *before* it fully detects that their old socket disconnected (which takes 1 to 2 seconds for the heartbeat timeout).
> 
> As a result, during that brief 1-2 second overlap, our online agents list temporarily has two instances of the same `agentId` but with different `socketId`s. Because my React presence component uses `key={agent.agentId}` in the `.map()`, this duplicate key causes the React reconciler to crash with a duplicate key error!
> 
> I want to change the list keys. Since each socket connection is unique, if I use `key={agent.socketId || agent.agentId}`, it will cleanly treat the new connection as a temporary adjacent element instead of a collision, preventing the crash. 
> 
> Does this solve the ghost socket collision issue without breaking standard React listing keys?"

**What we ended up doing:**
We swapped the React map rendering key in `AgentPresence.jsx` to use `agent.socketId || agent.agentId`. This ensures that even when duplicate agent records temporarily exist during rapid refreshes, they map to unique DOM keys, preventing crashes completely.

---

## 5. Network latency lock-theft prevention

**My query to the AI:**
> "I've spotted a critical race condition. If Agent A makes edits and clicks 'Save', the client immediately triggers a save and releases the lock. 
> 
> But if there is network latency, the 'unlock' event might arrive at the server *before* the server finishes saving the database updates. In that split second, Agent B could lock the ticket, open their editor, and get loaded with stale data. When Agent A's save eventually arrives, it will overwrite Agent B's locks or new edits!
> 
> To solve this, my logic is: I want the client to emit the save request, wait for the server to acknowledge that the save has completed successfully, and only *after* the acknowledgment is received, trigger the lock release. 
> 
> How can I configure Socket.io's acknowledgment callbacks on the server to make sure the client only emits the unlock event after the backend confirms the update is complete?"

**What we ended up doing:**
We refactored the save process to use Socket.io callbacks. The server handles `update_ticket`, performs the in-memory write, and then fires a callback response to the client. The client waits for this confirmation inside the edit panel, and only emits the `unlock_ticket` trigger *after* the callback runs, successfully locking out any latency-driven data overwrite gaps.
