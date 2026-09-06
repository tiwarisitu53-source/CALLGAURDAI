# CallGuard AI - Android CallScreeningService Architecture

## Platform Constraint Compliance

Android requires `CallScreeningService` to provide an answer to `onScreenCall(callDetails: Call.Details)` within **approximately 5 seconds**. If a service fails to respond within this strict time limit, Android ignores the service and passes the call through directly to the dialer.

### Dual-Layer Separation

1. **Android Phone Layer (Layer 1)**:
   - Evaluates local fast-lookup spam hash sets in `<50ms`.
   - Sends non-blocking async network queries with a strict 2.5-second timeout.
   - Responds to Android Telecom with `CallResponse.Builder().setDisallowCall(true).setRejectCall(true)`.
   - Guaranteed response within 5 seconds without blocking phone operations.

2. **Cloud Programmable Telephony Layer (Layer 2)**:
   - For unknown or unclassified callers that need conversational AI screening.
   - Uses programmable telephony (Twilio / Webhook `/api/voice/webhook`).
   - Carries out full adaptive multi-turn conversations, LLM risk engine evaluations, and intent analysis.
   - Terminates or forwards calls appropriately.
