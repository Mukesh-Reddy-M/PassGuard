🔐 PassGuard — Password Strength Analyzer & Generator

A privacy-focused password strength analyzer and password generator built with React, TypeScript, and Vite.

PassGuard helps users understand password weaknesses, improve password choices, and generate stronger passwords through a clean, responsive interface.

<p align="center">
  <a href="https://mukesh-reddy-m.github.io/PassGuard/"><strong>🚀 Live Demo</strong></a>
  &nbsp; • &nbsp;
  <a href="https://github.com/Mukesh-Reddy-M/PassGuard"><strong>📂 Source Code</strong></a>
</p>---

✨ Features

- Password Strength Analysis — Evaluate passwords using the application's strength analysis logic.
- Actionable Feedback — Identify weak patterns and receive suggestions for improvement.
- Password Generator — Generate passwords locally using the built-in generator.
- Privacy-Focused Design — Designed for client-side password handling. Review the implementation and browser network behavior to verify privacy guarantees.
- Responsive Interface — Use the application on mobile and desktop screens.
- Automated Tests — Includes tests for password analysis, generation, input validation, privacy-related behavior, and regression cases.

🛠️ Tech Stack

Technology| Purpose
React| User interface
TypeScript| Type-safe application logic
Vite| Development server and production build
Tailwind CSS| Styling
Vitest| Automated testing
Lucide React| Icons

🚀 Live Demo

Try PassGuard:
https://mukesh-reddy-m.github.io/PassGuard/

The application is deployed using GitHub Pages and GitHub Actions.

💻 Run Locally

Prerequisites

- Node.js and npm
- Git

1. Clone the repository

git clone https://github.com/Mukesh-Reddy-M/PassGuard.git
cd PassGuard

2. Install dependencies

npm ci

3. Start the development server

npm run dev

Open the local URL displayed in your terminal.

4. Build for production

npm run build

The production files are generated in the "dist/" directory.

5. Run the tests

npm test

To run TypeScript checking separately:

npx tsc --noEmit

🧪 Testing

PassGuard includes automated tests covering important application behavior, including:

- Password strength analysis
- Password pattern detection
- Password generation and input validation
- Secure random integer generation
- Privacy-related behavior
- Regression tests for previously identified issues

Run the complete test suite with "npm test".

🔒 Security and Privacy

PassGuard is designed with privacy in mind.

- Avoid sending passwords to external services.
- Do not log or persist raw passwords.
- Use dummy passwords during development and testing.
- Review the source code and browser network requests before relying on the application for sensitive passwords.
- Keep dependencies updated and review security advisories.

Important: Password-strength estimates are guidance, not a guarantee that an account is secure. Use unique passwords for every account and consider a reputable password manager.

📁 Project Structure

PassGuard/
├── src/
│   ├── lib/
│   │   ├── analyzer.ts
│   │   ├── generator.ts
│   │   ├── patterns.ts
│   │   └── safeLog.ts
│   ├── __tests__/
│   └── main.tsx
├── public/
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── vite.config.ts
└── .github/
    └── workflows/
        └── deploy.yml

Note: The structure above highlights key files; exact filenames and folders may vary with the current repository.

🗺️ Future Improvements

- Add accessibility and keyboard-navigation improvements.
- Expand test coverage for edge cases.
- Improve explanations of password-strength results.
- Add additional generator options and configurable password policies.
- Automate build and test checks for every pull request.

🎯 What I Learned

This project provides practical experience with:

- Building a React application using TypeScript.
- Implementing and testing password-related logic.
- Handling user input with security and privacy in mind.
- Using Git and GitHub for version control.
- Running automated tests with Vitest.
- Building and deploying a web application using GitHub Actions and GitHub Pages.

👨‍💻 Author

Mukesh Reddy Moola

- GitHub: "@Mukesh-Reddy-M" (https://github.com/Mukesh-Reddy-M)
- Project Repository: "PassGuard" (https://github.com/Mukesh-Reddy-M/PassGuard)
- Live Application: "Open PassGuard" (https://mukesh-reddy-m.github.io/PassGuard/)

📄 License

This project declares the Apache-2.0 license in its package metadata. Check that a corresponding license file is present in the repository before distributing the project under that license.

---

⭐ If you find PassGuard useful, consider starring the repository!
