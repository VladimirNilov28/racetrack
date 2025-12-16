# Contributing

## General rules
- `main` is the stable branch
- Direct commits to `main` are not allowed
- All work must be done in separate branches
- Always update your branch before starting work

```bash
git pull
```

---

## Branches overview
- `main`  
  Stable / production branch

- `dev`  
  Main development branch

- `front`  
  Main frontend branch

- `front-henripork`, `front-priitteng`  
  Personal frontend branches

- `back/vladimirnilov`  
  Personal backend branch

---

## Workflow
1. Switch to your working branch
```bash
git switch <branch-name>
```

2. Update the branch
```bash
git pull
```

3. Make your changes

4. Commit changes
```bash
git add .
git commit -m "Describe your changes"
```

5. Push to remote
```bash
git push
```

6. Open a Pull Request
- frontend changes → `front` or `front` → `dev`
- backend changes → `dev`

---

## Notes
- Do not push directly to `main`
- Keep commits small and meaningful