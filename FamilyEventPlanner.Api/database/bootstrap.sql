IF NOT EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = N'huddleup_app')
BEGIN
	CREATE LOGIN [huddleup_app]
		WITH PASSWORD = N'$(AppDbPassword)',
			 CHECK_POLICY = ON,
			 CHECK_EXPIRATION = OFF;
END;
GO

IF DB_ID(N'FamilyEventPlannerDb') IS NULL
BEGIN
	CREATE DATABASE [FamilyEventPlannerDb];
END;
GO

USE [FamilyEventPlannerDb];
GO

IF USER_ID(N'huddleup_app') IS NULL
BEGIN
	CREATE USER [huddleup_app] FOR LOGIN [huddleup_app];
END;
GO

IF IS_ROLEMEMBER(N'db_owner', N'huddleup_app') <> 1
BEGIN
	ALTER ROLE [db_owner] ADD MEMBER [huddleup_app];
END;
GO
