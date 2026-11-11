FROM node:22-alpine AS web-build
WORKDIR /src/FamilyEventPlanner.Mobile
COPY FamilyEventPlanner.Mobile/package.json FamilyEventPlanner.Mobile/package-lock.json ./
RUN npm ci
COPY FamilyEventPlanner.Mobile/ ./
ARG EXPO_PUBLIC_API_BASE_URL
ENV EXPO_PUBLIC_API_BASE_URL=$EXPO_PUBLIC_API_BASE_URL
RUN npx expo export --platform web --output-dir /app/web-dist

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["FamilyEventPlanner.Api/FamilyEventPlanner.Api.csproj", "FamilyEventPlanner.Api/"]
WORKDIR /src/FamilyEventPlanner.Api
RUN dotnet restore "FamilyEventPlanner.Api.csproj"

COPY FamilyEventPlanner.Api/ .
RUN dotnet publish "FamilyEventPlanner.Api.csproj" --configuration Release --output /app/publish /p:UseAppHost=false --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends curl \
	&& rm -rf /var/lib/apt/lists/*

ENV ASPNETCORE_HTTP_PORTS=8080 \
	DOTNET_RUNNING_IN_CONTAINER=true
EXPOSE 8080

COPY --from=build --chown=$APP_UID:$APP_UID /app/publish .
COPY --from=web-build --chown=$APP_UID:$APP_UID /app/web-dist ./wwwroot
USER $APP_UID

ENTRYPOINT ["dotnet", "FamilyEventPlanner.Api.dll"]
