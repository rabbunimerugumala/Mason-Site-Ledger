# 🛠️ Mason Site Ledger

[![React v19](https://img.shields.io/badge/React-v19.0.1-blue.svg)](https://react.dev)
[![Vite v6](https://img.shields.io/badge/Vite-v6.2.3-646CFF.svg)](https://vitejs.dev)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.1.14-38B2AC.svg)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6.svg)](https://www.typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Mason Site Ledger** is a clean, accessible, mobile-first ledger book designed specifically for brickmasons, construction contractors, site supervisors, and freelance tradespeople. It simplifies tracking daily payment entries, material costs, wage advances, and labor payouts across multiple work sites with a robust offline-first sync engine, multi-account username partitioning, professional printable reports, and absolute cloud resilience.

---

## 📖 Table of Contents

- [Project Context & Identity](#-project-context--identity)
  - [Key Features](#-key-features)
  - [Tech Stack](#-tech-stack)
- [🔑 Simple Username-Based Login System](#-simple-username-based-login-system)
  - [How Registration and Login Work](#how-registration-and-login-work)
  - [Security \& Data Isolation per User](#security--data-isolation-per-user)
- [💾 Robust Offline & Cloud Sync Architecture](#-robust-offline--cloud-sync-architecture)
  - [The "Undefined Payload" Fix (Data Reliability)](#the-undefined-payload-fix-data-reliability)
  - [Automatic Background Synchronization](#automatic-background-synchronization)
- [Setup and Getting Started](#-setup-and-getting-started)
  - [Prerequisites](#-prerequisites)
  - [Installation](#-installation)
  - [Environment Configuration](#-environment-configuration)
- [Technical Usage & Layouts](#-technical-usage--layouts)
  - [Usage Examples](#-usage-examples)
  - [Print-Friendly CSS Sheets](#-print-friendly-css-sheets)
  - [Repository Structure](#-repository-structure)
- [Meta Information](#-meta-information)
  - [Roadmap & Known Issues](#-roadmap--known-issues)
  - [License](#-license)

---

## 🏗️ Project Context & Identity

In physical labor environments and construction zones, network connectivity is often scarce, unstable, or completely absent. **Mason Site Ledger** serves as a digital pocket diary that operates 100% offline while offering seamless, automatic background synchronization to a secure Cloud database once a connection is established.

### ✨ Key Features

- **🔑 Passwordless Username Authentication**: Access separate personal ledgers easily using only a custom username. No complex passwords to remember on active build sites.
- **📶 Offline-First Khata**: Create work sites and add transaction logs even in zero-network basements. Data is instantly saved to your browser sandbox and queued for sync.
- **☁️ Firebase Cloud Sync**: Merges local records with Firebase Firestore as soon as internet connectivity is detected.
- **🛠️ Robust Saving Engine**: Features strict `undefined`-field sanitization, preventing database write crashes from optional fields (like notes or contact details).
- **📱 Accessible, High-Contrast UI**: Modern design tailored with large touch targets, clear high-legibility typography, and intuitive color coding for rapid single-handed operation.
- **🖨️ Print-Friendly CSS Layouts**: Optimized `@media print` rules let you print beautiful physical statements or save clear, un-cluttered PDF bills straight from the browser.
- **⚡ Multiple Active Sites**: Organize logs independently by site name, contractor, and specific building projects.
- **⚖️ Live Running Balances**: Instant calculations of total expenditures and budgets per project.

### 💻 Tech Stack

- **Frontend Core**: [React 19](https://react.dev) with [TypeScript](https://www.typescriptlang.org)
- **Bundler & Tooling**: [Vite 6](https://vitejs.dev)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) for responsive, low-latency UI layout
- **Animations**: [Framer Motion](https://www.framer.com/motion/) for elegant fluid transitions
- **Database / Sync**: [Firebase Firestore](https://firebase.google.com/docs/firestore) + partitioned LocalStorage / memory fallbacks
- **Icons**: [Lucide React](https://lucide.dev)

---

## 🔑 Simple Username-Based Login System

The application features a fast, passwordless **username-based authentication flow** designed for speed and convenience on busy construction sites.

### How Registration and Login Work
1. **Create Account (Registration)**:
   - Users choose a custom username (e.g., `rabbuni`, `rajesh_mason`, `site_supervisor`).
   - The system queries both Local Storage and Cloud Firestore database collections to ensure the username is unique.
   - If already taken, a warning is shown:  
     `This username is already taken. Please choose a different name!`
   - If unique, the username is registered, and the user is instantly logged into their ledger.
2. **Log In**:
   - Registered users simply input their existing username to gain immediate access.
   - If the username is not found, the system guides them to check their spelling or create a new profile.
3. **Log Out**:
   - Users can securely log out by clicking the sign-out icon next to their profile badge in the header. The app prompts a confirmation dialog to prevent accidental sign-outs.

### Security & Data Isolation per User
- **Private Data Partitioning**: All work sites, client contact logs, and transaction ledgers are strictly segmented by the active username.
- **Cloud Level Isolation**: Firestore collections filter writes and queries using the logged-in `username`. Users cannot view or modify other users' entries.
- **Local Level Isolation**: Even in offline mode, local browser keys are saved with username-specific prefixes (e.g., `mason_ledger_places_rabbuni`), preventing data mixing on shared devices.

---

## 💾 Robust Offline & Cloud Sync Architecture

### The "Undefined Payload" Fix (Data Reliability)

Previously, trying to write an optional field (like an empty "Note" description) to Firebase Firestore would trigger a silent runtime crash:
`"Function setDoc() called with invalid data. Unsupported field value: undefined"`

To fix this and guarantee 100% data preservation under all circumstances:
- We implemented a **strict sanitation middleware** called `cleanUndefined()` inside `/src/lib/db.ts`.
- This helper automatically sanitizes and strips all empty optional fields from the objects before they are passed to Firestore.
- This ensures every single write, save, update, and deletion is successfully completed without throwing runtime exceptions.

### Automatic Background Synchronization

The sync engine uses a robust fallback pattern:
1. Every write is instantly committed to local browser storage (`localStorage`), backed by an in-memory storage dictionary if browser policies block storage.
2. The engine tracks online status and automatically syncs all unsynced local sites and entries to Cloud Firestore when a connection is restored.
3. Data is synchronized using a non-destructive merge operation, ensuring no local user effort is ever lost due to intermittent cellular connections.

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

The application is engineered to run **without requiring any manual API keys or credentials** in your source code or configuration files, maintaining 100% client security.

- **Zero-Config Database**: The Google AI Studio platform automatically provisions your dedicated Google Cloud Firestore database and injects the secure configuration at runtime into `firebase-applet-config.json`.
- **Automatic Background Sync**: The app's database client (`/src/lib/db.ts`) detects this config, connects automatically, and seamlessly synchronizes your local offline ledger records directly into the cloud.
- **Offline Fallback**: If `firebase-applet-config.json` is missing (e.g. when downloaded or cloned), the application shifts gracefully into **Local-Only Offline Mode**, allowing you to create records with 100% privacy on your local browser.

---

## 🛠️ Technical Usage & Layouts

### 📝 Usage Examples

#### 1. Creating a Work Site
- Click **"New Site"** on the home dashboard.
- Enter the **Site Name**, **Client Name**, **Phone Number**, and any optional **Location / Details**.
- Click **"Create Site"** to establish a dedicated ledger.

#### 2. Logging a Transaction
- Open the relevant site ledger.
- Use the **New Entry** form to record credits, debits, advances, or material costs.
- Provide the **Date**, **Amount**, and an optional **Note** (e.g., "Paid 5 cement bags", "Advance received").
- The running balance updates instantly.

#### 3. Printing Statements
- On any site detail page, click the **Print Ledger** button or press `Ctrl + P` (or `Cmd + P` on Mac).
- The print view automatically hides interactive navigation, buttons, forms, and background clutter, producing a clean, professional, high-contrast black-and-white physical ledger printout.

---

### 🖨️ Print-Friendly CSS Sheets

The application utilizes responsive, high-contrast typography styled with custom print media queries:
```css
@media print {
  /* Hides forms, buttons, header banners, footers, and scrollbars */
  .no-print {
    display: none !important;
  }
  
  /* Expands container margins and simplifies tables for physical ink */
  body {
    background-color: white !important;
    color: black !important;
  }
}
```

---

### 📂 Repository Structure

```text
├── assets/                    # Static image assets and logo icons
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
├── vite.config.ts             # Vite server and bundler config
```

---

## 📋 Meta Information

### 🗺️ Roadmap & Known Issues

- [ ] **Voice-Activated Khata**: Voice commands (e.g., *"Cement, 500 Rupees"*) to log records hands-free.
- [ ] **Vernacular Language Support**: Multi-lingual localized interfaces (Hindi, Bengali, Telugu, Tamil, etc.) for broader accessibility.
- [ ] **SMS Receipt Sharing**: Directly send text updates to clients on ledger entry creation.

### 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
