# LexiClear - AI Legal Assistant

LexiClear is a robust, AI-powered legal document analysis application featuring a modern, Gemini-like web interface. It allows users to upload legal PDFs and text, receive deep analysis leveraging the Gemini API, and engage in multi-turn conversational follow-ups about their documents.

## Features

- **Gemini-Style Interface:** A beautiful, intuitive UI with a sidebar for navigation, a chat-like main area, and a bottom-fixed input bar for queries and file uploads.
- **Intelligent Legal Analysis:** Powered by the Gemini API (`@google/generative-ai`) to provide detailed breakdowns of legal texts.
- **Comprehensive Scoring:** AI outputs include three distinct scores:
  - **Legal Precision:** How accurate and precise the language is.
  - **Safety:** An assessment of legal risks or red flags.
  - **Overall Average:** A comprehensive score for the document context.
- **PDF Extraction:** Seamlessly extracts text from uploaded PDF files using `pdfjs-dist`.
- **Conversational Follow-ups:** Engage in a multi-turn chat to ask specific questions about the analyzed document.
- **Authentication & History:** Secure user profiles and saved scan history backed by Firebase Authentication and Firestore.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **UI/Styling:** React 19, Tailwind CSS v4, Lucide React (Icons)
- **AI Integration:** Google Generative AI API (Gemini)
- **Backend/Auth:** Firebase (Authentication, Firestore)
- **PDF Parsing:** PDF.js (`pdfjs-dist`)

## Getting Started

### Prerequisites
Make sure you have Node.js installed on your machine.

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/lexiclear.git
   cd lexiclear
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env.local` file in the root directory and add your API keys:
   ```env
   # Google Gemini API
   GEMINI_API_KEY=your_gemini_api_key

   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_firebase_app_id
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## License
This project is open-source and available under the MIT License.
