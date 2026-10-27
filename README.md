# Wedding Planner

A planner for the two of you: a checklist by planning phase, budget, vendor tracker and guest list. Both of you see and edit the same plan.

## What's in this folder

- `public/index.html` is the website.
- `api/plan.js` saves and loads your plan.

## Put it on Vercel

1. **Import the project.** In Vercel, choose **Add New → Project** and import this GitHub repository. Keep the default settings.

2. **Add a database.** Install **Upstash for Redis** from the Vercel Marketplace (vercel.com/marketplace/upstash, free plan) and connect it to this project. Vercel adds the connection settings for you.

3. **Redeploy** from the project's **Deployments** tab so the site picks up the database.

4. Open the link and share it with your partner.

The first time you open it, the planner fills in example entries so you can see how it works. Use **Edit details** for your names, date and budget, then **Clear examples** to start your own lists.

## Notes

- Changes save as you make them. Your partner's changes show up within about 20 seconds, or right away when the page is reopened.
- There's no passcode: anyone who has the link can see and change the plan, so only share it with people you trust. The site asks search engines not to list it.
