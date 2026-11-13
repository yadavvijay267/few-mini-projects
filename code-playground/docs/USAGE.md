# Code Playground — Usage

Open `src/index.html` in a browser.

- Edit HTML, CSS, and JavaScript in the three panes. With **Live update** on, the preview refreshes 400 ms after you stop typing; otherwise press **▶ Run**.
- The preview runs in a sandboxed iframe (`sandbox="allow-scripts"` — no `allow-same-origin`, so snippet code cannot reach the parent page).
- `console.log` / `warn` / `error` and uncaught errors from the preview are captured and shown in the Console panel below the preview.
- **Save** stores the snippet in localStorage under its name; pick it from the dropdown to reload it.
- **Share (URL)** encodes the whole snippet into the URL hash (`#snippet=…`) and copies the link — no backend, no account. Opening that link restores the snippet.

Note: the iframe sandbox blocks `fetch` to other origins from inside snippets unless the target allows it; that is intentional.
