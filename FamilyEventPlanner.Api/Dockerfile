FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY ["FamilyEventPlanner.Api.csproj", "./"]
RUN dotnet restore "FamilyEventPlanner.Api.csproj"

COPY . .
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
USER $APP_UID

ENTRYPOINT ["dotnet", "FamilyEventPlanner.Api.dll"]
