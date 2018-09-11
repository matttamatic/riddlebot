Create a generative Mastodon bot using [Riddlewot](https://www.riddlewot.com/). 

This is a version of [Cheap Bots, Done Quick!](http://cheapbotsdonequick.com/) that runs as a single bot. It is based on [v21/tracerybot](http://github.com/v21/tracerybot). 

How to build your own bot:
- Click the settings above and "Remix" this project!
- Modify the [Tracery](http://tracery.io/) grammar in `grammar.json`. Here's a [tutorial](http://www.crystalcodepalace.com/traceryTut.html). The tweet will start from field "origin".
- Create an account on a Mastodon instance. Check out [http://botsin.space](http://botsin.space) which is specifically made for bots and bot allies.
- Add the API url for the Mastodon instance to MASTODON_API in `.env`. This will look something like `https://mastodon.social/api/v1/` or `https://botsin.space/api/v1/`. Make sure this matches the domain you registered on!
- Get your [Mastodon OAuth token](https://tinysubversions.com/notes/mastodon-bot/index.html) and add it to MASTODON_ACCESS_TOKEN in `.env` 
- Modify how frequently it will be allowed to post by settings POST_DELAY_IN_MINUTES in `.env`
- Send a GET or POST request to `{Glitch URL}/toot` (for instance: `https://tracery-mastodon-bot.glitch.me/toot` for the `tracery-mnastodon-bot` project)
- Use a cron or uptime service (like [Uptime Robot](http://uptimerobot.com)) to hit the above URL to trigger the bot regularly

Things should try:
- Create a whole new grammar in `grammar.json` (Check out [Cheap Bots, Done Quick!](http://cheapbotsdonequick.com/) for ideas)
- Instead of using Tracery, find a different way to generate text and use that in `generateStatus()` in `bot.js`
- Rub your tummy while patting your head. You've built a Mastodon bot, you can do anything!

🤖 [Byron Hulcher](http://twitter.com/hypirlink)