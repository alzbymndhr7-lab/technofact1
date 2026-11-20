Git is a system for saving versions of your project and tracking every change. Here are the essential commands:

## Getting started

```bash
git init                 # create a new repository
git clone <url>          # copy an existing repository
```

## Saving

```bash
git status               # what changed?
git add .                # stage all changes
git commit -m "message"  # save a version
```

## Syncing

```bash
git push                 # upload changes
git pull                 # download latest changes
```

## Branches

```bash
git switch -c feature    # create a branch and switch to it
git merge feature        # merge the branch
```

> Golden rule: make small, clear commits after every step.