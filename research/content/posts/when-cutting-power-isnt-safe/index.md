---
title: "When cutting power isn't safe: a ROS 2 safety supervisor for ground robots and UAVs"
date: 2026-09-30
draft: false
image: cover.jpg
description: "A ROS 2 safety supervisor built on heartbeat silence, criticality classes and a graded stop — and why the same design must not cut power on a drone."
summary: "Most robot safety designs quietly assume that removing power is a safe default. On a ground robot it is. On a drone it's a free fall. This post walks through a ROS 2 safety supervisor that keeps what must stop separate from how to stop it — from heartbeat silence and criticality classes to a hardware fallback that takes over the propulsion signal."
---

{{< theme-cover light="cover.jpg" dark="cover-dark.jpg" alt="A ground robot and a drone with a cut power cable and charging pad" >}}

Most robot safety designs rest on an assumption nobody writes down: when in doubt, cut the power. On a ground robot that's a sound default — the wheels stop turning, the vehicle coasts to a halt. On a drone, the same decision is a free fall.

I've written firmware for power-plant measurement modules and warehouse robots, and control software for UAVs. In all of them the interesting question was never *whether* something fails, but what the machine does in the few hundred milliseconds after. This post describes a safety supervisor for a ROS 2 robot built around that question, and then puts it on an aerial platform — the case that breaks the power-off assumption and shows which parts of the design were really platform-independent.

Try it before reading on: the same bridge goes silent on two robots, and you decide what "safe" means for the second one.

{{< demo src="safe-stop-demo.html.txt" >}}

## Five principles

- **Silence is the signal.** A failing node can't be trusted to report its own failure. Detection is built on the *absence* of an expected heartbeat, not on the arrival of an error message.
- **The producer of a status doesn't decide its consequences.** A node reports what it observes; the supervisor decides what the system does about it.
- **Criticality and action are separate axes.** "Hard" means there's no one left to delegate a safe stop to. It does not, by itself, mean "cut power" — the action bound to a class is platform-specific.
- **Protection layers are independent.** A watchdog must not be able to die from the same cause as the thing it watches.
- **No automatic recovery.** A component that shut itself down after repeated faults stays down until an external authority brings it back.

The setting: ROS 2 Humble with Fast DDS, every node a lifecycle (managed) node[^lifecycle], heartbeats at 10–50 Hz, and a system requirement to detect a silent node within 500 ms. There's an independent watchdog microcontroller that shares no clock with the companion computer, and a hardware emergency stop. Safety has priority over every other subsystem — no functional module may override a safety decision.

## Three layers, and who watches the watchman

The architecture has three layers, each independent of the ones above it, so the failure of a higher layer doesn't disable the one below.

| Layer | Implemented as | Responsibility |
|---|---|---|
| Node | Logic inside each managed node | Detects its own faults, escalates status, shuts itself into a locally safe state on repeated failures. |
| System | Dedicated safety supervisor node | Aggregates heartbeats and diagnostics, holds the criticality policy, decides whether and how to stop the system. |
| Hardware | Independent microcontroller | Watches the supervisor itself. Own regulator, no ROS 2, minimal firmware. Acts when the software stack has stopped responding. |

The node level is the fastest and most specific: it knows what its own hardware is doing and can act within one control cycle. The system level is the only place with a whole-system view, and the only place allowed to order a system-wide stop. The hardware level answers the one question the software layers can't answer about themselves: is the supervisor still alive?

{{< figure-svg src="fig1-safety-tree.svg" caption="Leaf colour is the criticality class, height is the protection layer. The dashed line is the path the hardware layer takes when the supervisor goes silent." >}}

The supervisor is a single point of failure by construction, so it's kept minimal — policy evaluation and timers only, no planning, no perception. It sends its own heartbeat to the hardware layer, which doesn't interpret it at all: it only measures the interval, and if the heartbeat stops, it falls back to a pre-programmed profile with no ROS 2 input.

## Heartbeats: silence is the signal

### Pushed on a topic, not requested through a service

The heartbeat is something a node *pushes* on a topic, not something the supervisor *asks for* through a service. The closest everyday analogue is the systemd watchdog: a service with `WatchdogSec=` has to keep sending `WATCHDOG=1` via `sd_notify()`, and systemd acts when the notifications stop[^systemd]. A Kubernetes liveness probe is the opposite shape — the kubelet sends a request and waits for an answer[^k8s] — and that request/response shape is exactly what this design avoids.

