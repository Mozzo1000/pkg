This guide outlines the process for creating an account and authenticating with the PKG platform. An account is required to subscribe to specific application version updates.

## Supported Authentication Methods

PKG utilizes a passwordless authentication system to ensure security and ease of access. You can access your account using either a Magic Link sent to your email or through your existing GitHub profile.

---

## Method 1: Magic Link Authentication

The Magic Link method allows you to sign in using only your email address without the need to remember a password.

### Step 1: Access the Notifications Page

Navigate to the **Notifications** section via the main navigation menu or the primary call-to-action on the home page.

### Step 2: Enter Your Email Address

Locate the email input field. Enter your email address where you wish to receive version update alerts.

### Step 3: Send Magic Link

Click the **Send Magic Link** button. The system will process your request and a confirmation toast will appear indicating that the email is on its way.

### Step 4: Check Your Inbox

Open your email client and look for a message from PKG. Click the secure link contained within the email. This link will redirect you back to the PKG platform and automatically log you in.

---

## Method 2: GitHub OAuth Authentication

If you prefer to link your account to your developer profile, you can use GitHub OAuth for a single-click login experience.

### Step 1: Select GitHub Login

On the Notifications login page, click the **Continue with GitHub** button located above the email form.

### Step 2: Authorize PKG

You will be redirected to GitHub's secure authorization portal. If you are not already logged into GitHub, you will be prompted to do so. Review the permissions requested and click **Authorize**.

### Step 3: Redirect and Session Establishment

Once authorized, GitHub will redirect you back to the PKG Account Settings page. Your account will be created automatically using the email address associated with your GitHub profile.

---

## Managing Your Session

Once authenticated, the login form will be replaced by your **Account Settings** dashboard.

### Verifying Active Session

At the top of the Account Settings page, you will see your registered email address. This confirms you are successfully logged in and any changes made to notification preferences will be saved to your unique profile.

### Signing Out

To terminate your session, click the **Sign Out** button located in the top-right corner of the Account Settings header. This will clear your local session and return you to the public view of the platform.

### Troubleshooting

* **Missing Magic Links**: If the email does not arrive within two minutes, check your junk or spam folder. Ensure your organization allows emails from `pkg.rewake.org`.
* **OAuth Errors**: If the GitHub login fails, ensure you have a primary email address verified on your GitHub account, as PKG requires this to route your notifications.