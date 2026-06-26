# 🛠️ Mason Site Ledger

[![React v19](https://img.shields.io/badge/React-v19.0.1-blue.svg)](https://react.dev)
[![Vite v6](https://img.shields.io/badge/Vite-v6.2.3-646CFF.svg)](https://vitejs.dev)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.1.14-38B2AC.svg)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Mason Site Ledger** is a clean, accessible, mobile-first khata book designed specifically for mason workers, construction contractors, and site supervisors. It simplifies tracking daily money entries, labor payments, and material costs across multiple active work sites with robust offline-first capabilities, intelligent cloud syncing, and professional PDF report generation.

---

## 📖 Table of Contents

- [Project Context & Identity](#-project-context--identity)
  - [Key Features](#-key-features)
  - [Tech Stack](#-tech-stack)
- [Setup and Getting Started](#-setup-and-getting-started)
  - [Prerequisites](#-prerequisites)
  - [Installation](#-installation)
  - [Environment Configuration](#-environment-configuration)
- [Technical Usage & Architecture](#-technical-usage--architecture)
  - [Usage Examples](#-usage-examples)
  - [Repository Structure](#-repository-structure)
  - [Offline & Sync Engine (Database Architecture)](#-offline--sync-engine-database-architecture)
  - [Code Verification & Quality Checks](#-code-verification--quality-checks)
- [Meta Information](#-meta-information)
  - [Roadmap & Known Issues](#-roadmap--known-issues)
  - [Contributing Guidelines](#-contributing-guidelines)
  - [License](#-license)
  - [Contact & Support](#-contact--support)

---

## 🏗️ Project Context & Identity

In construction and masonry work, internet connections are often unreliable, and users require straightforward, highly readable interfaces. The **Mason Site Ledger** addresses this by acting as a digital pocket notebook that works completely offline. 

### ✨ Key Features

- **📶 Offline-First Khata**: Write daily entries even in zero-network areas. Data is automatically preserved in local storage and queued for background syncing.
- **☁️ Firebase Cloud Sync**: Instantly merges local records with Firebase Firestore as soon as internet connectivity is detected.
- **📱 Accessible, Senior-Friendly UI**: High-contrast modern design utilizing large tap targets, clear legible typography, and intuitive color coding for seamless operation.
- **📄 Professional PDF Reports**: Generate and download comprehensive work site reports containing balance sheets, itemized lists, and site summaries instantly using client-side engines.
- **⚡ Multiple Work Sites**: Organize money logs separately by site name, contractor, and location.
- **⚖️ Real-time Totals**: Instant dynamic calculation of total budgets, advances, and pending dues per site.

### 💻 Tech Stack

- **Frontend Core**: [React 19](https://react.dev) with [TypeScript](https://www.typescriptlang.org)
- **Bundler & Tooling**: [Vite 6](https://vitejs.dev)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) for responsive, low-latency UI
- **Animations**: [Framer Motion](https://www.framer.com/motion/) for smooth layout transitions
- **Database / Sync**: [Firebase Firestore](https://firebase.google.com/docs/firestore) + Robust LocalStorage / Memory Fallback Sync Engine
- **Report Exporters**: [jsPDF](https://github.com/parallax/jsPDF) and [html2canvas](https://html2canvas.hertzen.com/)
- **Icons**: [Lucide React](https://lucide.dev)

---

## 🚀 Setup and Getting Started

### 📋 Prerequisites

Ensure you have the following installed locally:
- **Node.js** (v18.0.0 or higher recommended)
- **npm** (v9.0.0 or higher)

### ⚙️ Installation

1. Clone the repository to your local environment:
   ```bash
   git clone https://github.com/your-username/mason-site-ledger.git
   cd mason-site-ledger
   ```

2. Install all dependencies:
   ```bash
   npm install
   ```

3. Spin up the development server:
   ```bash
   npm run dev
   ```
   *The server will run on [http://localhost:3000](http://localhost:3000).*

### 🔐 Database & Environment Configuration

The application is engineered to run **without requiring any manual API keys or credentials** in your source code or configuration files. This keeps your credentials 100% secure.

- **Zero-Config Database**: The Google AI Studio platform automatically provisions your dedicated Google Cloud Firestore database (`ai-studio-9635da52-455e-4356-8040-9a7e26892f09`) and injects the secure configuration at runtime into `firebase-applet-config.json`.
- **Automatic Background Sync**: The app's database client (`/src/lib/db.ts`) detects this config, connects automatically, and seamlessly synchronizes your local offline ledger records directly into the cloud.
- **No Secret Exposure**: You never have to copy, paste, or commit any Firebase API keys or database secrets. Everything works out of the box securely and automatically!

---

### 🔒 Security & Repository Sharing (How Cloning Works)

If you share your repository or if someone downloads/clones your code, **they will NOT have access to your database.** Here is how security is strictly enforced:

#### 1. Credential Protection
The file `firebase-applet-config.json` contains your private Firebase credentials. This file is listed in the project's `.gitignore`. 
- **When downloaded/cloned**: The config file is omitted from the git repository entirely.
- **Result**: No one downloading your source code can see your database configurations, API keys, or project IDs.

#### 2. Graceful Offline-Only Fallback
If someone runs your downloaded code locally, the application automatically detects that `firebase-applet-config.json` is missing:
- **Automatic Mode Shift**: The storage engine (`src/lib/db.ts`) will seamlessly shift into **Local-Only Offline Mode**.
- **User Experience**: The app remains 100% functional! They can create sites, add money entries, view dashboards, and export PDF reports. All their data is saved locally in their browser sandbox (LocalStorage) and remains completely private to their machine.
- **Zero Interruption**: They will see a clean status badge indicating they are running in **Local Mode** instead of **Cloud Sync Mode**.

#### 3. How Others Can Connect Their Own Firebase DB
If someone wants to host the app and use their own Firebase Cloud Database, they can do so easily:
1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Provision a **Cloud Firestore** database.
3. Register a Web App in their Firebase project settings to get the Firebase Client Configuration.
4. Create a file named `firebase-applet-config.json` at the root of their project (or in their public folder) and paste their Firebase config values matching this exact structure:
   ```json
   {
     "projectId": "your-project-id",
     "appId": "your-app-id",
     "apiKey": "your-api-key",
     "authDomain": "your-project.firebaseapp.com",
     "storageBucket": "your-project.firebasestorage.app",
     "messagingSenderId": "your-sender-id"
   }
   ```
5. Restart their local development server. The app will immediately recognize the new configuration, connect to their personal database, and begin background syncing their local data to their own cloud!

---

## 🛠️ Technical Usage & Architecture

### 📝 Usage Examples

#### 1. Adding a New Work Site
- Click the **"Add New Work Site"** button on the home screen.
- Fill in the **Site Name**, **Client / Contractor Name**, and **Location / Landmark**.
- Click **"Create Site"** to establish a dedicated ledger.

#### 2. Adding a Money / Work Transaction
- Select the relevant active site card.
- Tap **"Add Entry"** to log a credit, debit, or wage payment.
- Enter the **Amount**, **Date**, and a descriptive **Note** (e.g., "Received advance from client", "Bought 10 cement bags").
- The running balance instantly updates on the site dashboard.

#### 3. Exporting PDF Reports
- On any site detail page, click the **"Export Report"** button.
- Choose **"PDF Invoice / Report"** to download an elegant page layout summarizing the site ledger, perfect for sharing over WhatsApp or email with the client.

---

### 📂 Repository Structure

```text
├── assets/                    # Static image assets and icons
├── src/
│   ├── components/            # Reusable UI Components
│   │   ├── AlertModal.tsx     # Clean visual confirmation modals for errors
│   │   ├── ConfirmModal.tsx   # Large touch-target delete confirmation modal
│   │   ├── ErrorBoundary.tsx  # Application recovery boundary safety wrapper
│   │   ├── PlaceCard.tsx      # Individual Site / Project preview card
│   │   ├── PlaceFormModal.tsx # Workspace / Site setup and editor modal
│   │   ├── TransactionForm.tsx# Money entry manager panel
│   │   └── TransactionList.tsx# Detailed ledger list & report generator
│   ├── lib/
│   │   └── db.ts              # Local-first storage + cloud sync engine
│   ├── App.tsx                # Main entry point and layout router
│   ├── index.css              # Global styles & Tailwind configuration
│   ├── main.tsx               # Client bootstrap logic
│   └── types.ts               # Shared TypeScript typings
├── index.html                 # Main HTML template with sandbox error handlers
├── package.json               # Dependencies and script definitions
├── tsconfig.json              # TypeScript compilation rules
└── vite.config.ts             # Vite server and bundler config
```

---

### 🔄 Offline & Sync Engine (Database Architecture)

```
                       ┌──────────────────────┐
                       │  Mason Site Ledger   │
                       └──────────┬───────────┘
                                  │
                   ┌──────────────┴──────────────┐
                   ▼                             ▼
        ┌────────────────────┐         ┌────────────────────┐
        │   LocalStorage     │         │ Firebase Firestore │
        │ (Memory Fallback)  │         │ (If connected)     │
        └────────────────────┘         └────────────────────┘
```

The database layers in `/src/lib/db.ts` use a fallback queue structure:
1. All changes are written immediately to standard `localStorage` with a fast-switching `memoryStore` backup if local cookies or tracking are disabled (such as in iframe-sandboxed environments).
2. A distinct `deviceId` is dynamically generated to partition work entries safely.
3. The engine listens to state changes and connects with Firestore asynchronously when online, verifying data parity and synchronizing differences seamlessly.

---

### 🚦 Code Verification & Quality Checks

Ensure the application compiles cleanly and passes all TypeScript checks before deploying:

- **Run Type Verification & Linter**:
  ```bash
  npm run lint
  ```
- **Run Production Build**:
  ```bash
  npm run build
  ```

---

## 📋 Meta Information

### 🗺️ Roadmap & Known Issues

- [ ] **Voice-Activated Khata**: Voice commands (e.g., *"Cement, 500 Rupees"*) to log records hands-free.
- [ ] **Vernacular Language Support**: Multi-lingual localized interfaces (Hindi, Bengali, Telugu, Tamil, etc.) for broader accessibility.
- [ ] **SMS Receipt Sharing**: Directly send text updates to clients on ledger entry creation.

### 🤝 Contributing Guidelines

Contributions are always welcome to improve utility at construction sites:
1. Fork the project.
2. Create a Feature branch: `git checkout -b feature/NewAccessibleFeature`.
3. Commit changes with explicit messages: `git commit -m 'Add Voice input support'`.
4. Push the branch and open a Pull Request.

### 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

### 📞 Contact & Support

Maintainer Email: [support@masonsiteledger.com](mailto:support@masonsiteledger.com)  
Project Link: [https://github.com/your-username/mason-site-ledger](https://github.com/your-username/mason-site-ledger)