A request can reach a hung node that accepts it and never answers. A pushed message has no such failure mode: a node that has stopped executing simply stops publishing, any number of observers can listen without coordinating with each other or with the node, and silence becomes directly measurable. The supervisor tracks the time since the last message and compares it with a per-node threshold — the one mechanism that still works on a node that can no longer report anything.

A service-based check also carries a concrete trap. A synchronous service call made from inside a callback on a single-threaded executor deadlocks: the executor can't process the response while it's blocked waiting for it. The fix is a reentrant callback group or a dedicated caller node. A topic sidesteps the whole class of problem.

DDS has two lower-level mechanisms that overlap with this, Liveliness QoS and Deadline QoS[^qos], and neither replaces the heartbeat. Liveliness is a property of the DDS writer, not of the application logic above it: a wedged callback thread can keep asserting liveness while doing no useful work. Deadline QoS is used, but as a refinement on the *command* topic — reliable, with the deadline contracted to the write-cycle period and missed deadlines folded into diagnostics:

```python
command_qos = QoSProfile(
    depth=10, reliability=ReliabilityPolicy.RELIABLE,
    deadline=Duration(seconds=1.0 / self.write_rate_hz),
)
```

The heartbeat topic itself stays best-effort with depth 1, so a transport hiccup is absorbed by the polling window instead of being retried into extra delay.

ROS also has its own two-way liveness package, `bond_core`[^bond]. It would remove some hand-rolled plumbing and add something this design lacks — a node noticing that the *supervisor* has disappeared. But it couples detection to response, which this architecture deliberately keeps apart, and it's built for pairwise connections rather than one supervisor watching many nodes against a shared policy. In a production stack, reusing it is a reasonable call; here, the smaller explicit mechanism makes the design easier to see.

### Measured in the observer's clock

The heartbeat carries the node's lifecycle state and a coarse self-assessed health level. Liveness, though, is measured in the *observer's* clock: the supervisor records when each heartbeat arrives and compares the elapsed time against the threshold.

That's the opposite of the rule for diagnostic data. The freshness of a measurement is a property of when it was taken, so a diagnostic sample carries a publisher timestamp. Liveness is a property of the observer — how long has *this* monitor gone without hearing from a node? — and answering it in the observer's clock makes detection immune to clock skew. That matters here, because the watchdog microcontroller has no synchronised clock at all.

The price is that a slow sender and a slow transport look the same at this level. For the safety decision they mean the same thing, so telling them apart is left to diagnostics, which do carry timestamps. Detailed diagnostics travel separately on `/diagnostics` as `diagnostic_msgs/DiagnosticArray`; the heartbeat stays small and fixed-cost, so its publication is never delayed by a node busy assembling a large status report.

### Thresholds come from physics, not from the publish rate

Thresholds are per node class and derived from physical consequence. The question isn't how many messages were missed, but how much damage can happen in the interval.

| Node class | Threshold | Rationale |
|---|---|---|
| Actuator-facing bridges | 100–200 ms | Bounded by how far an uncommanded mechanism can travel before intervention. |
| State estimation, sensors | 200 ms | Set by the control loop's own stability margin. |
| Planning, navigation | 500 ms | A lower layer can hold a safe state, but this node is still in the safety chain. |
| Diagnostics, logging | 5 s | In no actuation path — a deliberate deviation. |

Every class that takes part in executing or informing a safe stop meets the 500 ms requirement. Diagnostics is the exception on purpose: it sits in no actuation path, its silence doesn't reduce the system's ability to stop, and a 500 ms bound on a 1–10 Hz reporting channel would only produce false alarms with no safety content.

I use a time-based threshold rather than a consecutive-miss counter. A counter mixes two variables — publish rate and tolerable outage — so two nodes with the same "three misses" rule but different rates end up with different real exposure, and the rule silently changes meaning whenever someone retunes a rate. The same logic appears at the node level, where a bridge deactivates itself once its last successful write is too old:

```python
age_s = (self.get_clock().now() - self.last_success_time).nanoseconds / 1e9
if age_s >= self.fault_timeout_s:
    self.trigger_deactivate()
```

