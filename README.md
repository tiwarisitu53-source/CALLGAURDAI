# 🛡️ CallGuard AI

### AI-Powered Conversational Call Screening & Scam Detection

CallGuard AI is an AI-powered conversational security system designed to protect users from spam, scam, and suspicious phone calls.

Instead of relying only on caller identification or previously reported spam numbers, CallGuard AI can analyze the **intent and content of an unknown caller's conversation**. The system uses Speech-to-Text, a Large Language Model (LLM), risk analysis, and Text-to-Speech to screen suspicious calls before they reach the user.

> **Core idea:** Don't just ask **"Who is calling?"** — understand **"What does the caller want?"**

---

## 🚨 Problem

Traditional spam-call protection mainly depends on:

- Known spam numbers
- User reports
- Caller reputation databases
- Static blocking rules

This creates a gap when a scammer uses a **new, unknown, or previously unreported number**.

A legitimate-looking number can still be used for:

- Financial scams
- OTP or credential requests
- Fake customer-support calls
- Prize/reward scams
- Impersonation
- Urgent payment requests
- Suspicious requests for personal information

CallGuard AI addresses this gap by adding a **conversational security layer** that evaluates the caller's intent.

---

## 💡 Solution

CallGuard AI follows a two-stage screening approach:

### 1. Known-number screening

The incoming number can first be checked against available caller-reputation or spam data.

- Known/high-confidence spam → **Block**
- Known safe number → **Allow / Continue**
- Unknown number → **AI Screening**

The reputation component is designed as a modular layer so that an officially available caller-reputation provider can be integrated without making the entire system dependent on one service.

### 2. AI conversational screening

For unknown callers, the AI voice agent conducts a short conversation.

The caller's speech is:

**Speech → Text → AI Risk Analysis → Response → Voice**

The AI evaluates the conversation for suspicious signals such as:

- Requests for OTPs, passwords, PINs, or sensitive information
- Financial/payment requests
- Urgency or pressure tactics
- Impersonation
- Suspicious links or instructions
- Requests to install unknown software
- Threats or coercion
- Secrecy requests
- Inconsistent or suspicious explanations

The system produces an explainable risk assessment and recommends an action.

---

## 🔄 System Flow

```text
                INCOMING CALL
                       │
                       ▼
              Number Reputation
                       │
             ┌─────────┴─────────┐
             │                   │
        Known Spam           Unknown Caller
             │                   │
             ▼                   ▼
           BLOCK          AI Voice Screening
                                 │
                                 ▼
                         Speech-to-Text
                                 │
                                 ▼
                       Conversation Text
                                 │
                                 ▼
                        LLM / Risk Engine
                                 │
                         ┌───────┴───────┐
                         │               │
                      Low Risk        High Risk
                         │               │
                         ▼               ▼
                      CONNECT          BLOCK
                         │
                         ▼
                    USER / CALLER
```

---

## 🗣️ Voice AI Pipeline

```text
Caller speaks
      ↓
Speech-to-Text
      ↓
Conversation text
      ↓
LLM / Risk Engine
      ↓
Response text
      ↓
Text-to-Speech
      ↓
Natural AI voice
      ↓
Caller
```

The prototype uses a generic natural-sounding AI voice. It does **not** require cloning the user's voice.

---

## ✨ Key Features

- 🤖 **Conversational AI Call Screening**
- 📞 **Unknown Caller Analysis**
- 🧠 **LLM-Based Intent Detection**
- 🚨 **Scam & Risk Detection**
- 📊 **Explainable Risk Score**
- 🔊 **Speech-to-Text**
- 🗣️ **Text-to-Speech**
- 🛡️ **Spam/Caller Reputation Layer**
- 🔄 **Adaptive Conversation**
- 📈 **Call Screening Dashboard**
- 🔐 **Privacy & Security by Design**

---

## 🎯 Risk Analysis

CallGuard AI can classify a call using a structured risk assessment:

```json
{
  "risk_score": 92,
  "risk_level": "HIGH",
  "intent": "Financial verification scam",
  "scam_category": "Bank impersonation",
  "signals": [
    "Urgency",
    "Requests sensitive information",
    "Impersonation"
  ],
  "recommended_action": "BLOCK"
}
```

### Risk Levels

| Risk Level | Meaning | Suggested Action |
|------------|---------|------------------|
| 🟢 Low | Normal / legitimate conversation | Connect |
| 🟡 Medium | Some suspicious signals | Screen further |
| 🔴 High | Strong scam indicators | Block |

---

## 🧪 Example Scenarios

### Scenario 1 — Legitimate Caller

> "Hi, I'm Rahul from the project team. I wanted to discuss tomorrow's presentation."

**Result:** Low Risk → Connect

### Scenario 2 — Bank Impersonation

> "I'm calling about a security issue with your account. We need to verify some information immediately."

**Result:** High Risk → Block / terminate

### Scenario 3 — Fake Prize

> "Congratulations! You've won a cash prize. We need a verification code before we can release it."

**Result:** High Risk → Block / terminate

---

## 🏗️ Technology Stack

| Layer | Technology |
|------|------------|
| Frontend | React, TypeScript |
| UI | Tailwind CSS, HTML5, CSS3 |
| AI / LLM | Google Gemini API |
| Speech Input | Speech-to-Text / Browser Speech Recognition |
| Speech Output | Text-to-Speech |
| Backend | JavaScript / TypeScript server-side logic |
| Communication | REST / HTTP APIs |
| Data | Cloud database / persistent storage |
| Security | Environment variables, protected API keys |
| Development | Google AI Studio |
| Deployment | Google AI Studio / `.ai.studio` |

