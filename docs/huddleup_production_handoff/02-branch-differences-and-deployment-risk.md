# Branch Differences and Deployment Risk

## Reported findings

The user reports checking `development`, `staging`, and `main`:

  -----------------------------------------------------------------------
  Area              development       staging           main
  ----------------- ----------------- ----------------- -----------------
  Dockerfile        Newer; builds     Same newer        Older API-only
                    Expo web app into approach          Dockerfile
                    API image                           

  Docker context    Repository root   Repository root   API directory

  Compose project   Same across all   Same              Same
  name              branches                            

  Network name      Same across all   Same              Same
                    branches                            

  Named volume name Same across all   Same              Same
                    branches                            

  API host port     Same across all   Same              Same
                    branches                            
  -----------------------------------------------------------------------

The exact project/network/volume/port values were not supplied. Do not
invent them. These are user-reported results and have not been
independently checked in this documentation pass.

## Why the Dockerfile difference matters

The newer Dockerfile builds: 1. Expo web export. 2. .NET API publish
output.

The final API image includes the Expo web assets so the API can serve
the browser password-reset page. The older API-only Dockerfile on
`main`, as described by the user, does not include that web export.

**Risk:** Building production from `main` as-is may omit the
reset-password page that was verified on development.

## Why the build context matters

The newer Dockerfile needs both `FamilyEventPlanner.Api/` and
`FamilyEventPlanner.Mobile/`, so it requires repository-root build
context. An API-directory context cannot supply sibling mobile files to
Docker `COPY` instructions.

Check both `build.context` and `build.dockerfile` against every `COPY`
path before building.

## Shared Compose names and port

If all environments share one Docker host, identical Compose
project/network/volume names and API host port may cause: - Compose
commands to affect the wrong environment's resources. - Environments to
share a database volume unintentionally. - Host port binding
conflicts. - Accidental use of development data or credentials in
production.

If environments use separate hosts, cross-environment resource
collisions may not apply. Confirm whether they share a host before
changing configuration.

**Do not rename or remove a volume until its current data ownership is
understood.** A new volume name can cause a new empty database to be
created while existing data remains in the old volume.

## Read-only branch inspection

From a repository clone, fetch current refs:

``` bash
git fetch origin
git ls-remote --heads origin development staging main
```

Inspect files:

``` bash
git show origin/development:FamilyEventPlanner.Api/Dockerfile
git show origin/staging:FamilyEventPlanner.Api/Dockerfile
git show origin/main:FamilyEventPlanner.Api/Dockerfile

git show origin/development:FamilyEventPlanner.Api/compose.yaml
git show origin/staging:FamilyEventPlanner.Api/compose.yaml
git show origin/main:FamilyEventPlanner.Api/compose.yaml
```

Compare relevant files:

``` bash
git diff origin/main..origin/development -- FamilyEventPlanner.Api/Dockerfile FamilyEventPlanner.Api/compose.yaml FamilyEventPlanner.Api/Program.cs FamilyEventPlanner.Api/.env.example
git diff origin/main..origin/staging -- FamilyEventPlanner.Api/Dockerfile FamilyEventPlanner.Api/compose.yaml FamilyEventPlanner.Api/Program.cs FamilyEventPlanner.Api/.env.example
```

Record exact Compose project/network/volume/port values for each branch.

## Safe resolution sequence

1.  Confirm production source branch.
2.  Review commits and PRs among branches.
3.  Decide whether web-export and password-reset changes belong in
    production.
4.  Review the full application diff, not just Docker files.
5.  Confirm environment host isolation.
6.  Design production-specific configuration and secrets.
7.  Test production image/Compose configuration in a production-like
    environment.
8.  Obtain explicit approval before deployment.

Do not merge all of `development` blindly just to obtain the newer
Dockerfile.