The supervisor's own polling rate isn't independent of the thresholds either. Worst-case detection latency is the threshold plus one polling interval, so the polling period is derived from the tightest threshold in the loaded policy rather than fixed:

```python
tightest_ms = min(c['heartbeat_timeout_ms'] for c in self.policy.values())
check_period_s = (tightest_ms / POLLING_MARGIN) / 1000.0
self.create_timer(check_period_s, self.check_liveness)
```

Every number above holds only if that timer actually fires on schedule. The reference implementation is plain `rclpy` on a general-purpose scheduler — no core pinning, no elevated priority — so a GC pause or a burst of callbacks could delay a poll. The hardware watchdog confirms that the supervisor is *alive*, not that its loop is keeping pace: a supervisor that is scheduled but consistently late would keep heartbeating to the hardware while quietly missing its own detection bounds. On a real platform this is the first place I'd spend real-time effort.

### STALE is not ERROR, and "never heard from" is not healthy

The supervisor keeps the last known state of every node. A node that stops publishing is marked STALE once its threshold elapses. STALE is different from ERROR: ERROR is self-reported by a node that is still running and has found a problem; STALE is inferred from silence. ERROR means the reporting path is intact. STALE means it isn't — and only STALE implies the node could be in an arbitrary state.

```python
if criticality == 'hard':
    self.get_logger().error(msg)
elif criticality == 'soft':
    self.get_logger().warn(msg)
else:
    self.get_logger().info(msg)
del self.last_seen[node_name]
```

The `del` matters as much as the log level. Once a node is reported STALE, it's dropped from `last_seen` instead of keeping an expired timestamp, so the next poll doesn't re-escalate the same silence; the node simply reads as never-seen until its next heartbeat.

A node that has *never* published can't be judged by a timeout — there's no interval to measure. Treating that as benign would make a renamed, misconfigured or crashed-on-startup node indistinguishable from a healthy one. Silence from a node that never reported isn't missing information; it *is* the information, and it's handled as a readiness gate:

```python
missing = [n for n in self.required if n not in self.last_seen]
self.armed = not missing
```

`self.required` holds only the hard- and soft-class nodes. Requiring every node in the policy would let a failed logger ground the machine — collapsing the classification exactly where it's most useful. The gate demands the nodes that can execute or inform a safe stop, and no others. For the gate to work, the heartbeat must start at *configure*, not at *activate*: a node that only reports once it's active can't be checked before arming.

## The policy is configuration, not code

The mapping from node to criticality is loaded by the supervisor at startup and evaluated at runtime. Adding a node or retuning a threshold doesn't touch the supervisor:

```yaml
safety_policy:
  nodes:
    can_bridge:
      criticality: hard
      heartbeat_timeout_ms: 150
      on_timeout: platform_safe_stop

    led_bridge:
      criticality: informational
      heartbeat_timeout_ms: 5000
      on_timeout: log_only
```

### What "criticality" actually measures

Criticality isn't a measure of how important a node feels. It answers one question: *if this node stops responding, is there another live component that can execute a safe stop on its behalf?*

- **Hard** — no. The node is the last link to the physical mechanism; there's nothing below it to delegate to. Requires the platform-level safe stop.
- **Soft** — yes. A lower layer is still running and can be commanded into a safe state.
- **Informational** — in no actuation path. Loss is reported and logged; the system keeps working.

That's why an actuator bridge is hard while a planner is soft, even though the planner is more complex and more central to the mission: a failed planner leaves an intact chain of control below it, a failed bridge doesn't.

This is a severity classification, not a probability one — *what* happens, not *how likely* — and it plays the same role as the severity axis of a formal risk assessment (ISO 12100, ISO 13849[^iso], or the severity column of an FMEA). A full assessment would also rate likelihood and detectability per node; what's here is the severity axis alone.

### End-to-end latency

Detection is only part of the story. The number that matters is the time from the physical event to the actuator reaching a safe state:

| Stage | Bound | Source |
|---|---|---|
| Detection (heartbeat silence → STALE) | ≤ 180 ms | 150 ms threshold + one 30 ms poll (`POLLING_MARGIN = 5`) |
| Classification and dispatch | < 1 ms | In-process function call |
| Command transport to actuator (CAN write cycle) | 20 ms | `1 / write_rate_hz` at 50 Hz |
| Actuator physical response | device-dependent | not modelled |

