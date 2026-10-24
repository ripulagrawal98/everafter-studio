# GitHub and Cloudflare setup

Repository: `ripulagrawal98/everafter-studio`. This is a separate codebase from any personal wedding invitation.

The GitHub workflow runs `npm test` on pushes and pull requests.

For a local preview:
```sh
python3 -m http.server 8788 --directory public
```

For online publishing, create a new Cloudflare Pages project and new D1 database. Connect this GitHub repository, set output folder `public`, build command `exit 0`, apply `migrations/0001_init.sql`, and add a D1 binding with variable name `DB`. Deploy again after binding. Do not bind any existing personal wedding database.