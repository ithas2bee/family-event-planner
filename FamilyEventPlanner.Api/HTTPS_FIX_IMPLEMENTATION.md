# HTTPS Redirection Fix - Implementation Complete

## ? Changes Applied

### 1. Program.cs - HTTPS Redirection Disabled

**Line 77:** Changed from:
```csharp
app.UseHttpsRedirection();
```

To (commented out):
```csharp
// TEMPORARILY DISABLED FOR EXPO MOBILE DEV
// Expo running on HTTP cannot follow HTTPS redirects properly
// Re-enable for production with proper SSL certificates
// app.UseHttpsRedirection();
```

**Why:** Your React Native Expo app makes HTTP requests. When the server redirects to HTTPS, the mobile app doesn't follow the redirect properly, resulting in "Could not reach the server" error.

---

### 2. GroupMembersController.cs - Temporary Logging Added

Added debug logging to the `JoinGroup()` endpoint:

```csharp
System.Diagnostics.Debug.WriteLine($"[JOIN ENDPOINT] Request received at {DateTime.UtcNow}");
System.Diagnostics.Debug.WriteLine($"[JOIN ENDPOINT] InviteCode: {request?.InviteCode}");
System.Diagnostics.Debug.WriteLine($"[JOIN ENDPOINT] Email: {request?.Email}");
```

**Why:** If the endpoint still doesn't respond, you'll see these messages in Visual Studio's Debug output window, confirming whether requests are reaching the server.

---

## ?? How to Test

### Step 1: Restart the API
```sh
# Stop current running instance (Ctrl+C)
# Or in Visual Studio: Stop Debugging (Shift+F5)

# Rebuild
dotnet build

# Run (F5 or)
dotnet run
```

You should see:
```
Building...
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://0.0.0.0:5249
```

---

### Step 2: Test in Swagger First (Confirm Backend Works)

1. Open: http://10.0.0.115:5249/swagger/index.html
2. Find **POST /api/groupmembers/join**
3. Click **Try it out**
4. Enter test data:
```json
{
  "inviteCode": "ABC123",
  "name": "Test User",
  "email": "test@example.com"
}
```
5. Click **Execute**

**Expected response:** `201 Created` (or `400 Bad Request` if invite code invalid)

If Swagger works but your Expo app doesn't, the problem is in your frontend fetch call or CORS.

---

### Step 3: Update Your Expo Frontend URL

Make sure your fetch call uses **HTTP** (not HTTPS):

```javascript
// ? CORRECT (HTTP)
const response = await fetch('http://10.0.0.115:5249/api/groupmembers/join', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ inviteCode, name, email })
});

// ? WRONG (HTTPS)
// const response = await fetch('https://10.0.0.115:5249/api/groupmembers/join', { ... });
```

---

### Step 4: Watch Debug Output (If Still Issues)

1. In Visual Studio, go to: **Debug** ? **Windows** ? **Output**
2. Make sure "Debug" pane is selected
3. Try the request from your Expo app
4. Look for messages like:
```
[JOIN ENDPOINT] Request received at 2026-04-08 14:30:45.1234567
[JOIN ENDPOINT] InviteCode: ABC123
[JOIN ENDPOINT] Email: test@example.com
[JOIN ENDPOINT] Name: Test User
[JOIN ENDPOINT] Member created successfully: 550e8400-e29b-41d4-a716-446655440001
```

If you see these, the request IS reaching the backend, and the problem is elsewhere (Expo network setup, DNS, firewall, etc.).

---

## ?? Expected Final Behavior

| Request | Before Fix | After Fix |
|---------|-----------|-----------|
| HTTP to /api/groupmembers/join | 302 Redirect to HTTPS (fails in Expo) | 200/201 Success ? |
| Swagger test | Works ? | Works ? |
| Expo app | "Could not reach server" ? | Should work now ? |

---

## ?? Important: Production Checklist

**Before deploying to production, you MUST:**

1. ? **Re-enable HTTPS redirection** in Program.cs:
```csharp
app.UseHttpsRedirection();  // Re-enable
```

2. ? **Remove all Debug.WriteLine() calls** from GroupMembersController.cs

3. ? **Use proper SSL certificates** (Let's Encrypt, Azure, etc.)

4. ? **Update Expo app to use HTTPS** with valid certificate

5. ? **Test thoroughly** before going live

---

## ?? If It Still Doesn't Work

Check these in order:

1. **Firewall:** Is port 5249 open? (Run: `netstat -ab` to check)
2. **Network:** Can you ping 10.0.0.115 from the Expo device?
3. **DNS:** Try IP address instead of hostname (which you already are)
4. **Kestrel:** Is it binding to 0.0.0.0? Check launchSettings.json (it is ?)
5. **CORS:** Should be working (AllowExpo policy allows any origin ?)
6. **Content-Type:** Make sure your fetch includes `'Content-Type': 'application/json'`

---

## ?? Build Status

```
? Build successful
? No compilation errors
? Ready to test
```

---

**Next: Restart the API and test in Swagger, then test from your Expo app. Watch the Debug output window for the logging messages.**