Summed, the software side takes roughly 200 ms from last-known-good to a safe command on the bus, and detection dominates it — which is why the thresholds get the attention, not transport or dispatch, which are an order of magnitude smaller.

The last row is left unmodelled on purpose rather than filled with a placeholder. How long an actuator takes to physically reach its safe state depends on its mechanics — inertia, bandwidth, travel — and is a per-device parameter (the hover offset below is one instance), not a constant. A made-up end-to-end total would be less useful than naming what's excluded.

## Graded stop: what's still trustworthy decides the response

The stop path is graded, and the grade is chosen by *which layer went silent*, because that determines what can still be trusted. Here's the same logic on the ground robot, now with a work light on an informational bridge — and a decision for you to make:

{{< demo src="graded-stop-demo.html.txt" >}}

| Trigger | Response | Precondition |
|---|---|---|
| Soft-class node silent | Lifecycle deactivate of the affected subsystem; the lower layer holds a safe state. | The layer below is confirmed alive by its own heartbeat. |
| Hard-class node silent | Platform safe stop, executed by the supervisor. | The supervisor itself is alive. |
| Supervisor silent | The hardware layer executes its pre-programmed fallback. | None — the entire software stack is assumed untrustworthy. |

### Only the supervisor issues transitions

Lifecycle transitions are ordinary ROS 2 services, so by default any node that knows the service name can trigger them. Without arbitration, a perception node could activate an actuator subsystem behind the supervisor's back.

So functional modules never call `change_state` on managed nodes directly. They submit requests to the supervisor, which checks them against the current safety state and issues the transition itself — the same pattern as the Nav2 lifecycle manager[^nav2]. Where enforcement matters more than convention, SROS 2[^sros2] permissions restrict which participants may call the transition services at all, turning "must not" into "cannot".

Those permissions come from one DDS-Security plugin, Access Control, which governs who may call a service or publish to a topic. It says nothing about *Authentication*, the separate plugin that verifies a participant is who it claims to be. Without it, Access Control enforces rules on an identity nothing has checked, and a compromised participant could forge a heartbeat under another node's name. SROS 2 packages both; only Access Control is configured here, and that gap should be closed before anything flies.

### No automatic re-activation

A node that deactivated itself after repeated faults doesn't try to come back on a timer. Nothing has shown that the fault is cleared, and a retry loop burns attention and log volume at exactly the worst moment. Re-activation is an explicit decision by the supervisor or an operator, made with knowledge the failing node doesn't have.

## The UAV case: when "off" is not "safe"

Everything so far is platform-independent. The action bound to the hard class isn't.

On a ground robot, "remove power from the drive stage" is a sound default: the vehicle decelerates and stops, a short coast at worst. It doesn't even need a contactor on the high-current line. The stop signal pulls the EN pin of the drive-stage power supply low — a logic-level signal, no arc to suppress — and with a pull-down on EN, a stop line that goes dead reads as "off" too. The default state of the switch *is* the platform's safe state.

On an aerial platform the assumption inverts. Removing power from propulsion in flight isn't a stop, it's an uncontrolled descent. "Hard" still means nobody is left to delegate to, but the action it maps to becomes "terminate the flight as safely as possible", not "cease actuation".

The separation isn't rhetorical. In the reference implementation, the ground robot's drive bridge and the drone's propulsion bridge are the same executable; everything that differs is configuration:

```yaml
# drive.yaml (ground robot)
safe_command: 0.0

# propulsion.yaml (UAV)
safe_command: 0.42
```

Had the safe value been written into source as a literal zero, the propulsion bridge would most likely have been created by copying the drive bridge — and would have inherited a command that cuts thrust in flight.

### Criticality on an aerial platform

| Node | Class | Action on timeout |
|---|---|---|
| Flight controller bridge | hard | Controlled descent; power removal is never the in-flight response. |
| State estimator / IMU | hard | Controlled descent — no stabilisation without state feedback. |
| Ground control link | hard | Autonomous return-to-home; a known, survivable condition. |
| Battery monitor (critical) | hard | Immediate landing while reserve energy remains. |
| Actuator bridge (payload) | soft | Safe pose autonomously; the flight loop is informed, not interrupted. |
| Diagnostics aggregator | informational | Logged only. |

