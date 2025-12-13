# CONTRIBUTING

The repository uses the following branches:

- `main` — stable branch, production-ready code only
- `dev` — integration branch for frontend and backend
- `back/vladimirnilov` — backend development branch
- `front/henripork` — frontend development branch (Admin Control)
- `front/priitteng` — frontend development branch (User Display)

You must work only in your personal branch.

```bash
git checkout <front|back>/<your-nickname>
```

Basic workflow:

```bash
git checkout <your-branch>
git pull

git add .
git commit -m "<commit message>"
git push origin <your-branch>
```

Do not commit directly to `dev` or `main`.

---
