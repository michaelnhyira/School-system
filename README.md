# Quick Git setup (Windows)

Use this to initialize Git and push this project to a remote repository.

Option A — One command with the included script
1) Open PowerShell in this project folder:
   cd "C:\Users\micha\OneDrive\Desktop\School-system-main"
2) Run the helper (replace the URL with your repo URL):
   powershell -ExecutionPolicy Bypass -File scripts\init-git.ps1 -Remote "https://github.com/<owner>/<repo>.git"
   - For SSH: -Remote "git@github.com:<owner>/<repo>.git"
What it does:
- Initializes Git if needed, sets the branch to main
- Creates the first commit if none exists
- Adds origin if missing
- Pushes main and sets upstream
If push fails, the script prints the exact next steps (e.g., fetch/rebase or unrelated histories).

Option B — Manual commands
cd "C:\Users\micha\OneDrive\Desktop\School-system-main"

# Initialize and commit
Get-ChildItem -Force | Out-Null  # just to verify you're in the right folder
if (!(Test-Path .git)) { git init }

git branch -M main

git add -A

git commit -m "Initial commit"

# Set the remote and push (pick HTTPS or SSH)
# HTTPS example:
# git remote add origin https://github.com/<owner>/<repo>.git
# SSH example:
# git remote add origin git@github.com:<owner>/<repo>.git

git push -u origin main

Notes
- On HTTPS, when prompted for password, use a Personal Access Token (PAT) if your host requires it (e.g., GitHub with 2FA).
- If the remote already has commits, run: git fetch origin && git rebase origin/main then push.
- For unrelated histories (e.g., local ZIP + existing remote), run: git pull --rebase --allow-unrelated-histories origin main, resolve any conflicts, then push.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
