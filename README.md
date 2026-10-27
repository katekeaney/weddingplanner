# Wedding Planner

A private planner for the two of you: a checklist by planning phase, budget, vendor tracker and guest list. Both of you see the same plan, protected by a passcode.

## What's in this folder

- `public/index.html` is the website.
- `api/plan.js` saves and loads your plan.

## Put it on Vercel (about 10 minutes)

You need a free Vercel account and Node.js installed on your computer.

1. **Upload the site.** Open a terminal in this folder and run:

   ```
   npx vercel
   ```

   Log in when asked and accept the defaults. When it finishes it prints a link to your new project.

2. **Add a database.** In the Vercel dashboard, open the project, go to **Storage**, and add **Upstash Redis** from the Marketplace (the free plan is plenty). Connect it to this project. Vercel adds the connection settings for you.

3. **Set your passcode.** In the project, go to **Settings → Environment Variables** and add:

   - Name: `PLAN_PASSCODE`
   - Value: a passcode you'll both use

4. **Publish again** so the site picks up the database and passcode:

   ```
   npx vercel --prod
   ```

5. Open the link, enter the passcode, and share the link and passcode with your partner.

The first time you open it, the planner fills in example entries so you can see how it works. Use **Edit details** for your names, date and budget, then **Clear examples** to start your own lists.

## Prefer GitHub?

Push this folder to a GitHub repository, then choose **Add New → Project** in Vercel and import it. Do steps 2 to 4 above, and use **Redeploy** in the dashboard instead of the terminal command.

## Notes

- Changes save as you make them. Your partner's changes show up within about 20 seconds, or right away when the page is reopened.
- To change the passcode, update `PLAN_PASSCODE` in Vercel and redeploy. Each browser will ask for the new one.
- The site asks search engines not to list it, but anyone with the link and passcode can open your plan.
