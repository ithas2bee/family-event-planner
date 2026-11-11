# Production Decisions and Open Questions

The next agent must obtain these answers rather than infer them.

## Hosting and environment

1.  Is production on the same Ubuntu host as development/staging, or a
    separate host?
2.  Are all three environments currently running on that host?
3.  What is the production API domain?
4.  What is the intended production source branch?
5.  Who approves merges and deployment?

## Docker and Compose

6.  What are the exact Compose project names on each branch?
7.  What are the exact network names, volume names, and host ports?
8.  Do the environments share a Docker host?
9.  Does production have its own SQL Server instance and volume?
10. Is there a production-specific Compose file?

**Decision:** If environments share a host, define unique Compose
project/resource names and non-conflicting host ports. Preserve and
identify existing production database volumes before changing names.

## Database

11. Does production already contain real user data?
12. Where does production SQL Server run?
13. How are EF Core migrations applied?
14. Is `database/bootstrap.sql` safe to run against an existing
    database?
15. Are automated backups stored off-host, and has restore been tested?

## Cloudflare and HTTPS

16. Is Cloudflare used for DNS only, proxying, tunnel, or another
    arrangement?
17. Which reverse proxy is installed (Nginx, Caddy, Traefik, Cloudflare
    Tunnel, or other)?
18. What are the development and intended production upstream targets?
19. How are TLS certificates issued and renewed?
20. Which ports are open in host/network firewalls?

## API

21. What production password-reset URL should emails use?
22. Is the production sender domain verified with Resend?
23. Are production Resend and Google Places credentials ready?
24. What are production JWT issuer/audience values?
25. Which CORS origins are allowed?
26. Where are logs retained and who can access them?

## Android and Google Play

27. What is the production Android package ID?
28. Which EAS production profile/environment is intended?
29. Is the production API URL configured in that environment?
30. Is the production Maps key restricted correctly?
31. Are release signing credentials ready?
32. Is the target artifact an AAB?
33. What app version and Android version code will be released?
34. What testing requirements does the current Play Console account
    show?

## Operations

35. What downtime window is acceptable?
36. What is the rollback image/tag?
37. What is the database rollback/restore plan after schema changes?
38. Who monitors the release and handles incidents?

## Minimum answers to begin Phase 1

Establish the production host, domain, SQL Server location/data status,
environment isolation, source branch, and Cloudflare/reverse-proxy
arrangement.