> **Note:** The exact production architecture can vary depending on the telephony provider and deployment environment.

---

## 🧩 Architecture

```text
┌───────────────────────┐
│     Incoming Call     │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│ Number Reputation     │
│ / Spam Database       │
└───────────┬───────────┘
            ↓
     Unknown Caller
            ↓
┌───────────────────────┐
│   AI Voice Agent      │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│   Speech-to-Text      │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│ Gemini / LLM Risk     │
│ Engine                │
└───────────┬───────────┘
            ↓
┌───────────────────────┐
│ Risk Score + Intent   │
│ + Explanation         │
└───────────┬───────────┘
            ↓
     ┌──────┴──────┐
     ↓             ↓
  CONNECT        BLOCK
     │
     ↓
    USER
```

---

## 📊 Dashboard

The dashboard is designed to provide a simple overview of screened calls.

It can display:

- Total calls screened
- Safe calls
- Suspicious calls
- Blocked calls
- Risk score
- Caller intent
- Scam category
- Detected risk signals
- Recommended action
- Screening timestamp
- Call history

---

## 🔐 Security & Privacy

CallGuard AI follows a privacy-first approach for the prototype.

### Security principles

- API keys should be stored in environment variables.
- Secrets should never be committed to GitHub.
- APIs should validate incoming requests.
- Dashboard endpoints should use authentication in production.
- Only necessary call metadata should be retained.
- Raw audio should not be stored by default unless explicitly required.
- Sensitive conversation data should have controlled retention.
- Production deployment should include appropriate privacy, telecom, and legal review.

> **Important:** This repository represents a hackathon/prototype implementation. Production deployment may require additional telecom, privacy, security, and regulatory controls.

---

## 🚀 Getting Started

### Prerequisites

Depending on the implementation, you may need:

- Node.js
- npm
- Google AI Studio / Gemini API access
- A configured environment file
- A supported speech-to-text / text-to-speech capability

### Installation

Clone the repository:

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd callguard-ai
```

Install dependencies:

```bash
npm install
```

Create an environment file:

```bash
cp .env.example .env
```

Add the required API configuration:

```env
GEMINI_API_KEY=your_api_key_here
```

Start the development server:

```bash
npm run dev
```

Open the local development URL shown by the application.

> Replace the commands above if your generated project uses a different framework or package manager.

---

## 🎬 Demo Flow

For a hackathon demonstration:

1. Start CallGuard AI.
2. Open the call simulator/dashboard.
3. Select a sample caller scenario.
4. Start the AI screening.
5. Let the AI analyze the conversation.
6. Display the detected intent and risk score.
7. Show the recommended action.
8. Demonstrate a legitimate call being allowed.
9. Demonstrate a suspicious call being blocked.
10. Show the result in the dashboard.

---

## 🧪 Recommended Demo Cases

| Test Case | Expected Result |
|----------|-----------------|
| Project/team discussion | 🟢 Connect |
| Normal service inquiry | 🟢 Connect |
| Bank impersonation | 🔴 Block |
| OTP request | 🔴 Block |
| Fake prize | 🔴 Block |
| Urgent payment request | 🔴 Block |
| Suspicious software installation request | 🔴 Block |

---

## 🔮 Future Scope

CallGuard AI can be extended with:

- Native Android call-screening integration
- Official caller-reputation provider integrations
- Real-time programmable telephony
- SIP/PSTN call routing
- Multilingual Indian-language support
- Voice phishing detection
- User feedback-based risk improvement
- Personalized scam detection
- On-device privacy-preserving analysis
- Advanced fraud pattern detection
- Enterprise call-security dashboards
- Automated threat intelligence updates

---

## 🏆 What Makes CallGuard AI Different?

Traditional caller identification mainly answers:

> **"Is this number known?"**

CallGuard AI aims to answer:

> **"What is this caller trying to do?"**

A previously unknown number can still be dangerous. By combining caller reputation with conversational AI, CallGuard AI adds an additional security layer based on **caller intent and conversation context**, not just the phone number.

---

## ⚠️ Current Limitations

This project is currently a prototype/hackathon implementation.

- Real cellular call interception depends on operating-system and telecom capabilities.
- Caller-reputation APIs may require third-party authorization or commercial access.
- AI decisions can occasionally be incorrect.
- Speech recognition may be affected by accents, background noise, or language.
- Production deployment requires additional privacy, telecom, and security validation.
- The browser-based demo may simulate parts of the real telephony workflow.

---

## 🤝 Contributing

Contributions are welcome.

A typical workflow is:

```bash
git checkout -b feature/your-feature
```

Make your changes, test them, and create a pull request.

Before contributing, please avoid committing:

- API keys
- Passwords
- Private user information
- Raw call recordings
- Other sensitive credentials

---

## 📁 Suggested Project Structure

```text
callguard-ai/
│
├── src/
│   ├── components/
│   ├── pages/
│   ├── services/
│   ├── utils/
│   └── App.*
│
├── public/
│
├── backend/
│   ├── services/
│   ├── api/
│   └── models/
│
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

> The actual structure may differ depending on the implementation generated by the development environment.

---

## 📜 License

Add your preferred license in a separate `LICENSE` file before publishing the project.

---

## 👥 Team

**CallGuard AI**  
AI-powered conversational security for safer calls.

Built as a hackathon prototype.

---

## ⭐ Project Vision

> **Make every unknown call explain itself before it reaches you.**

CallGuard AI aims to move call protection from simple **number identification** toward intelligent **conversation-based security**.
