# WiSUN Throughput & Capacity Calculator

An interactive, configuration-driven web app that models the **full DLMS-over-WiSUN AMI data path** for the Boltron Device Lifecycle Assurance Platform and answers two questions:

1. **End-to-end latency budget** — how long each stage takes for every DLMS profile.
2. **Capacity** — *how many meter nodes* a single WiSUN Border Router / gateway can serve.

It is calibrated against **real NMS MQTT captures** (parsed live in the browser).

## Modelled data path

```
HES / NMS  ──4G (EC200U/USB) · MQTT QoS──►  Broker  ◄──►  RPi Gateway (MQTT⇄UDP, MeterID⇄IPv6)
                                                                │  UART @ baud
                                                                ▼
                                                         WiSUN Border Router
                                                                │  RF mesh (6LoWPAN/IPv6/UDP)
                                                                ▼
                                                            Meter node
```

## What it computes

- **WiSUN airtime** per frame: PHY preamble/header, 802.15.4 MAC + security header, 6LoWPAN/IPv6/UDP
  compression, FCS, MAC ACK, CSMA/CA backoff, 6LoWPAN fragmentation, **mesh hops** and
  **PER-driven retransmissions**.
- **Per-stage latency**: UART serialization, gateway MQTT⇄UDP processing, meter DLMS processing,
  4G cellular RTT + throughput, and **MQTT QoS 0/1/2** handshake cost.
- **Fleet capacity**: minimum supported node count across every shared resource (RF channel,
  Pi↔BR UART, 4G/MQTT backhaul, gateway CPU) for a chosen poll/push cycle, with the binding
  bottleneck highlighted.

## Extending it (all config-driven)

| To add… | Edit |
| --- | --- |
| A WiSUN PHY mode | `src/config/phyProfiles.ts` |
| A DLMS profile / use-case log | `src/config/dlmsProfiles.ts` (paste a raw NMS capture) |
| A deployment scenario (poll/push) | `src/config/useCases.ts` |
| A tunable parameter knob | `src/config/paramSchema.ts` + `src/lib/types.ts` |
| Default parameter values | `src/config/networkConfig.ts` |

The parsing/engine core lives in `src/lib/` (`logParser.ts`, `engine.ts`).

## Develop

```bash
npm install
npm run dev      # local dev server
npm run build    # typecheck + production build
npm run preview  # preview the production build
node scripts/verify.ts   # numerical model cross-check vs measured data
```

## Deploy to GitHub Pages

1. Push this repo to GitHub (default branch `main`).
2. In **Settings → Pages**, set **Source = GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) builds and publishes automatically.
   It sets Vite's `base` to `/<repo-name>/` so asset paths resolve on the Pages sub-path.

For a user/organisation page or custom domain, override the base at build time:
`VITE_BASE=/ npm run build`.

---

Author: **Bhautik Ramoliya** · Company: **Boltron Telesystems Private Limited**
