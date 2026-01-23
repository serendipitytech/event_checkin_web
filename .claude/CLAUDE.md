# Project Configuration

**Type:** Custom
**Created:** 2026-01-23
**Path:** .

## MCP Configuration

Disabled MCPs: "vercel"

## Project Guidelines

Add project-specific guidelines here:
- Coding standards
- Tech stack details
- Database schema notes
- Deployment instructions

## Database Configuration

**Schema:** `event_checkin`

Always use schema prefix when referencing tables: `event_checkin.tablename`

**Role Permissions:**
- `anon`: SELECT on tables, EXECUTE on functions
- `authenticated`: SELECT, INSERT, UPDATE, DELETE on tables
- `service_role`: Full access (bypasses RLS)

## Common Commands

- `/plan` - Plan new features
- `/tdd` - Test-driven development
- `/code-review` - Review before commit

## Notes