### A payload that matters, but not too much

The payload actuator has moderate influence on stability: enough that its state matters to the flight loop, not enough that its failure alone is an emergency. That produces a two-part response, separated in time and place.

Locally and immediately, the actuator node drives the mechanism to its safe pose without waiting for a decision from above — waiting would leave the mechanism indeterminate longer than necessary, and the local node is the only thing that can act within one control cycle.

Upward, the actuator reports degradation as *status*, not as a command. The flight loop isn't obliged to abort on that alone; it might fly less aggressively, shorten the mission or return home early. If the payload were critical to stability rather than merely influential, the same status would map to an immediate landing. The mechanism is identical either way; only the policy differs — which is the separation this whole architecture is built around.

### The hardware fallback

The watchdog runs on a dedicated microcontroller with its own regulator. It draws from the main battery but is electrically isolated from the companion computer's supply rail. That's partial independence: it protects against brownouts from other loads and against software crashes on the main computer, but not against losing the battery itself — that case is handled by voltage monitoring and a pre-emptive return-to-home. A fully independent second battery would cover it, at a mass cost the platform pays on every flight.

**Taking over the signal, not just letting go of it.** The fallback controller has to actively take over the propulsion command path. If it simply fell silent along with the flight controller, most ESCs would apply their own signal-loss behaviour — typically motor shutdown, the exact outcome being avoided.

So a PWM multiplexer sits between the flight controller and the ESCs, passing the flight controller's signal through unchanged in normal operation. On watchdog timeout, the microcontroller drives the select line and generates the command itself. The switched signal is low-current, so this is a small analogue switch — none of the arc problems of switching the propulsion supply.

The multiplexer is itself a single point of failure, introduced by solving the supervisor's. Stuck in passthrough, it defeats the takeover entirely; stuck in fallback, it forces a nuisance descent with a healthy flight controller — the safer of the two failures. So the switch defaults to fallback when there's no valid select signal, rather than requiring one to be asserted. It's the same rule as the EN pull-down on the ground robot, applied to a platform with a different safe state.

**The fallback profile.** It's open-loop by necessity: if the state estimator has gone silent, no attitude or altitude feedback can be trusted. And it doesn't command zero thrust — zero thrust is free fall. It commands a fixed offset below hover thrust, producing a bounded descent instead of an uncontrolled one. The offset is a calibration parameter of the specific airframe (mass, propellers, battery state); the real design decision is the reference point — hover thrust rather than zero — not the number.

**The manual E-STOP.** The watchdog answers "the software went silent". A physical stop button answers a different question — "someone wants this stopped now, whatever the software thinks" — because an operator may need to stop a perfectly responsive system. So it's a separate input, wired straight to the multiplexer select line and OR-ed with the watchdog output, with no software or firmware in between. A button that only *informs* software of intent inherits every failure mode of that software.

Unlike the watchdog path, the button commands zero thrust, not the hover offset. That isn't a contradiction. The button is on the airframe, so nobody can physically press it in flight: it's only reachable on the ground or on a test bench. And if someone is reaching for it, a person is within arm's length of spinning propellers — a more serious situation than anything the software was doing. On the ground, zero thrust *is* the safe state. The same drone has two safe states, and which one applies depends on where it is — which is the point of keeping criticality and action apart.

**What a heartbeat can't catch.** Every mitigation here is single-channel: one supervisor, one estimator, one watchdog. A node producing plausible garbage still passes a liveness check. Catching a wrong-but-live answer needs redundancy with voting — a second estimator with disagreement detection, dual supervisors reconciled by majority. That's out of scope here, and it's the natural next layer.

## Lifecycle: what makes the stop commandable

Making every node a managed node is what lets the safety architecture command state changes at all. A managed node separates acquiring resources from acting on them — `on_configure` allocates and connects, `on_activate` starts doing things — so a subsystem can be held ready-but-inert, stopped and restarted without repeating expensive initialisation.

{{< figure-svg src="fig4-lifecycle.svg" caption="The heartbeat spans configure to cleanup: every state in which the process is alive is observable." >}}

| Transition | Safety role |
|---|---|
| `on_configure` | Acquire hardware handles, establish links, start the heartbeat. A failure here prevents ever reaching active. |
| `on_activate` | Start the control cycle. The node was already observable before this point. |
| `on_deactivate` | Stop the control cycle and command the locally safe state — the soft-stop path, an ordered shutdown. |
| `on_cleanup` | Release hardware resources and stop the heartbeat. Not part of an emergency response. |

