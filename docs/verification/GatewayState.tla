--------------------------- MODULE GatewayState ---------------------------
EXTENDS Integers, Sequences, FiniteSets

(***************************************************************************
 * Formal Verification for ZERO Gateway State Management
 * 
 * This specification models the concurrency and state transitions within the
 * Gateway, specifically focusing on session management and agent execution
 * sequences to ensure mutual exclusion and prevent race conditions.
 ***************************************************************************)

VARIABLES
    agentRunSeq,        \* Map[AgentID -> SeqNumber]
    chatRunRegistry,    \* Set of active SessionIDs
    pc,                 \* Program counter for each process
    lock                \* Global mutex for critical sections

VARS == <<agentRunSeq, chatRunRegistry, pc, lock>>

Agents == {"agent_1", "agent_2"}
Sessions == {"session_a", "session_b"}

Init ==
    /\ agentRunSeq = [a \in Agents |-> 0]
    /\ chatRunRegistry = {}
    /\ pc = [a \in Agents |-> "Idle"]
    /\ lock = FALSE

(***************************************************************************
 * Actions
 ***************************************************************************)

\* Agent requests a new execution sequence
RequestSeq(a) ==
    /\ pc[a] = "Idle"
    /\ lock = FALSE
    /\ lock' = TRUE
    /\ agentRunSeq' = [agentRunSeq EXCEPT ![a] = agentRunSeq[a] + 1]
    /\ pc' = [pc EXCEPT ![a] = "UpdatingRegistry"]
    /\ UNCHANGED <<chatRunRegistry>>

\* Agent updates the chat registry for a session
UpdateRegistry(a, s) ==
    /\ pc[a] = "UpdatingRegistry"
    /\ chatRunRegistry' = chatRunRegistry \cup {s}
    /\ pc' = [pc EXCEPT ![a] = "ReleasingLock"]
    /\ UNCHANGED <<agentRunSeq, lock>>

\* Agent releases the mutex
ReleaseLock(a) ==
    /\ pc[a] = "ReleasingLock"
    /\ lock' = FALSE
    /\ pc' = [pc EXCEPT ![a] = "Idle"]
    /\ UNCHANGED <<agentRunSeq, chatRunRegistry>>

Spec == Init /\ [][Next]_VARS /\ WF_VARS(Next)


Next == \E a \in Agents : 
            \E s \in Sessions :
                RequestSeq(a) \/ UpdateRegistry(a, s) \/ ReleaseLock(a)

(***************************************************************************
 * Invariants
 ***************************************************************************)

\* Mutual Exclusion: No two agents can be in a critical section simultaneously if a lock is required
MutualExclusion == 
    \A a1, a2 \in Agents :
        (a1 /= a2 /\ pc[a1] \in {"UpdatingRegistry", "ReleasingLock"}) 
        => pc[a2] \notin {"UpdatingRegistry", "ReleasingLock"}

\* Liveness: Any agent that requests a sequence should eventually return to Idle
Termination == \A a \in Agents : <>(pc[a] = "Idle")


=============================================================================
