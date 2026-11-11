# 1. Ubuntu Host and Repository Setup

## 1.1 Host and repository location

The deployment work was performed on an Ubuntu server. The repository
root observed in the terminal was:

``` bash
/home/lencrerot/Development/Sites/HuddleUp
```

The API project is a child directory:

``` text
/home/lencrerot/Development/Sites/HuddleUp/
├── .dockerignore
├── FamilyEventPlanner.Api/
│   ├── .env
│   ├── .env.example
│   ├── Dockerfile
│   ├── compose.yaml
│   └── database/
│       └── bootstrap.sql
└── FamilyEventPlanner.Mobile/
    ├── .env
    ├── app.json
    ├── package.json
    └── package-lock.json
```

The repository root is important: the successful Docker build was run
from the repository root, not from inside `FamilyEventPlanner.Api`.

Confirm location before running deployment commands:

``` bash
cd /home/lencrerot/Development/Sites/HuddleUp
pwd
git rev-parse --show-toplevel
```

Expected repository root:

``` text
/home/lencrerot/Development/Sites/HuddleUp
```

## 1.2 Git branch and pull recorded in this deployment

The server was on branch `development`, tracking `origin/development`. A
successful pull fast-forwarded the local branch from `e2794cf` to
`8a36826`.

The pull command was:

``` bash
git pull --rebase origin development
```

The output reported a fast-forward and included 18 changed files,
including:

-   `.dockerignore`
-   `FamilyEventPlanner.Api/Dockerfile`
-   `FamilyEventPlanner.Api/compose.yaml`
-   `FamilyEventPlanner.Api/Program.cs`
-   API email sender and authentication tests
-   mobile password-recovery tests and `app.json`
-   deployment guide documents

To inspect the current branch and commit on the server:

``` bash
git branch --show-current
git status --short
git log -1 --oneline
git rev-parse HEAD
```

Do not assume the server remains at `8a36826` forever. Record the actual
commit each time a deployment is performed.

## 1.3 Local modifications and backups

The server contained local modifications to deployment configuration and
environment files. These were deliberately preserved during the pull. A
backup directory was created outside the repository:

``` text
~/huddleup-dev-backup/
```

Files copied or moved there during the recovery included:

-   `Dockerfile` snapshots
-   `compose.yaml` snapshots
-   `.dockerignore` snapshot
-   `FamilyEventPlanner.Mobile/.env` snapshot

The exact filenames included `Dockerfile-local`, `Dockerfile-working`,
`compose-local.yaml`, `compose-working.yaml`, `dockerignore-local`, and
`mobile.env.local`.

The local Compose file and mobile `.env` were subsequently restored. The
final observed `git status --short` showed:

``` text
 M FamilyEventPlanner.Api/compose.yaml
 M FamilyEventPlanner.Mobile/.env
?? FamilyEventPlanner.Api/compose.yaml.bak
?? FamilyEventPlanner.Api/compose.yaml.pre-registration-backup
?? "d -n 1,240p compose.yaml"
```

These entries are not necessarily errors. They represent local state
that should be understood before another pull or deployment. In
particular, the oddly named file should be inspected and preserved until
its origin is understood.

Useful commands:

``` bash
git status --short
git diff -- FamilyEventPlanner.Api/compose.yaml
git diff -- FamilyEventPlanner.Api/Dockerfile
```

Do not casually use `git reset --hard`, `git clean -fd`, or broad
restore commands on this server. They can destroy local configuration or
untracked backups.

## 1.4 Safe update principle

Before pulling new code:

1.  Change to the repository root.
2.  Record `git status --short`.
3.  Back up local `.env` files and local deployment configuration
    outside the repository.
4.  Compare local configuration with the incoming branch version.
5.  Preserve required server-specific settings.
6.  Pull the intended branch.
7.  Reconcile configuration deliberately; do not blindly overwrite the
    server's local files.

The development server's configuration is not automatically suitable for
production.
