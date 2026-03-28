# 🎮 Curio — Real-Time Quiz Platform

Curio is a live multiplayer quiz platform built for classrooms, corporate training, and team engagement. Hosts run quizzes in real time; participants join instantly from any device using a PIN — no downloads, no account needed to play.

---

## ✨ What You Can Do with Curio

- **Run live quizzes** with any number of participants simultaneously
- **Auto-advancing questions** — the quiz moves forward automatically so you stay in control without manual clicks
- **Instant leaderboard** — participants see their ranking after every question
- **Fair gameplay** — all players wait the same time between questions regardless of how fast they answer
- **Score with speed bonus** — faster correct answers earn bonus points, keeping everyone engaged
- **Quiz from file** — upload a PDF, TXT, or CSV and auto-generate a quiz in seconds
- **No app download needed** — participants join from any phone or laptop browser
- **No account needed to play** — participants just enter a PIN and a nickname

---

## 🚀 Getting Started

Access Curio at:

```
[https://curio.yourdomain.com](https://d1gok8q2inmrrz.cloudfront.net/)
```

> Contact your administrator if you need access credentials or a new host account.

---

## 👤 For Hosts

### 1. Create an Account
Go to the Curio URL and click **Register**. Enter your name, email, and a password. You only need to do this once.

### 2. Create a Quiz
From your dashboard, click **Create Quiz**. Add a title, then add your questions one by one. For each question you can:
- Write the question text
- Add up to 4 answer options
- Mark the correct answer(s)
- Set a time limit per question
- Assign a point value

When you're done, **Save as Draft**. Your quiz stays private until you're ready.

### 3. Create a Quiz from a File
Don't want to type questions manually? Upload a file and Curio will generate questions automatically.

**Supported formats:**

| Format | How to structure it |
|---|---|
| `.txt` or `.pdf` | Use `Q:`, `A:`, `B:`, `C:`, `D:`, `ANSWER:` labels |
| `.csv` | Columns: `question, a, b, c, d, answer` |

**TXT / PDF example:**
```
Q: What is the capital of France?
A: London
B: Paris
C: Berlin
D: Madrid
ANSWER: b
```

**CSV example:**
```
question,a,b,c,d,answer
What is 2+2?,3,4,5,6,b
```

### 4. Publish & Host
When your quiz is ready:
1. Click **Publish** on your dashboard
2. Click **Host** — a live session starts and a **6-digit PIN** is shown on screen
3. Share the PIN and the Curio URL with your participants
4. Wait for everyone to join, then click **Start Quiz**

### 5. During the Quiz
- Questions appear automatically on all devices at the same time
- A countdown timer is shown for each question
- The question advances when the timer ends or all players have answered
- After each question, all players see a brief loading screen before the next question begins
- A mini leaderboard is shown at the end of the quiz

---

## 📱 For Participants

1. Open the Curio URL on any phone or laptop browser
2. Click **Join Quiz**
3. Enter the **6-digit PIN** given by your host
4. Enter a **nickname**
5. Wait for the host to start — then answer each question before the timer runs out
6. The faster and more accurately you answer, the higher your score

> No account or app download is required. Just a browser and a PIN.

---

## ❓ FAQ

**Do participants need to create an account?**
No. Participants only need the PIN and a nickname to join.

**How many participants can join a quiz?**
Curio supports multiple simultaneous participants in a live session.

**Can I reuse a quiz?**
Yes. Published quizzes stay on your dashboard and can be hosted again at any time.

**What devices are supported?**
Any device with a modern browser — phones, tablets, laptops, and desktops.

**What happens if a participant loses connection mid-quiz?**
They can rejoin using the same PIN and nickname. Their timer will sync to the correct remaining time.

**Can I run Curio without internet for participants?**
Yes — Curio supports an offline classroom mode where participants connect over a local WiFi network. Contact your administrator to set this up.