A lifecycle deactivate is cooperative: it assumes a live process receives the request and reports success. That makes it the right mechanism for an ordered stop and the wrong one when nothing is left to receive the request — that case belongs to the hardware layer alone.

`on_deactivate` has to *command* a safe state, not just stop sending commands. A mechanism left at its last commanded value isn't safe, it's arbitrary. What "safe" means is per device: a payload actuator retracts to a stowed pose; a gripper holds rather than releases if dropping the load is worse than keeping it.

```python
self.send_command(self.safe_command)
self.desired_command = self.safe_command
self.destroy_timer(self.write_timer)
```

Clearing the setpoint matters as much as sending the command. Otherwise the safe value only holds until the next write-cycle tick, and re-activation would resume from whatever was requested before the fault.

The heartbeat timer is deliberately left alone here — created at configure, released at cleanup, alive in every state where the process is. A deactivated node must keep asserting liveness, or an ordered stop would look like a crash; a configured node must report before activation, or the readiness gate has nothing to check.

## Testing and deployment, briefly

A safety supervisor that has only been reviewed hasn't been tested, and testing it is a subject of its own. A few points that shape how it's done:

- **Kill with SIGKILL, not SIGINT.** A node stopped with SIGINT runs its shutdown path and may still report. SIGKILL leaves the supervisor with nothing but silence — the exact condition the mechanism exists to detect. Detection latency is then *measured* across repeated runs, not asserted once.
- **The hardware fallback can't be validated in software.** It needs a bench rig with propulsion replaced by instrumented loads, the companion computer powered down, and the multiplexer switchover measured directly.
- **Some things testing can't establish.** A bench confirms that the fallback produces the configured hover offset; it can't confirm the offset is right for the airframe. That's a flight-test activity, and treating it as covered would be false assurance.
- **The last line of defence shouldn't change by accident.** The fallback firmware is built separately, shares no toolchain with what it guards, and is updated through a deliberately inconvenient procedure.

And the likeliest real-world failure of this architecture isn't in the design at all. It's a deployment mistake: a renamed topic that silently drops a node out of monitoring — indistinguishable from a monitor with nothing to report. How to test for that, and for everything above, deserves a separate post.

## Takeaways

- Build detection on silence, measured in the observer's clock. A failing node can't be trusted to tell you it's failing.
- Classify nodes by one question — *is anyone else left to stop the hardware?* — and keep that classification separate from the action it triggers.
- Put the safe value in configuration, never in source. A copied bridge with a hard-coded zero is how a ground-robot default ends up cutting thrust in flight.
- Make every switch default to the platform's safe state: a pull-down on EN for a ground robot, a multiplexer that falls back to hover-offset descent for a UAV.
- Know what a heartbeat can't see. Wrong-but-live needs redundancy and voting, and that's the next layer.

[^lifecycle]: [Managed nodes](https://design.ros2.org/articles/node_lifecycle.html) — ROS 2 design article.
[^systemd]: [`WatchdogSec=`](https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html#WatchdogSec=) in systemd.service and [`sd_notify()`](https://www.freedesktop.org/software/systemd/man/latest/sd_notify.html).
[^k8s]: [Configure liveness, readiness and startup probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/) — Kubernetes documentation.
[^qos]: [Quality of Service settings](https://docs.ros.org/en/humble/Concepts/Intermediate/About-Quality-of-Service-Settings.html) — ROS 2 Humble documentation.
[^bond]: [`bond_core`](https://github.com/ros/bond_core) — ROS bond package.
[^iso]: [ISO 12100:2010](https://www.iso.org/standard/51528.html), Safety of machinery — risk assessment and risk reduction; [ISO 13849-1:2023](https://www.iso.org/standard/73481.html), Safety-related parts of control systems.
[^nav2]: [Lifecycle Manager](https://docs.nav2.org/configuration/packages/configuring-lifecycle.html) — Nav2 documentation.
[^sros2]: [Introducing ROS 2 security](https://docs.ros.org/en/humble/Tutorials/Advanced/Security/Introducing-ros2-security.html) — ROS 2 Humble documentation.
