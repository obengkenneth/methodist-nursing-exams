# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Using your own Supabase instance

To point the app at your own Supabase project instead of the default Lovable one:

### 1. Create or open your Supabase project

- Go to [supabase.com](https://supabase.com) and sign in.
- Create a new project (or use an existing one). Note your **project ref** (e.g. `abcdefghijklmnop`).

### 2. Get your project URL and anon key

In the Supabase dashboard:

- Open **Project Settings** (gear icon) → **API**.
- Copy:
  - **Project URL** (e.g. `https://abcdefghijklmnop.supabase.co`)
  - **anon public** key (under "Project API keys")

### 3. Set environment variables

In the project root, create or edit `.env` (do not commit real keys to git):

```env
VITE_SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your_anon_public_key_here"
```

Replace with your actual URL and anon key. The app only reads these two; `VITE_SUPABASE_PROJECT_ID` is optional (e.g. for Supabase CLI linking).

### 4. Apply the database schema (migrations)

You need the same tables and RLS policies on your instance. Two options:

**Option A – Supabase CLI (recommended)**

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) if needed:
   ```sh
   npm install -g supabase
   ```
2. Log in and link your project:
   ```sh
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   ```
   Use the project ref from your project URL (e.g. `abcdefghijklmnop`).
3. Run migrations:
   ```sh
   supabase db push
   ```
   This applies everything in `supabase/migrations/` to your linked project.

**Option B – Run SQL manually**

1. In the dashboard, go to **SQL Editor**.
2. Run the contents of each file in `supabase/migrations/` in order (oldest timestamp first):
   - `20260218221216_*.sql` (tables, RLS, triggers)
   - `20260218221924_*.sql` (extra profile policies)
   - `20260218230000_allow_first_admin_user_roles.sql` (allows first user to get admin role from /setup)

### 5. Allow login without email confirmation (recommended)

By default Supabase requires users to confirm their email before they can sign in. For an institutional portal where admins create accounts, you typically want to **disable** this:

1. In the Supabase dashboard go to **Authentication** → **Providers** → **Email**.
2. Turn **off** “Confirm email”.
3. Save.

If you leave “Confirm email” on, users must click the link in the sign-up email before they can log in; otherwise they will see “Invalid credentials” when trying to sign in.

### 6. Create the first admin user

1. Start the app: `npm run dev`.
2. Open **/setup** in the browser.
3. Use setup key: **MUG-NURSING-SETUP-2024** (or change it in `src/pages/SetupPage.tsx`).
4. Enter name, email, and password to create the first admin account.
5. Log in at **/login** with that account.

**Important:** Create the admin via the **/setup** page (or have admins create students via the admin panel). Do not insert users directly into `auth.users` in SQL—passwords must be set through Supabase Auth so they are stored correctly.

**If you already created an admin but see no row in `user_roles`:** RLS was blocking the insert. Run the migration `20260218230000_allow_first_admin_user_roles.sql`, then in Supabase **SQL Editor** run (replace the email with your admin’s email):

```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE email = 'your-admin@example.com' LIMIT 1;
```

After that, you can create students and tests from the admin dashboard. To restrict access to `/setup`, remove or protect that route once the first admin exists.

**Create-student Edge Function (required for creating students):** When an admin creates a student, the app calls the `create-student` Edge Function so your session stays the admin. Deploy it with: `supabase functions deploy create-student`. The function uses `SUPABASE_SERVICE_ROLE_KEY` (set automatically in Supabase) to create the auth user and insert profile and role. If the function is not deployed or returns an error, the form shows the error and you remain logged in.

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
